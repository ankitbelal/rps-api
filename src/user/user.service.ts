import { Inject, Injectable, Ip } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { loginDTO } from 'src/auth/dto/login.dto';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { UserActivity } from './user-activity.entity';
import * as bcrypt from 'bcrypt';

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
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    } else {
      return null;
    }
  }

  async logActivity(user, ip, platform, action) {
    const activity = await this.activityRepo.create({
      user,
      ipAddress: ip,
      platform,
      action: action,
    });
    await this.activityRepo.save(activity);
  }
}
