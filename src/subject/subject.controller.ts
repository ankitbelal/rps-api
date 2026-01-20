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
import {
  SubjectEvaluationMarksQueryDto,
  SubjectListingQueryDto,
  SubjectQueryDto,
} from './dto/subject-query-dto';

@Controller('subject')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() createSubjectDto: CreateSubjectDto) {
    await this.subjectService.create(createSubjectDto);
    return ApiResponse.success('Subject Added Successfully', 201);
  }

  @Get()
  @HttpCode(200)
  async findAll(@Query() SubjectQueryDto: SubjectQueryDto) {
    const subjects = await this.subjectService.findAll(SubjectQueryDto);
    return ApiResponse.successData(
      subjects,
      'Subjects fetched successfully.',
      200,
    );
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    await this.subjectService.update(+id, updateSubjectDto);
    return ApiResponse.success('Subject Updated Successfully', 200);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    await this.subjectService.remove(+id);
    return ApiResponse.success('Subject Deleted Successfully', 200);
  }

  @HttpCode(200)
  @Get('subject-list')
  async getAssignedSubjects(
    @Query() subjectListingQueryDto: SubjectListingQueryDto,
  ) {
    const subjectList = await this.subjectService.getAllSubjectList(
      subjectListingQueryDto,
    );

    return ApiResponse.successData(
      subjectList,
      'Subject list fetched successfully.',
      200,
    );
  }

  @HttpCode(200)
  @Get('students-subject-eval-param')
  async getAllSubjectListWithEvalParams(
    @Query() subjectEvaluationMarksQueryDto: SubjectEvaluationMarksQueryDto,
  ) {
    const subjectDetails =
      await this.subjectService.getAllSubjectListWithEvalParams(
        subjectEvaluationMarksQueryDto,
      );
    return ApiResponse.successData(
      subjectDetails,
      'Student Subjects and evaluation parameters  fetched successfully.',
      200,
    );
  }
}
