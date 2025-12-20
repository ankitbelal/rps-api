import { Controller, Get, HttpCode } from '@nestjs/common';
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
}
