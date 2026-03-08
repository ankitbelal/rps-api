import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { ExamTerm } from 'utils/enums/general-enums';
export class PublishSingleDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  studentId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  semester: number;

  @IsNotEmpty()
  @IsEnum(ExamTerm)
  examTerm: ExamTerm;
}

export class PublishBulkDto {
  @IsNotEmpty({ message: 'Program is required.' })
  @IsNumber()
  @Type(() => Number)
  programId: number;

  @IsNotEmpty({ message: 'Semester must be specified.' })
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  semesters: number[];

  @IsNotEmpty({ message: 'Exam term is required.' })
  @IsEnum(ExamTerm)
  examTerm: ExamTerm;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  withReport?: boolean;

  @IsOptional()
  @IsNumber()
  publishedBy?: number;
}

export class PublishBulkReporDto {
  @IsNotEmpty({ message: 'Program is required.' })
  @IsNumber()
  @Type(() => Number)
  programId: number;

  @IsNotEmpty({ message: 'Semester must be specified.' })
  @IsArray()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => parseInt(v, 10));
    }
    if (typeof value === 'string') {
      return value.split(',').map((v) => parseInt(v.trim(), 10));
    }
    return [];
  })
  semesters: number[];

  @IsNotEmpty({ message: 'Exam term is required.' })
  @IsEnum(ExamTerm)
  examTerm: ExamTerm;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  withReport?: boolean;

  @IsOptional()
  @IsNumber()
  publishedBy?: number;
}

export class FinalizeSingleDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  studentId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  semester: number;
}

export class FinalizeBulkDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  programId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  semester: number;
}

export class GetPublishedResultDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  studentId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  semester?: number;

  @IsOptional()
  @IsEnum(ExamTerm)
  @Transform(({ value }) => (value === '' ? undefined : value))
  examTerm?: ExamTerm;
}

export class GradeSheetQueryDto {
  @IsNotEmpty({ message: 'Student id is required.' })
  @IsNumber()
  @Type(() => Number)
  studentId: number;

  @IsNotEmpty({ message: 'Semester is required.' })
  @IsNumber()
  @Type(() => Number)
  semester?: number;

  @IsNotEmpty({ message: 'Exam term is required.' })
  @IsEnum(ExamTerm)
  @Transform(({ value }) => (value === '' ? undefined : value))
  examTerm?: ExamTerm;
}
