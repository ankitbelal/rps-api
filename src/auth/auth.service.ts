import { Injectable, Res } from '@nestjs/common';
import { loginDTO } from './dto/login.dto';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDTO: loginDTO, request,res) {
    const action = 'login';
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    const platform = request.headers['user-agent'] || 'unknown';
    const user = await this.userService.loginValidateUser(loginDTO);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    await this.userService.logActivity(user, ip, platform, action);
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

        res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'logged in successfully',
      accessToken: accessToken,
      refreshToken: refreshToken,
      userDetails: {
        id: user.id,
        name: user.name,
        email: user.email,
        contact: user.contact,
        UserType: user.userType,
        status: user.status,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
          'defaultAccessSecret',
      });
      const newAccessToken = this.jwtService.sign(
        {
          userId: payload.userId,
          email: payload.email,
          userType: payload.userType,
        },
        {
          secret:
            this.configService.get<string>('ACCESS_TOKEN_SECRET') ||
            'defaultAccessSecret',
          expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        },
      );
      return { accessToken: newAccessToken };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

}
