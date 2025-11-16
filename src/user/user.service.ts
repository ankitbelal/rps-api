import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { loginDTO, PasswordResetDto } from 'src/auth/dto/login.dto';
import { User, UserType, Status } from '../database/entities/user.entity';
import { Repository } from 'typeorm';
import { UserActivity } from '../database/entities/user-activity.entity';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

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
}
