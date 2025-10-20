import { PartialType } from '@nestjs/mapped-types';
import { CreateSubjectDto } from './create-subject.dto';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string | undefined;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  credits?: number | undefined;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  semester?: number | undefined;

  @IsOptional()
  @IsString()
  type?: string | undefined;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  programId?: number | undefined;
}
