import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
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
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  programId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  semester: number;

  @IsNotEmpty()
  @IsEnum(ExamTerm)
  examTerm: ExamTerm;
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
  semester: number;

  @IsOptional()
  @IsEnum(ExamTerm)
  examTerm: ExamTerm;
}
