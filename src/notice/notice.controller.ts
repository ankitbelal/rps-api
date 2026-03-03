import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiResponse } from 'utils/api-response';
import { NoticeService } from './notice.service';
import { SingleNoticeDto } from './dto/notice.dto';

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
}
