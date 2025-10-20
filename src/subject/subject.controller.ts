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
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { ApiResponse } from 'utils/api-response';
import { SubjectQueryDto } from './dto/subject-query-dto';

@Controller('subject')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() createSubjectDto: CreateSubjectDto) {
    const subject = await this.subjectService.create(createSubjectDto);
    return ApiResponse.successData(subject, 'Subject Added Successfully', 201);
  }

  @Get()
  @HttpCode(200)
  async findAll(@Query() SubjectQueryDto:SubjectQueryDto) {
    return this.subjectService.findAll(SubjectQueryDto);
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    const subject = await this.subjectService.update(+id, updateSubjectDto);
    return ApiResponse.successData(subject,'Subject Updated Successfully',200);

  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    await this.subjectService.remove(+id);
    return ApiResponse.success('Subject Deleted Successfully',200);
  }
}
