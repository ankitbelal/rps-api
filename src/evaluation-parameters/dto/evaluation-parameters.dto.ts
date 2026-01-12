import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateEvaluationParamDto {
  @IsNotEmpty({ message: 'Parameter code is required.' })
  code: string;

  @IsNotEmpty({ message: 'Parameter name is required.' })
  name: string;
}

export class UpdateEvaluationParamDto extends PartialType(
  CreateEvaluationParamDto,
) {}

export class EvaluationParamQueryDto {
  @IsOptional()
  code?: string;

  @IsOptional()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}

export class ParameterListingQuery {
  @IsOptional()
  search: string;

  @IsOptional()
  subjectId: number;
}
