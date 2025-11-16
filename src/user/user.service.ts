import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { loginDTO, VerifyEmailDto } from 'src/auth/dto/login.dto';
import { User } from '../database/entities/user.entity';
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

  async logActivity(userId, ip, platform, action) {
    const activity = await this.activityRepo.create({
      userId,
      ipAddress: ip,
      platform,
      action: action,
    });
    await this.activityRepo.save(activity);
  }

  async createUser(name, email, contact, userType, status) {
    const password = randomBytes(10);
    const user = await this.userRepo.create({
      email,
      password: password.toString(),
      name,
      contact,
      userType,
      status,
    });

    await this.userRepo.save(user);
  }

  async findUserByEmail(email) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (user) return user;
    return null;
  }
}
