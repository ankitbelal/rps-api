import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateSubjectDto {
  @IsNotEmpty({ message: 'Subject Name is required.' })
  name: string;

  @IsNotEmpty({ message: 'Subject Code is required.' })
  code: string;

  @IsNotEmpty({ message: 'Credits is required.' })
  @IsNumber()
  @Type(() => Number)
  credits: number;

  @IsNotEmpty({ message: 'Semester is required.' })
  @IsNumber()
  @Type(() => Number)
  semester: number;

  @IsNotEmpty({ message: 'Type is required.' })
  type: string;

  @IsNotEmpty({ message: 'Program Id is required.' })
  @IsNumber()
  @Type(() => Number)
  programId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  teacherId: number;
}
