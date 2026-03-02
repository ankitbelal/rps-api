import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ResultService } from './result.service';
import { AddMarksDTO, MarkFetchQueryDto } from './dto/marks.dto';
import { ApiResponse } from 'utils/api-response';
import type { Response } from 'express';
import { CreateGradingSystemDto, TopStudentQueryDto } from './dto/result.dto';

import {
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
  async publishBulk(
    @Body() dto: PublishBulkDto,
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    return await this.resultService.publishBulk(
      {
        ...dto,
        publishedBy: req.user.id,
      },
      res,
    );
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

  @HttpCode(200)
  @Get('top-students')
  async topStudets(@Query() topStudentQueryDto: TopStudentQueryDto) {
    return ApiResponse.successSingleData(
      await this.resultService.topStudentsData(topStudentQueryDto),
      'Student leaderboard fetched.',
      200,
    );
  }

  @HttpCode(200)
  @Get('grading-system')
  async getGradingSystem() {
    return ApiResponse.successData(
      await this.resultService.getGradingSystem(),
      'Grading system fetched successfully',
      200,
    );
  }

  @HttpCode(201)
  @Post('add-grading')
  async addGradingSystem(@Body() dto: CreateGradingSystemDto) {
    await this.resultService.addGradingSystem(dto);
    return ApiResponse.success('Grading system added successfully.', 201);
  }
}
