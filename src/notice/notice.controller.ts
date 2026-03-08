import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiResponse } from 'utils/api-response';
import { NoticeService } from './notice.service';
import {
  markAsReadDto,
  NoticeQueryDto,
  SingleNoticeDto,
} from './dto/notice.dto';

@Controller('notice')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @HttpCode(201)
  @Post('single-user')
  async singleNotify(@Body() singleNoticeDto: SingleNoticeDto, @Req() req) {
    await this.noticeService.singleNotify({
      ...singleNoticeDto,
      publisherId: req.user.userId,
    });
    return ApiResponse.success('Notice send successfully.', 201);
  }

  @HttpCode(200)
  @Get()
  async getNoticesForMe(@Query() noticeQueryDto: NoticeQueryDto, @Req() req) {
    return ApiResponse.successData(
      await this.noticeService.getNoticesForMe({
        ...noticeQueryDto,
        userId: req.user.userId,
      }),
      'Notices fetched successully.',
      200,
    );
  }

  @HttpCode(200)
  @Post('mark-as-read')
  async markAsRead(@Body() dto: markAsReadDto, @Req() req) {
    await this.noticeService.markAsRead({
      ...dto,
      userId: req.user.userId,
    });

    return ApiResponse.success('Notice marked as read.', 200);
  }
}
