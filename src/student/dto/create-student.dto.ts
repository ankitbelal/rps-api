import {
  IsDataURI,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  MaxDate,
} from 'class-validator';
import { Gender } from '../student.entity';
import { Type } from 'class-transformer';

export class CreateStudentDto {
  @IsNotEmpty({ message: 'firstName is required' })
  firstName: string;

  @IsNotEmpty({ message: 'lastName is required' })
  lastName: string;

  @IsNotEmpty({ message: 'email is required' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'rollNumber is required' })
  @IsNumber({}, { message: 'rollNumber must be number' })
  @Type(() => Number)
  rollNumber: number;

  @IsNotEmpty({ message: 'phone is required' })
  @IsNumber({}, { message: 'phone must be number' })
  @Type(() => Number)
  phone: number;

  @IsNotEmpty({ message: 'enrollmentDate is required' })
  @Type(() => Date)
  @IsDate({ message: 'enrollmentDate must be a valid date' })
  enrollmentDate: Date;

  @IsNotEmpty({ message: 'address is required' })
  address: string;

  @IsNotEmpty({ message: 'registrationNumber is required' })
  registrationNumber: number;

  @IsNotEmpty({ message: 'gender is required' })
  @IsEnum(Gender, { message: 'gender must be a valid' })
  gender: Gender;

  @IsNotEmpty({ message: 'DOB is required' })
  @Type(() => Date)
  @IsDate({ message: 'DOB must be a valid date' })
  @MaxDate(new Date(), { message: 'DOB cannot be a future date' })
  DOB: Date;

  @IsNotEmpty({ message: 'programId is required' })
  @IsNumber({}, { message: 'programId must be a number' })
  @Type(() => Number)
  programId: number;
}
