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
