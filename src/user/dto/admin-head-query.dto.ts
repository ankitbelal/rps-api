import { IsOptional } from 'class-validator';

export class AdminHeadQueryDto {
  @IsOptional()
  name: string;
}
