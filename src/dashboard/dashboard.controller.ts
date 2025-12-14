import { Controller, Get, HttpCode } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  @HttpCode(200)
  @Get()
  async getDashboardData() {
    return await this.dashboardService.getDashboardData();
  }
}
