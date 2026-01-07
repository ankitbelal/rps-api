import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
export class CreateProgramDto {
  @IsNotEmpty({ message: 'Name is required.' })
  name: string;

  @IsNotEmpty({ message: 'Code is required.' })
  code: string;

  @IsNotEmpty({ message: 'Faculty id is required.' })
  @Type(() => Number)
  facultyId: number;

  @IsNotEmpty({ message: 'Total Subjects is required.' })
  @IsNumber()
  @Type(() => Number)
  totalSubjects: number;

  @IsNotEmpty({ message: 'Total Semester is required.' })
  @IsNumber()
  @Type(() => Number)
  totalSemesters: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalCredits: number;

  @IsNotEmpty({ message: 'Duration in years is required.' })
  @IsNumber()
  @Type(() => Number)
  durationInYears: number;

  @IsNotEmpty({ message: 'HOD is Required.' })
  HOD: string;
}

export class UpdateProgramDto extends PartialType(CreateProgramDto) {}

export class ProgramQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  id: number;

  @IsOptional()
  name?: string;

  @IsOptional()
  @IsNumber()
  faculty_id?: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}

export class SearchProgramsListDto {
  @IsOptional()
  code?: string;
}
