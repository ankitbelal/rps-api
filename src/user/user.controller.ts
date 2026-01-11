import { Controller, Get, HttpCode, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiResponse } from 'utils/api-response';
import { AdminHeadQueryDto } from './dto/admin.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @HttpCode(200)
  @Get('admin-head')
  async getAdminandHead(@Query() adminHeadQueryDto: AdminHeadQueryDto) {
    const adminsAndHead =
      await this.userService.getEligibleAdminsHeads(adminHeadQueryDto);
    return ApiResponse.successSingleData(
      adminsAndHead,
      'Eligible admin fetched successfully.',
      200,
    );
  }
}
