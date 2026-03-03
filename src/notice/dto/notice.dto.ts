import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { NoticeUserType } from 'utils/enums/general-enums';

export class SingleNoticeDto {
  @IsNotEmpty({ message: 'Subject is required.' })
  subject: string;

  @IsNotEmpty({ message: 'Descriptioin is required.' })
  description: string;

  @IsNotEmpty({ message: 'Receipent user type is required' })
  @IsEnum({
    enum: NoticeUserType,
    message: 'Receipent user type must e  valid.',
  })
  recipientType: NoticeUserType;

  @IsNotEmpty({ message: 'Receipent is required.' })
  recipientId: number;

  @IsOptional()
  publisherType?: NoticeUserType;

  @IsOptional()
  publisherId?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'DOB must be a valid date.' })
  expiredAt?: Date;

  @IsOptional()
  @Type(() => Boolean)
  sendEmail: boolean;
}
