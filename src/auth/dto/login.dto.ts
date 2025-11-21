import {
  IsEmail,
  IsNotEmpty,
  IsStrongPassword,
  Matches,
  Validate,
} from 'class-validator';
import { MatchPasswords } from 'utils/validators/password-validator';
export class loginDTO {
  @IsEmail({}, { message: 'invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class PasswordResetDto {
  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Invalid Email Format' })
  email: string;

  @IsNotEmpty({ message: 'Password is required.' })
  @IsStrongPassword()
  password: string;

  @IsNotEmpty({ message: 'Confirm Password is required.' })
  @Validate(MatchPasswords)
  confirmPassword: string;
}

export class VerifyEmailDto {
  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Invalid Email Format' })
  email: string;
}

export class validateOTPDTO {
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;

  @IsNotEmpty({ message: 'OTP is required.' })
  otp: string;
}
