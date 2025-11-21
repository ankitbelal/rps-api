import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { loginDTO, PasswordResetDto } from 'src/auth/dto/login.dto';
import { User, UserType, Status } from '../database/entities/user.entity';
import { IsNull, Repository } from 'typeorm';
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
    deviceId: string,
  ): Promise<Boolean> {
    const hashedOTP = await bcrypt.hash(otp, 10);
    const saveOTP = this.userOTPRepo.create({
      userId,
      otp: hashedOTP,
      type,
      expiresAt,
      deviceId,
    });
    await this.userOTPRepo.save(saveOTP);
    return true;
  }

  async validateOTP(
    otp: number,
    userId: number,
    deviceId: string,
  ): Promise<boolean> {
    const now = new Date();

    const otpRecords = await this.userOTPRepo.find({
      where: { userId, deviceId, verifiedAt: IsNull() },
    });

    if (!otpRecords.length) {
      throw new BadRequestException(
        'No OTP found for this device. Please request a new one.',
      );
    }

    const userOTP = otpRecords.find((record) =>
      bcrypt.compareSync(String(otp), record.otp),
    );

    if (!userOTP) {
      for (const record of otpRecords) {
        record.attempts += 1;
        if (record.attempts >= 10) {
          record.lockOutUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 min lock
        }
        await this.userOTPRepo.save(record);
      }

      throw new BadRequestException({
        message: 'Invalid OTP. Please try again.',
        remainingAttempts: 10 - Math.min(...otpRecords.map((r) => r.attempts)),
      });
    }

    if (userOTP.expiresAt && userOTP.expiresAt < now) {
      throw new BadRequestException(
        'OTP has been expired. Please request a new one.',
      );
    }

    if (userOTP.lockOutUntil && userOTP.lockOutUntil > now) {
      throw new BadRequestException({
        message: 'Too many attempts. Try again later.',
        lockedUntil: userOTP.lockOutUntil,
      });
    }
    userOTP.verifiedAt = now;
    await this.userOTPRepo.save(userOTP);

    return true;
  }
}
