import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { loginDTO, PasswordResetDto, VerifyEmailDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { Public } from './jwt/public.decorator';
import type { Request, Response } from 'express';
import { ApiResponse } from 'utils/api-response';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() loginDTO: loginDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return await this.authService.login(loginDTO, req, res);
  }

  @Post('refresh-token')
  @HttpCode(200)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    return await this.authService.refreshToken(refreshToken, res);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return await this.authService.logout(req, res);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.authService.verifyResetEmail(verifyEmailDto);
    return ApiResponse.success('OTP has been sent to your email.', 200);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() passwordResetDto: PasswordResetDto) {
    await this.authService.resetPassword(passwordResetDto);
    return ApiResponse.success('Password reset successfully.', 200);
  }
}
