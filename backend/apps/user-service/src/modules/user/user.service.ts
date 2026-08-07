import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AccountType, User, UserStatus, KycStatus } from '../../entities/user.entity';
import { SubmitKycBodyDto } from './dto/submit-kyc-body.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { FileStorageService, FileUploadResponse } from '../../common/services/file-storage.service';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Injectable()
export class UserService {
  private readonly kycFolderId = 'fdd09f45-1c10-4005-92a6-e5dfc7b0a596';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...sanitizedUser } = user as any;
    return {
      success: true,
      data: sanitizedUser,
    };
  }

  async updateProfile(userId: string, updates: any) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const allowedFields = [
      'fullName',
      'profilePhoto',
      'dateOfBirth',
      'gender',
      'nationality',
      'passportNumber',
      'permanentAddress',
      'governmentId',
      'idDocument',
      'currency',
      'preferences',
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        (user as any)[field] = updates[field];
      }
    }

    if (updates.businessInfo && user.accountType === AccountType.BUSINESS) {
      user.businessInfo = { ...user.businessInfo, ...updates.businessInfo };
    }

    if (updates.agencyInfo && (user.accountType === AccountType.AFFILIATE || (user.accountType as any) === 'agency')) {
      user.agencyInfo = { ...user.agencyInfo, ...updates.agencyInfo };
    }

    await this.userRepository.save(user);

    const { password, ...sanitizedUser } = user as any;
    return {
      success: true,
      message: 'Profile updated successfully',
      data: sanitizedUser,
    };
  }

  async softDeleteProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.CLOSED;
    user.statusHistory = user.statusHistory || [];
    user.statusHistory.push({
      status: UserStatus.CLOSED,
      reason: 'User requested account deletion',
      changedAt: new Date().toISOString(),
    });

    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Profile deleted successfully',
    };
  }

  async getPublicProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const publicFields = {
      userId: user.userId,
      fullName: user.fullName,
      profilePhoto: user.profilePhoto,
      accountType: user.accountType,
      createdAt: user.createdAt,
    };

    if ((user.accountType === AccountType.AFFILIATE || (user.accountType as any) === 'agency') && user.agencyInfo) {
      return {
        success: true,
        data: {
          ...publicFields,
          agencyInfo: {
            agencyName: user.agencyInfo?.agencyName,
            agencyLogo: user.agencyInfo?.agencyLogo,
            descriptionOfServices: user.agencyInfo?.descriptionOfServices,
            ranking: user.agencyInfo?.ranking,
          },
        },
      };
    }

    if (user.accountType === AccountType.BUSINESS && user.businessInfo) {
      return {
        success: true,
        data: {
          ...publicFields,
          businessInfo: {
            businessName: user.businessInfo?.businessName,
            businessLogo: user.businessInfo?.businessLogo,
            descriptionOfServices: user.businessInfo?.descriptionOfServices,
          },
        },
      };
    }

    return {
      success: true,
      data: publicFields,
    };
  }

  async updateProfilePhoto(userId: string, profilePhoto: string) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.profilePhoto = profilePhoto;
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Profile photo updated successfully',
      data: { profilePhoto: user.profilePhoto },
    };
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Password updated successfully',
    };
  }

  async updatePreferences(userId: string, preferences: any) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.preferences = { ...user.preferences, ...preferences };
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Preferences updated successfully',
      data: user.preferences,
    };
  }

  async getKycStatus(userId: string) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: {
        status: user.kycStatus || KycStatus.NONE,
        fullName: user.fullName,
        identityType: user.kycIdentityType,
        submittedAt: user.kycSubmittedAt,
        reviewedAt: user.kycReviewedAt,
        rejectionReason: user.kycRejectionReason,
      },
    };
  }

  async submitKyc(
    userId: string,
    kycDto: SubmitKycBodyDto,
    files: { photo?: UploadedFile[]; governmentId?: UploadedFile[] },
  ) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.fullName = kycDto.fullName;
    user.kycIdentityType = kycDto.identityType;
    user.kycIdentityNumber = kycDto.identityNumber;
    user.kycDateOfBirth = new Date(kycDto.dateOfBirth);
    user.kycNationality = kycDto.nationality;
    user.kycCountry = kycDto.country;
    user.kycCity = kycDto.city;
    user.kycState = kycDto.state;
    user.kycZipCode = kycDto.zipCode;
    user.kycPermanentAddress = kycDto.permanentAddress;
    user.kycStatus = KycStatus.SUBMITTED;
    user.kycSubmittedAt = new Date();

    if (files?.photo?.[0]) {
      const photoResponse = await this.fileStorageService.uploadFile(
        files.photo[0].buffer,
        files.photo[0].originalname,
        this.kycFolderId,
        userId,
      );
      user.kycPhotoUrl = photoResponse.url;
    }

    if (files?.governmentId?.[0]) {
      const governmentIdResponse = await this.fileStorageService.uploadFile(
        files.governmentId[0].buffer,
        files.governmentId[0].originalname,
        this.kycFolderId,
        userId,
      );
      user.kycDocumentUrl = governmentIdResponse.url;
    }

    const savedUser = await this.userRepository.save(user);

    return {
      success: true,
      message: 'KYC submitted successfully',
      data: { status: savedUser.kycStatus },
    };
  }

  async resubmitKyc(
    userId: string,
    kycDto: SubmitKycBodyDto,
    files: { photo?: UploadedFile[]; governmentId?: UploadedFile[] },
  ) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.kycStatus !== KycStatus.REJECTED) {
      throw new UnauthorizedException('KYC not in rejected status');
    }

    if (!files?.photo?.[0] || !files?.governmentId?.[0]) {
      throw new BadRequestException('Photo and government ID files are required');
    }

    const photoFile = files.photo[0];
    const governmentIdFile = files.governmentId[0];

    const [photoResponse, governmentIdResponse] = await Promise.all([
      this.fileStorageService.uploadFile(
        photoFile.buffer,
        photoFile.originalname,
        this.kycFolderId,
        userId,
      ),
      this.fileStorageService.uploadFile(
        governmentIdFile.buffer,
        governmentIdFile.originalname,
        this.kycFolderId,
        userId,
      ),
    ]);

    user.fullName = kycDto.fullName;
    user.kycPhotoUrl = photoResponse.url;
    user.kycIdentityType = kycDto.identityType;
    user.kycIdentityNumber = kycDto.identityNumber;
    user.kycDateOfBirth = new Date(kycDto.dateOfBirth);
    user.kycNationality = kycDto.nationality;
    user.kycDocumentUrl = governmentIdResponse.url;
    user.kycCountry = kycDto.country;
    user.kycCity = kycDto.city;
    user.kycState = kycDto.state;
    user.kycZipCode = kycDto.zipCode;
    user.kycPermanentAddress = kycDto.permanentAddress;
    user.kycStatus = KycStatus.SUBMITTED;
    user.kycSubmittedAt = new Date();
    user.kycRejectionReason = null;

    const savedUser = await this.userRepository.save(user);

    return {
      success: true,
      message: 'KYC resubmitted successfully',
      data: { status: savedUser.kycStatus },
    };
  }

  async getPendingKyc(page: number = 1, limit: number = 10) {
    const [users, total] = await this.userRepository.findAndCount({
      where: { kycStatus: KycStatus.SUBMITTED },
      select: [
        'userId',
        'fullName',
        'email',
        'kycStatus',
        'kycIdentityType',
        'kycSubmittedAt',
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: { kycSubmittedAt: 'DESC' },
    });

    return {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getKycById(userId: string) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

return {
      success: true,
      data: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        kycStatus: user.kycStatus,
        kycPhotoUrl: user.kycPhotoUrl,
        kycIdentityType: user.kycIdentityType,
        kycIdentityNumber: user.kycIdentityNumber,
        kycDateOfBirth: user.kycDateOfBirth,
        kycNationality: user.kycNationality,
        kycDocumentUrl: user.kycDocumentUrl,
        kycCountry: user.kycCountry,
        kycCity: user.kycCity,
        kycState: user.kycState,
        kycZipCode: user.kycZipCode,
        kycPermanentAddress: user.kycPermanentAddress,
        kycSubmittedAt: user.kycSubmittedAt,
        kycReviewedAt: user.kycReviewedAt,
        kycReviewedBy: user.kycReviewedBy,
        kycRejectionReason: user.kycRejectionReason,
      },
    };
  }

  async reviewKyc(userId: string, adminId: string, reviewDto: ReviewKycDto) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.kycStatus !== KycStatus.SUBMITTED) {
      throw new UnauthorizedException('KYC not in submitted status');
    }

    user.kycStatus = reviewDto.status;
    user.kycReviewedAt = new Date();
    user.kycReviewedBy = adminId;

    if (reviewDto.status === KycStatus.REJECTED) {
      user.kycRejectionReason = reviewDto.rejectionReason || 'Rejected by admin';
    }

    await this.userRepository.save(user);

    return {
      success: true,
      message: `KYC ${reviewDto.status} successfully`,
      data: { status: user.kycStatus },
    };
  }
}
