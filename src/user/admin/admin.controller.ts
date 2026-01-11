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
import { AdminService } from './admin.service';
import {
  AdminQueryDto,
  CreateAdminDto,
  UpdateAdminDto,
} from '../dto/admin.dto';
import { ApiResponse } from 'utils/api-response';

@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @HttpCode(201)
  @Post()
  async create(@Body() createAdminDto: CreateAdminDto) {
    await this.adminService.create(createAdminDto);
    return ApiResponse.success('Admin registered successfully.', 201);
  }

  @Get()
  @HttpCode(200)
  async findAll(@Query() adminQueryDto: AdminQueryDto) {
    const admins = await this.adminService.findAll(adminQueryDto);
    return ApiResponse.successData(admins, 'Admins fetched successfully.', 200);
  }

  @Patch(':id')
  @HttpCode(200)
  async update(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    await this.adminService.update(+id, updateAdminDto);
    return ApiResponse.success('Admin updated successfully.', 200);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    await this.adminService.remove(+id);
    return ApiResponse.success('Admin removed successfully.', 200);
  }
}
