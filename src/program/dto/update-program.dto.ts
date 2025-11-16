import { PartialType } from '@nestjs/mapped-types';
import { CreateProgramDto } from './create-program.dto';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProgramDto extends PartialType(CreateProgramDto) {
  @IsOptional()
  @IsString()
  name?: string | undefined;

  @IsOptional()
  @IsString()
  code?: string | undefined;

  @IsOptional()
  @IsString()
  @Type(()=>Number)
  faculty_id?: Number | undefined;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalSubjects?: number | undefined;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalSemester?: number | undefined;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalCredits?: number | undefined;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  durationInYears?: number | undefined;
}
