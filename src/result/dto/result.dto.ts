import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ExamTerm } from 'utils/enums/general-enums';
import { NoOverlappingRanges } from '../validators/grading-system.validators';

export class ResultDto {
  @IsNotEmpty({ message: 'Student Id is required.' })
  @Type(() => Number)
  studentId: number;
}

export class TopStudentQueryDto {
  @IsOptional()
  @Type(() => Number)
  programId?: number;

  @IsOptional()
  examTerm?: ExamTerm = ExamTerm.FINAL;
}

export class CreateGradeRangeDto {
  @IsNotEmpty({ message: 'Minimum GPA is required,' })
  @IsNumber()
  minGPA: number;

  @IsNotEmpty({ message: 'Maximum GPA is required.' })
  @IsNumber()
  maxGPA: number;

  @IsNotEmpty({ message: 'Grade is required.' })
  @IsString()
  @MaxLength(5)
  grade: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateGradingSystemDto {
  @IsNotEmpty({ message: 'Name is required.' })
  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGradeRangeDto)
  @NoOverlappingRanges()
  gradeRanges: CreateGradeRangeDto[];
}

export class UpdateGradingSystemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateGradeRangeDto)
  @IsOptional()
  gradeRanges?: UpdateGradeRangeDto[];
}

export class UpdateGradeRangeDto {
  @IsNumber()
  @IsOptional()
  minGPA?: number;

  @IsNumber()
  @IsOptional()
  maxGPA?: number;

  @IsString()
  @MaxLength(5)
  @IsOptional()
  grade?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
