import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UserPasswordChange {
  @IsNotEmpty({ message: 'Password to change.' })
  @IsString()
  password: string;

  @IsNotEmpty({ message: 'Passwords do not match' })
  @IsString()
  confirmPassword: string;

  @IsOptional()
  email?: string;

  @IsOptional()
  @Type(() => Number)
  userId?: number;
}
