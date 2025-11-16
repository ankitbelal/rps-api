import {
  IsDataURI,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  MaxDate,
} from 'class-validator';
import { Gender } from '../../database/entities/student.entity';
import { Type } from 'class-transformer';

export class CreateStudentDto {
  @IsNotEmpty({ message: 'First Name is required' })
  firstName: string;

  @IsNotEmpty({ message: 'Last Name is required' })
  lastName: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'Roll Number is required' })
  @IsNumber({}, { message: 'Roll Number must be number' })
  @Type(() => Number)
  rollNumber: number;

  @IsNotEmpty({ message: 'Phone is required' })
  @IsNumber({}, { message: 'Phone must be number' })
  @Type(() => Number)
  phone: number;

  @IsNotEmpty({ message: 'Enrollment Date is required' })
  @Type(() => Date)
  @IsDate({ message: 'Enrollment Date must be a valid date' })
  enrollmentDate: Date;

  @IsNotEmpty({ message: 'Address is required' })
  address: string;

  @IsNotEmpty({ message: 'Registration Number is required' })
  registrationNumber: number;

  @IsNotEmpty({ message: 'Gender is required' })
  @IsEnum(Gender, { message: 'Gender must be a valid' })
  gender: Gender;

  @IsNotEmpty({ message: 'DOB is required' })
  @Type(() => Date)
  @IsDate({ message: 'DOB must be a valid date' })
  @MaxDate(new Date(), { message: 'DOB cannot be a future date' })
  DOB: Date;

  @IsNotEmpty({ message: 'Program Id is required' })
  @IsNumber({}, { message: 'Program Id must be a number' })
  @Type(() => Number)
  programId: number;
}
