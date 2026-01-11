import {
  IsDataURI,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  MaxDate,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, StudentStatus } from 'utils/enums/general-enums';
import { Optional } from '@nestjs/common';

export class CreateStudentDto {
  @IsNotEmpty({ message: 'First Name is required.' })
  firstName: string;

  @IsNotEmpty({ message: 'Last Name is required.' })
  lastName: string;

  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Invalid email format.' })
  email: string;

  @IsNotEmpty({ message: 'Roll Number is required.' })
  rollNumber: string;

  @IsNotEmpty({ message: 'Phone is required.' })
  phone: string;

  @IsNotEmpty({ message: 'Enrollment Date is required.' })
  @Type(() => Date)
  @IsDate({ message: 'Enrollment Date must be a valid date.' })
  enrollmentDate: Date;

  @IsNotEmpty({ message: 'Address is required.' })
  address1: string;

  @IsOptional()
  address2: string;

  @IsNotEmpty({ message: 'Registration Number is required.' })
  registrationNumber: string;

  @IsNotEmpty({ message: 'Gender is required.' })
  @IsEnum(Gender, { message: 'Gender must be a valid.' })
  gender: Gender;

  @IsNotEmpty({ message: 'DOB is required.' })
  @Type(() => Date)
  @IsDate({ message: 'DOB must be a valid date.' })
  @MaxDate(new Date(), { message: 'DOB cannot be a future date.' })
  DOB: Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currentSemester: number;

  @IsNotEmpty({ message: 'Program Id is required.' })
  @IsNumber({}, { message: 'Program Id must be a number.' })
  @Type(() => Number)
  programId: number;

  @IsOptional()
  @IsEnum(StudentStatus, { message: 'Student status must be valid.' })
  status?: StudentStatus;

  @IsOptional()
  @IsBoolean()
  createUser?: boolean = false; //by default dont create the user
}

export class StudentQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  id: number;

  @IsOptional()
  programId: string;

  @IsOptional()
  currentSemester?: number;

  @IsOptional()
  @IsEnum(StudentStatus, { message: 'Student status must be valid.' })
  status?: StudentStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  search?: string;
}

export class SearchStudentListDto {
  @IsOptional()
  name?: string;
}
