import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { UserProfile, UserStatus } from './entities/user-profile.entity';
import { UserContact, ContactType } from './entities/user-contact.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyProfileDto } from './dto/verify-profile.dto';
import { AddContactDto } from './dto/add-contact.dto';
import { ChangePrimaryContactDto } from './dto/change-primary-contact.dto';
import { DeleteContactDto } from './dto/delete-contact.dto';
import { ConfirmPasswordDto } from './dto/confirm-password.dto';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);
  private readonly ssoUrl: string;
  private readonly maxContacts = 3;
  private readonly contactOtpType = 'profile-contact';
  private readonly ssoVerifyContactOtpPath = '/sso/auth/verify-otp/generic';
  private readonly ssoVerifyPasswordPath = '/sso/auth/verify-password';
  private readonly profileUpdateCooldownMs: number;

  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(UserContact)
    private readonly contactRepository: Repository<UserContact>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    const ssoPort = this.configService.get('SSO_PORT', 3001);
    this.ssoUrl = this.configService.get(
      'SSO_URL',
      `http://localhost:${ssoPort}`,
    );
    const cooldownDays = Number(
      this.configService.get('PROFILE_UPDATE_COOLDOWN_DAYS', 30),
    );
    const safeCooldownDays =
      Number.isFinite(cooldownDays) && cooldownDays > 0 ? cooldownDays : 30;
    this.profileUpdateCooldownMs = safeCooldownDays * 24 * 60 * 60 * 1000;
  }

  /**
   * Get user profile. If profile doesn't exist, sync data from SSO service and create it.
   * This makes User Profile Service the source of truth for profile data.
   */
  async getProfile(
    userId: string,
    userInfo?: { email?: string; phone?: string },
    authHeader?: string,
  ): Promise<UserProfile> {
    let profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['contacts'],
    });

    if (!profile) {
      // Profile doesn't exist - sync from SSO service on first access
      this.logger.log(
        `Profile not found for user ${userId}, syncing from SSO service`,
      );
      profile = await this.syncProfileFromSso(userId, userInfo, authHeader);
    }

    return profile;
  }

  /**
   * Sync user profile data from SSO service and create profile in User Profile Service.
   * This establishes User Profile Service as the source of truth for profile data.
   */
  private async syncProfileFromSso(
    userId: string,
    userInfo?: { email?: string; phone?: string },
    authHeader?: string,
  ): Promise<UserProfile> {
    // Fetch user data from SSO service using the auth token
    let ssoUserData: any = null;

    if (authHeader) {
      try {
        const response = await fetch(`${this.ssoUrl}/sso/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
        });

        if (response?.ok) {
          const result = await response.json();
          if (result?.success && result?.data) {
            ssoUserData = result.data;
            this.logger.debug(
              `Successfully fetched user data from SSO for ${userId}`,
            );
          }
        } else {
          this.logger.warn(
            `Failed to fetch user data from SSO for ${userId}. Status: ${response?.status}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error fetching user data from SSO for ${userId}: ${error.message}`,
        );
      }
    } else {
      this.logger.warn(
        `No auth header provided for syncing profile from SSO for ${userId}`,
      );
    }

    // Prepare profile data - prioritize SSO data, fallback to token data
    const email = ssoUserData?.email || userInfo?.email;
    const phone = ssoUserData?.phone || userInfo?.phone;
    const fullName = ssoUserData?.fullName;
    const currency = ssoUserData?.currency;

    // Create profile entity
    const profileData: Partial<UserProfile> = {
      userId,
      fullName: fullName || null,
      currency: currency || null,
      status: UserStatus.ACTIVE,
      isVerified: false,
    };

    // Map SSO status to User Profile Service status if needed
    if (ssoUserData?.status) {
      const statusMap: Record<string, UserStatus> = {
        active: UserStatus.ACTIVE,
        suspended: UserStatus.SUSPENDED,
        blocked: UserStatus.BLOCK,
        dormant: UserStatus.DORMANT,
        closed: UserStatus.CLOSED,
      };
      profileData.status =
        statusMap[ssoUserData.status.toLowerCase()] || UserStatus.ACTIVE;
    }

    const profile = this.profileRepository.create(profileData);
    await this.profileRepository.save(profile);

    // Create contacts from SSO data
    await this.syncContactsFromSso(userId, email, phone, ssoUserData);

    // Reload profile with contacts relation
    return await this.profileRepository.findOne({
      where: { userId },
      relations: ['contacts'],
    });
  }

  /**
   * Sync user contacts from SSO service data
   */
  private async syncContactsFromSso(
    userId: string,
    email?: string,
    phone?: string,
    ssoUserData?: any,
  ): Promise<void> {
    const contactsToCreate: Array<{
      value: string;
      type: ContactType;
      isPrimary: boolean;
      isVerified: boolean;
      order: number;
    }> = [];

    // Add email contact
    if (email) {
      const existingEmail = await this.contactRepository.findOne({
        where: { userId, value: email, type: ContactType.EMAIL },
      });

      if (!existingEmail) {
        contactsToCreate.push({
          value: email,
          type: ContactType.EMAIL,
          isPrimary: true, // Email is primary by default
          isVerified: ssoUserData?.emailVerified || false,
          order: 0,
        });
      }
    }

    // Add phone contact
    if (phone) {
      const existingPhone = await this.contactRepository.findOne({
        where: { userId, value: phone, type: ContactType.PHONE },
      });

      if (!existingPhone) {
        // If we have email, phone is secondary, otherwise primary
        const hasEmail = !!email;
        contactsToCreate.push({
          value: phone,
          type: ContactType.PHONE,
          isPrimary: !hasEmail,
          isVerified: ssoUserData?.phoneVerified || false,
          order: hasEmail ? 1 : 0,
        });
      }
    }

    // Create all contacts
    for (const contactData of contactsToCreate) {
      const contact = this.contactRepository.create({
        userId,
        ...contactData,
      });
      await this.contactRepository.save(contact);
      this.logger.debug(
        `Created ${contactData.type} contact for user ${userId}`,
      );
    }
  }

  async updateProfile(
    userId: string,
    updateDto: UpdateProfileDto,
  ): Promise<UserProfile> {
    const profile = await this.getProfile(userId);

    this.ensureProfileStatusAllowsUpdates(profile);
    this.enforceProfileUpdateCooldown(profile);

    const { dateOfBirth, ...rest } = updateDto;
    const updatedPayload: Partial<UserProfile> = { ...rest };

    if (profile.isVerified) {
      Object.keys(updatedPayload).forEach((key) => {
        if (key !== 'profilePhoto' && key !== 'currency' && key !== 'country' && key !== 'state' && key !== 'city' && key !== 'zipCode' && key !== 'permanentAddress') {
          delete updatedPayload[key];
        }
      });
      if (updatedPayload.fullName !== undefined) {
        delete updatedPayload.fullName;
      }
    }

    if (dateOfBirth) {
      updatedPayload.dateOfBirth = new Date(dateOfBirth);
    }

    Object.assign(profile, updatedPayload);
    profile.lastProfileUpdateAt = new Date();
    await this.profileRepository.save(profile);

    this.logger.debug(`Profile updated for user ${userId}`);
    return this.getProfile(userId);
  }

  async verifyProfile(
    userId: string,
    verifyDto: VerifyProfileDto,
  ): Promise<UserProfile> {
    const profile = await this.getProfile(userId);

    if (profile.isVerified) {
      throw new BadRequestException('Profile is already verified');
    }

    if (profile.status !== UserStatus.SUSPENDED) {
      throw new BadRequestException(
        'Profile verification is only required for suspended accounts',
      );
    }

    Object.assign(profile, {
      ...verifyDto,
      dateOfBirth: new Date(verifyDto.dateOfBirth),
      isVerified: true,
      status: UserStatus.ACTIVE,
      lastProfileUpdateAt: new Date(),
    });

    await this.profileRepository.save(profile);

    this.logger.debug(`Profile verified for user ${userId}`);
    return this.getProfile(userId);
  }

  async addContact(
    userId: string,
    addContactDto: AddContactDto,
  ): Promise<UserContact> {
    const profile = await this.getProfile(userId);
    this.ensureProfileStatusAllowsUpdates(profile);

    // Check contact limit
    const existingContacts = await this.contactRepository.count({
      where: { userId },
    });

    if (existingContacts >= this.maxContacts) {
      throw new BadRequestException(
        `Maximum ${this.maxContacts} contacts allowed`,
      );
    }

    // Validate email or phone format
    if (addContactDto.type === ContactType.EMAIL) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(addContactDto.value)) {
        throw new BadRequestException('Invalid email format');
      }
    } else if (addContactDto.type === ContactType.PHONE) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(addContactDto.value)) {
        throw new BadRequestException('Invalid phone format');
      }
    }

    // Check if contact already exists
    const existing = await this.contactRepository.findOne({
      where: {
        userId,
        value: addContactDto.value,
        type: addContactDto.type,
      },
    });

    if (existing) {
      throw new ConflictException('Contact already exists');
    }

    await this.verifyContactOtp(
      userId,
      addContactDto.value,
      addContactDto.type,
      addContactDto.otp,
    );

    const isPrimary = existingContacts === 0;
    const contact = this.contactRepository.create({
      userId,
      value: addContactDto.value,
      type: addContactDto.type,
      isPrimary,
      isVerified: true, // Set to true after OTP verification
      order: existingContacts,
    });

    await this.contactRepository.save(contact);

    this.logger.debug(`Contact added for user ${userId}`);
    return contact;
  }

  async changePrimaryContact(
    userId: string,
    changeDto: ChangePrimaryContactDto,
  ): Promise<UserContact[]> {
    const profile = await this.getProfile(userId);
    this.ensureProfileStatusAllowsUpdates(profile);
    const contact = await this.contactRepository.findOne({
      where: { id: changeDto.contactId, userId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Use transaction to update all contacts
    await this.dataSource.transaction(async (manager) => {
      // Remove primary from all contacts
      await manager.update(
        UserContact,
        { userId, isPrimary: true },
        { isPrimary: false, order: 1 },
      );

      // Set new primary
      await manager.update(
        UserContact,
        { id: changeDto.contactId },
        { isPrimary: true, order: 0 },
      );
    });

    this.logger.debug(`Primary contact changed for user ${userId}`);
    return this.contactRepository.find({ where: { userId } });
  }

  async deleteContact(
    userId: string,
    contactId: string,
    deleteDto: DeleteContactDto,
  ): Promise<void> {
    const profile = await this.getProfile(userId);
    this.ensureProfileStatusAllowsUpdates(profile);
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, userId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (contact.isPrimary) {
      throw new BadRequestException('Cannot delete primary contact');
    }

    await this.verifyUserPassword(userId, deleteDto.password);

    await this.contactRepository.remove(contact);

    this.logger.debug(`Contact deleted for user ${userId}`);
  }

  async updateProfilePhoto(
    userId: string,
    photoUrl: string,
  ): Promise<UserProfile> {
    const profile = await this.getProfile(userId);
    this.ensureProfileStatusAllowsUpdates(profile);
    this.enforceProfileUpdateCooldown(profile);
    profile.profilePhoto = photoUrl;
    profile.lastProfileUpdateAt = new Date();
    await this.profileRepository.save(profile);

    this.logger.debug(`Profile photo updated for user ${userId}`);
    return this.getProfile(userId);
  }

  async getContacts(userId: string): Promise<UserContact[]> {
    return this.contactRepository.find({
      where: { userId },
      order: { order: 'ASC' },
    });
  }

  private ensureProfileStatusAllowsUpdates(profile: UserProfile): void {
    const disallowedStatuses = [
      UserStatus.BLOCK,
      UserStatus.SUSPENDED,
      UserStatus.DORMANT,
      UserStatus.CLOSED,
    ];

    if (!disallowedStatuses.includes(profile.status)) {
      return;
    }

    if (profile.status === UserStatus.SUSPENDED) {
      throw new BadRequestException(
        'Account is suspended. Complete identity verification before updating your profile.',
      );
    }

    throw new BadRequestException(
      'Profile updates are disabled while your account is inactive.',
    );
  }

  private enforceProfileUpdateCooldown(profile: UserProfile): void {
    if (!profile.lastProfileUpdateAt) {
      return;
    }

    const now = Date.now();
    const lastUpdateTime = profile.lastProfileUpdateAt.getTime();
    const elapsed = now - lastUpdateTime;

    if (elapsed >= this.profileUpdateCooldownMs) {
      return;
    }

    const remainingMs = this.profileUpdateCooldownMs - elapsed;
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    throw new BadRequestException(
      `Profile can be updated again in ${remainingDays} day(s).`,
    );
  }

  private async verifyContactOtp(
    userId: string,
    value: string,
    type: ContactType,
    otp: string,
  ): Promise<void> {
    const payload: Record<string, string> = {
      otp,
      type: this.contactOtpType,
    };

    if (type === ContactType.EMAIL) {
      payload.email = value;
    } else {
      payload.phone = value;
    }

    try {
      await this.postToSso(this.ssoVerifyContactOtpPath, payload);
    } catch (error) {
      this.logger.warn(
        `OTP verification failed for user ${userId}: ${error?.message}`,
      );
      throw new BadRequestException('Invalid or expired OTP');
    }
  }

  private async verifyUserPassword(
    userId: string,
    password: string,
  ): Promise<void> {
    try {
      await this.postToSso(this.ssoVerifyPasswordPath, {
        userId,
        password,
      });
    } catch (error) {
      this.logger.warn(
        `Password verification failed for user ${userId}: ${error?.message}`,
      );
      throw new BadRequestException('Invalid password');
    }
  }

  private async postToSso<T = any>(
    path: string,
    body: Record<string, any>,
  ): Promise<T> {
    const response = await fetch(`${this.ssoUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (error) {
      this.logger.warn(
        `Failed to parse SSO response for ${path}: ${error.message}`,
      );
    }

    if (!response.ok) {
      const message =
        payload?.message || payload?.error || 'SSO request failed';
      throw new BadRequestException(message);
    }

    return payload as T;
  }

  async confirmPassword(userId: string, dto: ConfirmPasswordDto): Promise<{ success: boolean }> {
    await this.verifyUserPassword(userId, dto.password);
    return { success: true };
  }

  async verifyContact(
    userId: string,
    value: string,
    type: ContactType,
    otp: string,
  ): Promise<void> {
    await this.verifyContactOtp(userId, value, type, otp);

    const existing = await this.contactRepository.findOne({
      where: { userId, value, type },
    });

    if (existing) {
      existing.isVerified = true;
      await this.contactRepository.save(existing);
    }
  }
  async checkProjectKycRequirement(projectId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.configService.get('TECHNOLOGY_URL', 'http://localhost:3003')}/technology/projects/${projectId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch project ${projectId}: ${response.status}`);
        return false;
      }

      const result = await response.json();
      const project = result.data || result;

      if (!project || !project.price) {
        return false;
      }

      const contractPrice = project.contractPrice || 0;
      const projectValue = project.price;

      if (projectValue <= 0) {
        return false;
      }

      const unpaidPercentage = ((projectValue - contractPrice) / projectValue) * 100;
      const kycRequired = unpaidPercentage > 60;

      this.logger.debug(
        `Project ${projectId}: value=${projectValue}, contract=${contractPrice}, unpaid=${unpaidPercentage}%, KYC required=${kycRequired}`,
      );

      return kycRequired;
    } catch (error) {
      this.logger.error(`Error checking KYC requirement for project ${projectId}: ${error.message}`);
      return false;
    }
  }
}
