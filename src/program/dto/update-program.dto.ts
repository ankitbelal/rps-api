import { PartialType } from '@nestjs/mapped-types';
import { CreateProgramDto } from './create-program.dto';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProgramDto extends PartialType(CreateProgramDto) {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  faculty: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalSubjects: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalSemester: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalCredits: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  durationInYears: number;
}
