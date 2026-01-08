import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { FacultyService } from './faculty.service';
import { ApiResponse } from 'utils/api-response';
import {
  CreateFacultyDto,
  UpdateFacultyDto,
  FacultyQueryDto,
  SearchFacultyListDto,
} from './dto/faculty-dto';

@Controller('faculties')
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  @HttpCode(201)
  @Post()
  async create(@Body() createFacultyDto: CreateFacultyDto) {
    await this.facultyService.create(createFacultyDto);
    return ApiResponse.success('Faculties registered successfully.', 201);
  }

  @HttpCode(200)
  @Get()
  async findAll(@Query() facultyQueryDto: FacultyQueryDto) {
    const faculties = await this.facultyService.findAll(facultyQueryDto);
    return ApiResponse.successData(
      faculties,
      'Faculty fetched successfully.',
      200,
    );
  }

  @HttpCode(200)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateFacultyDto: UpdateFacultyDto,
  ) {
    await this.facultyService.update(+id, updateFacultyDto);
    return ApiResponse.success('Faculty updated successfully.', 200);
  }

  @HttpCode(200)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.facultyService.remove(+id);
    return ApiResponse.success('Faculty deleted successfully.', 200);
  }

  @Get('faculty-list')
  @HttpCode(200)
  async getAllProgramssList(
    @Query() searchFacultyListDto: SearchFacultyListDto,
  ) {
    const programList =
      await this.facultyService.getAllFacultyList(searchFacultyListDto);
    return ApiResponse.successData(
      programList,
      'Faculty list fetched successfully.',
      200,
    );
  }
}
