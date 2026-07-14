import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  fullName: string;

  @IsNotEmpty({ message: 'Contact is required' })
  @IsString()
  contact: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/, {
    message: 'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
  })
  password: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  recoveryKey?: string;
}

export class LoginDto {
  @IsNotEmpty({ message: 'Contact is required' })
  @IsString()
  contact: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class ChangePasswordDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsNotEmpty({ message: 'Old password is required' })
  @IsString()
  oldPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/, {
    message: 'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
  })
  newPassword: string;
}

export class VerifyContactDto {
  @IsNotEmpty({ message: 'Contact is required' })
  @IsString()
  contact: string;

  @IsNotEmpty({ message: 'Role is required' })
  @IsString()
  role: string;
}

export class VerifyRecoveryKeyDto {
  @IsNotEmpty({ message: 'Recovery Key is required' })
  @IsString()
  recoveryKey: string;

  @IsNotEmpty({ message: 'Role is required' })
  @IsString()
  role: string;
}

export class ForgotPasswordResetDto {
  @IsNotEmpty({ message: 'Identifier (contact or key) is required' })
  @IsString()
  identifier: string; // can be email, phone, or recoveryKey

  @IsNotEmpty({ message: 'Role is required' })
  @IsString()
  role: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/, {
    message: 'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
  })
  newPassword: string;
}
