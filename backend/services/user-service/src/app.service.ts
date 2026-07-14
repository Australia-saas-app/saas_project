import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // Seed Superadmin
    const email = 'superadmin@systemdb.com';
    const existing = await this.userRepository.findOne({ where: { email } });
    if (!existing) {
      const superadmin = this.userRepository.create({
        fullName: 'Super Admin',
        email,
        passwordHash: 'Superadmin@123',
        role: 'super-admin',
      });
      await this.userRepository.save(superadmin);
      console.log('Superadmin seeded successfully');
    }
  }

  async registerUser(data: any): Promise<User> {
    const isEmail = data.contact.includes('@');
    
    // Check for duplicate account
    const existingUser = await this.userRepository.findOne({
      where: isEmail ? { email: data.contact } : { phone: data.contact }
    });

    if (existingUser) {
      throw new Error('Email or phone number already exists');
    }

    // Create new user with defaults managed by TypeORM decorators
    const newUser = this.userRepository.create({
      fullName: data.fullName,
      email: isEmail ? data.contact : null,
      phone: !isEmail ? data.contact : null,
      passwordHash: data.password, // Raw for dev simplicity
      role: data.role || 'user',
      businessName: data.role === 'business' ? data.fullName : null, // Assuming fullName as businessName if not provided separately
    });
    
    return await this.userRepository.save(newUser);
  }

  async getAllUsersByRole(role?: string): Promise<User[]> {
    if (role) {
      return await this.userRepository.find({
        where: { role },
        order: { createdAt: 'DESC' }
      });
    }
    return await this.userRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async getStats(): Promise<any> {
    const qb = this.userRepository.createQueryBuilder('user');
    qb.select('user.role', 'role')
      .addSelect('user.status', 'status')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.role != :superadmin', { superadmin: 'super-admin' })
      .groupBy('user.role')
      .addGroupBy('user.status');
    
    const rawData = await qb.getRawMany();
    
    // Structure the data to be easily consumed by the frontend
    const stats: Record<string, Record<string, number>> = {
      user: { total: 0 },
      affiliate: { total: 0 },
      business: { total: 0 }
    };

    for (const row of rawData) {
      const role = row.role;
      const status = row.status.toUpperCase();
      const count = parseInt(row.count, 10);

      if (!stats[role]) stats[role] = { total: 0 };
      
      stats[role][status] = count;
      stats[role].total += count;
    }

    return stats;
  }

  async loginUser(data: any): Promise<{ user: User, token: string }> {
    const isEmail = data.contact.includes('@');
    const user = await this.userRepository.findOne({
      where: isEmail 
        ? { email: data.contact, role: data.role }
        : { phone: data.contact, role: data.role }
    });

    if (!user) throw new Error('User not found');
    if (user.passwordHash !== data.password) throw new Error('Invalid credentials');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    return { user, token };
  }

  async updateUserStatus(id: string, status: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new Error('User not found');
    
    user.status = status;
    return await this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.userRepository.softDelete({ id });
    return (result.affected ?? 0) > 0;
  }

  async changePassword(data: any): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { email: data.email } });
    if (!user) throw new Error('User not found');
    
    if (user.passwordHash !== data.oldPassword) {
      throw new Error('Incorrect old password');
    }

    // Validation regex: minimum 8 chars, 1 uppercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
    if (!passwordRegex.test(data.newPassword)) {
      throw new Error('Password does not meet requirements');
    }

    user.passwordHash = data.newPassword;
    await this.userRepository.save(user);
    return true;
  }
  async verifyEmail(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { email } });
    return !!user;
  }

  async forgotPasswordReset(data: any): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { email: data.email } });
    if (!user) throw new Error('User not found');

    // Validation regex: minimum 8 chars, 1 uppercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
    if (!passwordRegex.test(data.newPassword)) {
      throw new Error('Password does not meet requirements');
    }

    user.passwordHash = data.newPassword;
    await this.userRepository.save(user);
    return true;
  }
}
