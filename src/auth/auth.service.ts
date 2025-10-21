import { Injectable, Res } from '@nestjs/common';
import { loginDTO } from './dto/login.dto';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDTO: loginDTO, request, res:Response) {
    const action = 'login';
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    const platform = request.headers['user-agent'] || 'unknown';
    const user = await this.userService.loginValidateUser(loginDTO);
    if (!user) throw new UnauthorizedException('Invalid credentials');
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
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
        'defaultRefreshSecret',
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    console.log(isProd);
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const responseBody: any = {
      statusCode: 200,
      status: 'success',
      message: 'logged in successfully',
      userDetails: {
        id: user.id,
        name: user.name,
        email: user.email,
        contact: user.contact,
        UserType: user.userType,
        status: user.status,
      },
    };
    if (!isProd) {
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
        secure: true,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      return { message: 'Access token refreshed successfully' };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(request, res) {
    const action = 'logout';
    const user = request.user;
    const ip = request.clientIp;
    const platform = request.platform;
    await this.userService.logActivity(user.userId, ip, platform, action);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return {
      statusCode: 200,
      status: 'success',
      message: 'Logged out successfully',
    };
  }
}
