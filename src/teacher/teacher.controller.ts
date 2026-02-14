import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { TeacherService } from './teacher.service';
import {
  AssignSubjectDto,
  CreateTeacherDto,
  SearchTeacherListDto,
  TeacherQueryDto,
  UpdateTeacherDto,
} from './dto/teacher.dto';
import { ApiResponse } from 'utils/api-response';
import { Public } from 'src/auth/jwt/public.decorator';

@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @HttpCode(201)
  @Post()
  async create(@Body() createTeacherDto: CreateTeacherDto) {
    await this.teacherService.create(createTeacherDto);
    return ApiResponse.success('Teacher registered successfully.', 201);
  }

  @Get()
  @HttpCode(200)
  async findAll(@Query() teacherQueryDto: TeacherQueryDto) {
    const teachers = await this.teacherService.findAll(teacherQueryDto);
    return ApiResponse.successData(
      teachers,
      'Teachers fetched successfully.',
      200,
    );
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
  ) {
    await this.teacherService.update(+id, updateTeacherDto);
    return ApiResponse.success('Teacher updated successfully.', 200);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    await this.teacherService.remove(+id);
    return ApiResponse.success('Teacher removed successfully.', 200);
  }

  @HttpCode(200)
  @Get('teacher-list')
  async getAllTeachersList(
    @Query() searchTeacherListDto: SearchTeacherListDto,
  ) {
    const teachersList =
      await this.teacherService.getAllTeachersList(searchTeacherListDto);
    return ApiResponse.successData(
      teachersList,
      'Teacher list fetched successfully.',
      200,
    );
  }

  @HttpCode(201)
  @Post('assign-subject')
  async assignSubjects(@Body() assignSubjectDto: AssignSubjectDto) {
    await this.teacherService.assignSubjects(assignSubjectDto);
    return ApiResponse.success('Subject assigned successfully.', 201);
  }

  @Get('report')
  async downloadReport(
    @Query() teacherQueryDto: TeacherQueryDto,
    @Res() res: Response,
  ) {
    return await this.teacherService.generateExcelReport(teacherQueryDto, res);
  }
}
