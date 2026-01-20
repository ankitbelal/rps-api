import { Controller, Get, HttpCode, Query } from '@nestjs/common';
import { ResultService } from './result.service';
import { MarkFetchQueryDto } from './dto/marks.dto';
import { ApiResponse } from 'utils/api-response';

@Controller('result')
export class ResultController {
  public constructor(private readonly resultService: ResultService) {}

  @Get('student-marks')
  @HttpCode(200)
  async studentMarks(@Query() markFetchQueryDto: MarkFetchQueryDto) {
    return ApiResponse.successData(
      await this.resultService.getMarks(markFetchQueryDto),
      'Student marks fetched successfully.',
      200,
    );
  }
}
