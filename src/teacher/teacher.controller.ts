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
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import {
  CreateTeacherDto,
  SearchTeacherListDto,
  TeacherQueryDto,
  UpdateTeacherDto,
} from './dto/teacher.dto';
import { ApiResponse } from 'utils/api-response';

@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @HttpCode(201)
  @Post()
  async create(@Body() createTeacherDto: CreateTeacherDto) {
    const teacher = await this.teacherService.create(createTeacherDto);
    return ApiResponse.successData(
      teacher,
      'Teacher registered successfully.',
      201,
    );
  }
  @HttpCode(200)
  @Get()
  async findAll(@Query() teacherQueryDto: TeacherQueryDto) {
    const teachers = await this.teacherService.findAll(teacherQueryDto);
    return ApiResponse.successData(
      teachers,
      'Teachers fetched successfully.',
      200,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeacherDto: UpdateTeacherDto) {
    return this.teacherService.update(+id, updateTeacherDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teacherService.remove(+id);
  }

  @HttpCode(200)
  @Get('teacher-list')
  async getAllTeachersList(@Body() searchTeacherListDto: SearchTeacherListDto) {
    const teachersList =
      await this.teacherService.getAllTeachersList(searchTeacherListDto);
    return ApiResponse.successData(
      teachersList,
      'Teacher list fetched successfully.',
      200,
    );
  }
}
