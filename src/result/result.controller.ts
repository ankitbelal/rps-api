import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ResultService } from './result.service';
import { AddMarksDTO, MarkFetchQueryDto } from './dto/marks.dto';
import { ApiResponse } from 'utils/api-response';
import {
  FinalizeBulkDto,
  FinalizeSingleDto,
  GetPublishedResultDto,
  PublishBulkDto,
  PublishSingleDto,
} from './dto/result-publish.dto';

@Controller('result')
export class ResultController {
  public constructor(private readonly resultService: ResultService) {}

  @HttpCode(200)
  @Get('student-marks')
  async studentMarks(
    @Query() markFetchQueryDto: MarkFetchQueryDto,
    @Req() req,
  ) {
    return ApiResponse.successData(
      await this.resultService.getMarks({
        ...markFetchQueryDto,
        userId: req.user.userId,
      }),
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

  @HttpCode(201)
  @Post('single-publish')
  async publishSingle(@Body() dto: PublishSingleDto, @Req() req) {
    await this.resultService.publishSingle(
      dto.studentId,
      dto.semester,
      dto.examTerm,
      req.user.userId, // ← publishedBy from JWT
    );
    return ApiResponse.success('Result published successfully.', 201);
  }

  @HttpCode(201)
  @Post('bulk-publish')
  async publishBulk(@Body() dto: PublishBulkDto, @Req() req) {
    await this.resultService.publishBulk(
      dto.programId,
      dto.semester,
      dto.examTerm,
      req.user.userId,
    );
    return ApiResponse.success('Bulk publish completed.', 201);
  }

  @HttpCode(201)
  @Post('finalize-single')
  async finalizeSingle(@Body() dto: FinalizeSingleDto, @Req() req) {
    await this.resultService.finalizeSingle(
      dto.studentId,
      dto.semester,
      req.user.userId,
    );
    return ApiResponse.success('Result finalized successfully.', 201);
  }

  @HttpCode(201)
  @Post('finalize-bulk')
  async finalizeBulk(@Body() dto: FinalizeBulkDto, @Req() req) {
    await this.resultService.finalizeBulk(
      dto.programId,
      dto.semester,
      req.user.userId,
    );
    return ApiResponse.success('Bulk finalize completed.', 201);
  }

  @HttpCode(200)
  @Get('get-published-result')
  async getPublishedResult(@Query() dto: GetPublishedResultDto) {
    return ApiResponse.successSingleData(
      await this.resultService.getPublishedResult(
        dto.studentId,
        dto.examTerm,
        dto.semester,
      ),
      'Published result fetched successfully.',
      200,
    );
  }
}
