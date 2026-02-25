import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiResponse } from 'utils/api-response';
import { AdminHeadQueryDto } from './dto/admin.dto';
import { UserPasswordChange } from './dto/user.dto';

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

  @HttpCode(200)
  @Post('change-password')
  async changePassword(
    @Body() UserPasswordChange: UserPasswordChange,
    @Req() req,
  ) {
    await this.userService.changePassword({
      ...UserPasswordChange,
      userId: req.user.userId,
    });
    return ApiResponse.success('Password changed successfully.', 200);
  }
}
