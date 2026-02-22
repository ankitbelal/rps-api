import { Controller, Get, HttpCode, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiResponse } from 'utils/api-response';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  @HttpCode(200)
  @Get()
  async getAdminDashboardData() {
    const data = await this.dashboardService.getAdminDashboardData();
    return ApiResponse.successSingleData(
      data,
      'Data fetched successfully.',
      200,
    );
  }

  @HttpCode(200)
  @Get('teacher')
  async getTeacherDashboardData(@Req() req) {
    const data = await this.dashboardService.getTeacherDashboardData(
      req?.user.userId,
    );
    return ApiResponse.successSingleData(
      data,
      'Data fetched successfully',
      200,
    );
  }
}
