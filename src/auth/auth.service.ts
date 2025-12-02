import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  loginDTO,
  PasswordResetDto,
  validateOTPDTO,
  VerifyEmailDto,
} from './dto/login.dto';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { generateRandomNumbers } from 'utils/general-utils';
import { MailingService } from 'src/mailing/mailing.service';
import { v4 as uuidv4 } from 'uuid';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

@Injectable()
export class AuthService {
  isProd: boolean = false;
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messaageCenterService: MailingService,
  ) {
    this.isProd = this.configService.get<string>('NODE_ENV') === 'production';
  }

  async login(loginDTO: loginDTO, request, res: Response) {
    const action = 'login';
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    const platform = request.headers['user-agent'] || 'unknown';
    const user = await this.userService.loginValidateUser(loginDTO);
    if (!user) throw new UnauthorizedException('Invalid credentials.');
    await this.userService.logActivity(user.id, ip, platform, action);
    const payload = {
      userId: user.id,
      email: user.email,
      userType: user.userType,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('ACCESS_TOKEN_SECRET') ||
        'defaultAccessSecret',
      expiresIn: this.isProd ? ACCESS_TOKEN_EXPIRES_IN : '10000y',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
        'defaultRefreshSecret',
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const responseBody: any = {
      statusCode: 200,
      status: 'success',
      message: 'Logged in successfully.',
      userDetails: {
        id: user.id,
        name: user.name,
        email: user.email,
        contact: user.contact,
        UserType: user.userType,
        status: user.status,
      },
    };
    if (!this.isProd) {
      responseBody.accessToken = accessToken;
      responseBody.refreshToken = refreshToken;
    }

    return responseBody;
  }

  async refreshToken(refreshToken: string, res: Response) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });

      const newAccessToken = this.jwtService.sign(
        { userId: payload.userId, email: payload.email },
        {
          secret: this.configService.get('ACCESS_TOKEN_SECRET'),
          expiresIn: '15m',
        },
      );

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: this.isProd,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      return { message: 'Access token refreshed successfully' };
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  async logout(request, res) {
    const action = 'logout';
    const user = request.user;
    const ip = request.clientIp;
    const platform = request.platform;
    await this.userService.logActivity(user.userId, ip, platform, action);
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: this.isProd,
      sameSite: this.isProd ? 'none' : 'lax',
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.isProd,
      sameSite: this.isProd ? 'none' : 'lax',
    });
    return {
      statusCode: 200,
      status: 'success',
      message: 'Logged out successfully.',
    };
  }

  async verifyResetEmail(
    verifyEmailDto: VerifyEmailDto,
    req: Request,
    res: Response,
  ) {
    const user = await this.userService.findUserByEmail(verifyEmailDto.email);
    if (user?.status == 'P')
      throw new NotFoundException(
        'User with this email is not activated yet. Contact Admin to Activate your Account',
      );
    if (user?.status == 'D')
      throw new NotFoundException(
        'User with this email is Deactivated. Contact Admin to Activate your Account',
      );

    if (!user)
      throw new NotFoundException('User with this email does not exists.');

    const deviceId = req.cookies['device_id'] ?? uuidv4();
    const type: string = 'reset-password';
    const now = new Date();
    const latestOTP = await this.userService.findDeviceWiselatestOTP(
      user.id,
      deviceId,
      type,
    );

    if (latestOTP && latestOTP.lockOutUntil > now)
      throw new BadRequestException({
        message: 'Too many attempts. Try again later.',
        lockedUntil: latestOTP.lockOutUntil,
      });

    const otp = await generateRandomNumbers(6);
    const message = `your confirmation code is ${otp}. if you didn't request this emai, you can safely ignore it.`;
    const subject = 'Reset Password';
    const otpSent = await this.messaageCenterService.sendEmail(
      verifyEmailDto.email,
      subject,
      message,
    );

    const expiresAt: Date = new Date(Date.now() + 10 * 60 * 1000); //5 minute expiry
    if (otpSent) {
      res.cookie('device_id', deviceId, {
        httpOnly: true,
        secure: this.isProd,
        sameSite: 'strict',
      });
      return await this.userService.storeOTP(
        user.id,
        otp,
        type,
        expiresAt,
        deviceId,
      );
    } else
      throw new InternalServerErrorException(
        'Failed to send OTP. Please try again',
      );
  }

  async validateOTP(
    validateOTPDTO: validateOTPDTO,
    req: Request,
    res: Response,
  ) {
    const deviceId = req.cookies['device_id'];
    const user = await this.userService.findUserByEmail(validateOTPDTO.email);
    if (!user)
      throw new NotFoundException('User with this email does not exists.');
    const validOTP = await this.userService.validateOTP(
      validateOTPDTO.otp,
      user.id,
      deviceId,
    );
    if (validOTP)
      res.cookie('otp_verified', true, {
        httpOnly: true,
        secure: this.isProd,
        sameSite: 'strict',
      });
    return validOTP;
  }

  async resetPassword(
    passwordResetDto: PasswordResetDto,
    req: Request,
    res: Response,
  ) {
    const otpVerified = await req.cookies['otp_verified'];
    if (!otpVerified || otpVerified !== 'true') {
      throw new UnauthorizedException('OTP verification required.');
    }
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
    });
    res.clearCookie('otp_verified', {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
    });
    return await this.userService.resetPassword(passwordResetDto);
  }
}
