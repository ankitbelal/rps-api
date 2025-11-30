import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDate,
  MaxDate,
  IsEnum,
} from 'class-validator';
import { Gender } from 'utils/enums/general-enums';

export class CreateTeacherDto {
  @IsNotEmpty({ message: 'First Name is required.' })
  firstName: string;

  @IsNotEmpty({ message: 'Last Name is required.' })
  lastName: string;

  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Invalid email format.' })
  email: string;

  @IsNotEmpty({ message: 'Phone is required.' })
  @IsNumber({}, { message: 'Phone must be number.' })
  @Type(() => Number)
  phone: string;

  @IsNotEmpty({ message: 'DOB is required.' })
  @Type(() => Date)
  @IsDate({ message: 'DOB must be a valid date.' })
  @MaxDate(new Date(), { message: 'DOB cannot be a future date.' })
  DOB: Date;

  @IsNotEmpty({ message: 'Gender is required.' })
  @IsEnum(Gender, { message: 'Gender must be a valid.' })
  gender: Gender;

  @IsNotEmpty({ message: 'Address is required.' })
  address1: string;

  @IsOptional()
  address2: string;
}

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {}

export class TeacherQueryDto {
  @IsOptional()
  @IsNumber()
  id: number;

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
}
