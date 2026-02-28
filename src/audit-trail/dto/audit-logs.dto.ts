import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { LogType } from 'utils/enums/general-enums';

export class AuditLogQueryDto {
  @IsOptional()
  @IsEnum(LogType, { message: 'Type must be valid.' })
  type?: LogType = LogType.MIXED;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  userId?: number;
}
