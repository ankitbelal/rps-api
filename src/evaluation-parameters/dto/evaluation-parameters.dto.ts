import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateEvaluationParamDto {
  @IsNotEmpty({ message: 'Parameter code is required.' })
  parameterCode: string;

  @IsNotEmpty({ message: 'Parameter name is required.' })
  parameterName: string;
}

export class UpdateEvaluationParamDto extends PartialType(
  CreateEvaluationParamDto,
) {}

export class EvaluationParamQueryDto {
  @IsOptional()
  parameterCode?: string;

  @IsOptional()
  parameterName?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}
