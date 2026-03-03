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
  Req,
} from '@nestjs/common';
import type { Response } from 'express';

import { StudentService } from './student.service';
import {
  CreateStudentDto,
  PromoteStudentDto,
  StudentQueryDto,
  StudentStatsDto,
} from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ApiResponse } from 'utils/api-response';

@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() createStudentDto: CreateStudentDto, @Req() req) {
    await this.studentService.create({
      ...createStudentDto,
      loggedInUserId: req.user.userId, //logging action who perform when
    });
    return ApiResponse.success('Student created successfully', 200);
  }

  @Get()
  @HttpCode(200)
  async findAll(@Query() studentQueryDto: StudentQueryDto, @Req() req) {
    const students = await this.studentService.findAll({
      ...studentQueryDto,
      userId: req.user.userId,
    });
    return ApiResponse.successData(
      students,
      'Students fetched succcessfully.',
      200,
    );
  }

  @Get('report')
  async downloadReport(
    @Query() studentQueryDto: StudentQueryDto,
    @Res() res: Response,
  ) {
    return await this.studentService.generateExcelReport(studentQueryDto, res);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    await this.studentService.update(+id, updateStudentDto);
    return ApiResponse.success('Student updated successfully.', 200);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    await this.studentService.remove(+id);
    return ApiResponse.success('Student removed successfully.', 200);
  }

  @Patch('restore/:id')
  @HttpCode(200)
  async restore(@Param('id') id: string) {
    await this.studentService.restoreDeletedStudent(+id);
    return ApiResponse.success('Student restored successfully.', 200);
  }

  @Post('promote-students')
  @HttpCode(200)
  async promoteStudents(
    @Body() promoteStudentDto: PromoteStudentDto,
    @Req() req,
  ) {
    await this.studentService.promoteStudent({
      ...promoteStudentDto,
      userId: req.user.userId,
    });
    return ApiResponse.success('Student promoted successfully.', 200);
  }

  @HttpCode(200)
  @Get('student-report')
  async threeYearsStudentData(@Query() studentStatsDto: StudentStatsDto) {
    return ApiResponse.successData(
      await this.studentService.StudentStats(studentStatsDto),
      'Student report fetched successfully.',
      200,
    );
  }
}
