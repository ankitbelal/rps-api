import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
export class CreateProgramDto {
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsNotEmpty({ message: 'Code is required' })
  code: string;

  @IsNotEmpty({ message: 'Faculty is required' })
  faculty: string;

  @IsNotEmpty({ message: 'Total Subjects is required' })
  @IsNumber()
  @Type(() => Number)
  totalSubjects: number;

  @IsNotEmpty({ message: 'Total Semester is required' })
  @IsNumber()
  @Type(() => Number)
  totalSemester: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalCredits: number;

  @IsNotEmpty({ message: 'Duration in years is required' })
  @IsNumber()
  @Type(() => Number)
  durationInYears: number;
}
