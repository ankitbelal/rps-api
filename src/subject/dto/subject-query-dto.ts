import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class SubjectQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  id: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  semester?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  programId?: number;

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

  @IsOptional()
  @Type(() => Number)
  userId?: number;
}

export class SubjectListingQueryDto {
  @IsOptional()
  teacherId: number;

  @IsOptional()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  semester?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  assignmentType?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  programId?: number;
}

export class SubjectEvaluationMarksQueryDto extends SubjectListingQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  studentId?: number;

  @IsOptional()
  examTerm?: string;

  @IsOptional()
  @Type(() => Number)
  userId?: number;
}
