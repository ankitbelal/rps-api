import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { loginDTO, PasswordResetDto } from 'src/auth/dto/login.dto';
import { User, UserType, Status } from '../database/entities/user.entity';
import { Repository } from 'typeorm';
import { UserActivity } from '../database/entities/user-activity.entity';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserOTP } from 'src/database/entities/user-otps.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserOTP)
    private readonly userOTPRepo: Repository<UserOTP>,

    @InjectRepository(UserActivity)
    private readonly activityRepo: Repository<UserActivity>,
  ) {}
  async loginValidateUser(loginDTO: loginDTO) {
    const { email, password } = loginDTO;
    const user = await this.userRepo.findOne({ where: { email } });
    if (
      user &&
      (await bcrypt.compare(password, user.password)) &&
      user.status == 'A'
    ) {
      return user;
    } else {
      return null;
    }
  }

  async logActivity(
    userId: number,
    ip: string,
    platform: string,
    action: string,
  ) {
    const activity = await this.activityRepo.create({
      userId,
      ipAddress: ip,
      platform,
      action: action,
    });
    await this.activityRepo.save(activity);
  }

  async createUser(
    name: string,
    email: string,
    contact: string,
    userType: UserType,
    status: Status,
  ): Promise<User> {
    const password = randomBytes(10);
    const user = await this.userRepo.create({
      email,
      password: password.toString(),
      name,
      contact,
      userType,
      status,
    });

    return await this.userRepo.save(user);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (user) return user;
    return null;
  }

  async resetPassword(passwordResetDto: PasswordResetDto): Promise<Boolean> {
    const user = await this.findUserByEmail(passwordResetDto.email);
    if (!user)
      throw new NotFoundException('User with this email does not exists');
    const hashedPassword = await bcrypt.hash(passwordResetDto.password, 10);
    user.password = hashedPassword;
    await this.userRepo.save(user);
    return true;
  }

  async storeOTP(
    userId: number,
    otp: string,
    type: string,
    expiresAt: Date,
  ): Promise<Boolean> {
    const hashedOTP = await bcrypt.hash(otp, 10);
    const saveOTP = this.userOTPRepo.create({
      userId,
      otp: hashedOTP,
      type,
      expiresAt,
    });
    await this.userOTPRepo.save(saveOTP);
    return true;
  }

  async validateOTP(otp: string, userId: number): Promise<Boolean> {
    const userOTP = await this.userOTPRepo.findOne({ where: { userId } });

    if (!userOTP) {
      throw new BadRequestException({
        message: 'Something went wrong. Please try again.',
      });
    }
    const now = new Date();

    if (userOTP.lockOutUntil && new Date(userOTP.lockOutUntil) > now) {
      throw new BadRequestException({
        message: 'Too many attempts. Please try again later.',
        lockedUntil: userOTP.lockOutUntil,
      });
    }
    const isMatch = await bcrypt.compare(otp, userOTP.otp);

    if (isMatch) {
      await this.userOTPRepo.remove(userOTP);
      return true;
    } else {
      userOTP.attempts += 1;
      if (userOTP.attempts >= 10) {
        const lockoutMinutes = 15;
        userOTP.lockOutUntil = new Date(
          now.getTime() + lockoutMinutes * 60 * 1000,
        );
        await this.userOTPRepo.save(userOTP);

        throw new BadRequestException({
          message: 'Too many invalid attempts. Try again later.',
          lockedUntil: userOTP.lockOutUntil,
        });
      }

      await this.userOTPRepo.save(userOTP);

      throw new BadRequestException({
        message: 'Invalid OTP',
        remainingAttempts: 10 - userOTP.attempts,
      });
    }
  }
}
