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

import { StudentService } from './student.service';
import { CreateStudentDto, StudentQueryDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ApiResponse } from 'utils/api-response';

@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() createStudentDto: CreateStudentDto) {
    await this.studentService.create(createStudentDto);
    return ApiResponse.success('Student created successfully', 200);
  }

  @Get()
  @HttpCode(200)
  async findAll(@Query() studentQueryDto: StudentQueryDto) {
    const students = await this.studentService.findAll(studentQueryDto);
    return ApiResponse.successData(
      students,
      'Students fetched succcessfully.',
      200,
    );
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
}
