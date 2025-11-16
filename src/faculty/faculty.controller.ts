import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateFacultyDto } from './dto/create-faculty-dto';
import { FacultyService } from './faculty.service';
import { ApiResponse } from 'utils/api-response';
import { UpdateFacultyDto } from './dto/update-faculty-dto';
import { FacultyQueryDto } from './dto/faculty-query-dto';

@Controller('faculties')
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  @HttpCode(201)
  @Post()
  async create(@Body() createFacultyDto: CreateFacultyDto) {
    const faculties = await this.facultyService.create(createFacultyDto);
    return ApiResponse.successData(faculties, 'Faculties registered successfully.', 201);
  }

  @HttpCode(200)
  @Get()
  async findAll(@Query() facultyQueryDto:FacultyQueryDto){
  const faculties=await this.facultyService.findAll(facultyQueryDto);
  return ApiResponse.successData(faculties,'Faculty fetched successfully.',200);
  }


  @HttpCode(200)
  @Patch(':id')
  async update(@Param('id') id:string, @Body() updateFacultyDto:UpdateFacultyDto){
  const faculty=await this.facultyService.update(+id,updateFacultyDto);
  return ApiResponse.successData(faculty,'Faculty updated successfully.',200);
  }

  @HttpCode(200)
  @Delete(':id')
  async remove(@Param('id') id:string){
    await this.facultyService.remove(+id);
    return ApiResponse.success('Faculty deleted successfully.',200);
  }
}
