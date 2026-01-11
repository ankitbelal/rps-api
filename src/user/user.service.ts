import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { loginDTO, PasswordResetDto } from 'src/auth/dto/login.dto';
import { User } from '../database/entities/user.entity';
import { IsNull, Repository } from 'typeorm';
import { UserActivity } from '../database/entities/user-activity.entity';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserOTP } from 'src/database/entities/user-otps.entity';
import { UserStatus, UserType } from 'utils/enums/general-enums';
import { MailingService } from 'src/mailing/mailing.service';
import { CreatedUser } from 'src/mailing/interfaces/mailing-interface';
import { AdminHeadQueryDto } from './dto/admin-head-query.dto';
import { UserSync } from './interfaces/user-interface';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserOTP)
    private readonly userOTPRepo: Repository<UserOTP>,

    @InjectRepository(UserActivity)
    private readonly activityRepo: Repository<UserActivity>,

    private readonly mailingService: MailingService,
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

  async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (user) return user;
    return null;
  }

  async resetPassword(passwordResetDto: PasswordResetDto): Promise<boolean> {
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
  ): Promise<boolean> {
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
    const latestOTP = await this.findDeviceWiselatestOTP(userId, deviceId);
    if (!latestOTP) {
      throw new BadRequestException(
        'No OTP found for this device. Please request a new one.',
      );
    }

    if (latestOTP.lockOutUntil && latestOTP.lockOutUntil > now) {
      throw new BadRequestException({
        message: 'Too many attempts. Try again later.',
        lockedUntil: latestOTP.lockOutUntil,
      });
    }

    if (latestOTP.expiresAt && latestOTP.expiresAt < now) {
      throw new BadRequestException(
        'OTP has been expired. Please request a new one.',
      );
    }
    const isValid = bcrypt.compareSync(String(otp), latestOTP.otp);

    if (!isValid) {
      latestOTP.attempts += 1;
      if (latestOTP.attempts >= 10) {
        latestOTP.lockOutUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 min lock
      }
      await this.userOTPRepo.save(latestOTP);

      throw new BadRequestException({
        message: 'Invalid OTP. Please try again.',
        remainingAttempts: 10 - latestOTP.attempts,
      });
    }

    latestOTP.verifiedAt = now;
    await this.userOTPRepo.save(latestOTP);

    return true;
  }

  async findDeviceWiselatestOTP(
    userId: number,
    deviceId: string,
    type: string = '',
  ) {
    return await this.userOTPRepo.findOne({
      where: { userId, deviceId, verifiedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async createUser(userSync: UserSync): Promise<User> {
    const exists = await this.userRepo.findOne({
      where: { email: userSync.email },
    });
    if (exists)
      throw new ConflictException(
        `The user with email: ${userSync.email} already exists.`,
      );

    const randomPass = randomBytes(10).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPass, 10);

    const userData: Partial<User> = {
      password: hashedPassword,
      ...userSync,
    };

    const user = this.userRepo.create(userData);
    const createdUser: CreatedUser = {
      email: user.email,
      password: randomPass,
      name: user.name,
      loginUrl: process.env.RPS_URL ?? '',
    };
    this.mailingService.sendUserCreatedEmail(createdUser);
    return await this.userRepo.save(user);
  }

  async getEligibleAdminsHeads(adminHeadQueryDto: AdminHeadQueryDto) {
    const query = this.userRepo.createQueryBuilder('user');

    query.where('user.user_type IN (:...types)', {
      types: [UserType.ADMIN, UserType.TEACHER],
    });

    query.andWhere('user.status IN (:...status)', {
      status: [UserStatus.ACTIVE, UserStatus.PENDING],
    });

    if (adminHeadQueryDto.name) {
      query.andWhere('user.name LIKE :name', {
        name: `%${adminHeadQueryDto.name}%`,
      });
    }

    query.select(['user.id', 'user.name']);

    return await query.getMany();
  }
}
