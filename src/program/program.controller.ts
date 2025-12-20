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
import {
  CreateProgramDto,
  ProgramQueryDto,
  SearchProgramsListDto,
  UpdateProgramDto,
} from './dto/program.dto';

import { ApiResponse } from 'utils/api-response';

@Controller('programs')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() createProgramDto: CreateProgramDto) {
    await this.programService.create(createProgramDto);
    return ApiResponse.success('Program added successfully.', 201);
  }

  @Get()
  @HttpCode(200)
  async findAll(@Query() ProgramQueryDto: ProgramQueryDto) {
    const programs = await this.programService.findAll(ProgramQueryDto);
    return ApiResponse.successData(
      programs,
      'Programs fetched successfully.',
      200,
    );
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @Param('id') id: string,
    @Body() updateProgramDto: UpdateProgramDto,
  ) {
    await this.programService.update(+id, updateProgramDto);
    return ApiResponse.success('Program updated successfully.', 200);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    await this.programService.remove(+id);
    return ApiResponse.success('Program deleted successfully.', 200);
  }

  @Get('program-list')
  @HttpCode(200)
  async getAllProgramssList(
    @Query() searchProgramsListDto: SearchProgramsListDto,
  ) {
    const programList = await this.programService.getAllProgramssList(
      searchProgramsListDto,
    );
    return ApiResponse.successData(
      programList,
      'Program list fetched successfully.',
      200,
    );
  }
}
