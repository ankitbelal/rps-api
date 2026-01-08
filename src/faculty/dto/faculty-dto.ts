import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFacultyDto {
  @IsNotEmpty({ message: 'Faculty Name is required' })
  name: string;

  @IsOptional()
  description: string;
}

export class UpdateFacultyDto extends PartialType(CreateFacultyDto) {}

export class FacultyQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}

export class SearchFacultyListDto {
  @IsOptional()
  name?: string;
}