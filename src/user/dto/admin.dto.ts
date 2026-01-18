import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxDate,
} from 'class-validator';
import { Gender, UserStatus } from 'utils/enums/general-enums';

export class AdminHeadQueryDto {
  @IsOptional()
  name: string;
}

export class CreateAdminDto {
  @IsNotEmpty({ message: 'First Name is required.' })
  firstName: string;

  @IsNotEmpty({ message: 'Last Name is required.' })
  lastName: string;

  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Invalid email format.' })
  email: string;

  @IsNotEmpty({ message: 'Phone is required.' })
  phone: string;

  @IsNotEmpty({ message: 'Gender is required.' })
  @IsEnum(Gender, { message: 'Gender must be valid.' })
  gender: Gender;

  @IsNotEmpty({ message: 'Address is required.' })
  address1: string;

  @IsOptional()
  address2: string;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Status must be valid.' })
  status: UserStatus;

  @IsNotEmpty({ message: 'DOB is required.' })
  @Type(() => Date)
  @IsDate({ message: 'DOB must be a valid date.' })
  @MaxDate(new Date(), { message: 'DOB cannot be a future date.' })
  DOB: Date;
}
export class AdminQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  id: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  self: boolean;

  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  phone: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Gender must be a valid.' })
  gender?: Gender;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  search: string;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Status must be valid.' })
  status: UserStatus;
}

export class UpdateAdminDto extends PartialType(CreateAdminDto) {}
