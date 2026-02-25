import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UserPasswordChange {
  @IsNotEmpty({ message: 'Password is required.' })
  @IsString()
  password: string;

  @IsNotEmpty({ message: 'Current password is required.' })
  @IsString()
  currentPassword: string;

  @IsNotEmpty({
    message: 'Passwords does not not match with confirm password.',
  })
  @IsString()
  confirmPassword: string;

  @IsOptional({ message: 'Email is required.' })
  email: string;

  @IsOptional()
  @Type(() => Number)
  userId?: number;
}
