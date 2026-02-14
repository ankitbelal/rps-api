import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ResultService } from './result.service';
import { AddMarksDTO, MarkFetchQueryDto } from './dto/marks.dto';
import { ApiResponse } from 'utils/api-response';
import { ResultDto } from './dto/result.dto';

@Controller('result')
export class ResultController {
  public constructor(private readonly resultService: ResultService) {}

  @HttpCode(200)
  @Get('student-marks')
  async studentMarks(@Query() markFetchQueryDto: MarkFetchQueryDto) {
    return ApiResponse.successData(
      await this.resultService.getMarks(markFetchQueryDto),
      'Student marks fetched successfully.',
      200,
    );
  }

  @HttpCode(201)
  @Post('add-marks')
  async addMarks(@Body() addMarksDto: AddMarksDTO) {
    await this.resultService.addMarks(addMarksDto);
    return ApiResponse.success('Marks updated successfully.', 201);
  }

  @HttpCode(200)
  @Get('finalized-result')
  async getFinalizedResult(@Query() resultDto: ResultDto) {
    return ApiResponse.successData(
      await this.resultService.getFinalizedResult(resultDto),
      'Result data fetched successfully.',
      200,
    );
  }
}
