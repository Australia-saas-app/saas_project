import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  console.log('Bootstrapping Application to seed Superadmin...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const adminRepository = app.get<Repository<Admin>>(getRepositoryToken(Admin));

  const email = 'superadmin@systemdb.com';
  let admin = await adminRepository.findOne({ where: { email } });
  
  const hashedPassword = await bcrypt.hash('Superadmin@123', 10);

  if (admin) {
    console.log(`Admin ${email} already exists. Updating password...`);
    admin.password = 'Superadmin@123';
  } else {
    console.log(`Creating new admin ${email}...`);
    admin = adminRepository.create({
      email,
      password: 'Superadmin@123',
      role: 'super_admin' as any,
      fullName: 'Super Admin',
    });
  }

  await adminRepository.save(admin);
  console.log('Superadmin seeded successfully!');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Error seeding superadmin:', err);
  process.exit(1);
});
