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
import { ProgramService } from './program.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { ApiResponse } from 'utils/api-response';
import { ProgramQueryDto } from './dto/program-query-dto';

@Controller('programs')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() createProgramDto: CreateProgramDto) {
    const program = await this.programService.create(createProgramDto);
    return ApiResponse.successData(program, 'Program Added Successfully', 201);
  }

  @Get()
  @HttpCode(200)
  findAll(@Query() ProgramQueryDto: ProgramQueryDto) {
    const programs = this.programService.findAll(ProgramQueryDto);
    return ApiResponse.successData(programs, 'Programs Fetched Successfully', 200);
  }

  @Patch(':id')
  @HttpCode(200)
 async update(@Param('id') id: string, @Body() updateProgramDto: UpdateProgramDto) {
    const program= await this.programService.update(+id, updateProgramDto);
    return ApiResponse.successData(program,'Program Updated Successfully',200)
  }

  @Delete(':id')
  @HttpCode(200)
 async remove(@Param('id') id: string) {
   await this.programService.remove(+id);
    return ApiResponse.success('Program Deleted Successfully',200);
  }
}
