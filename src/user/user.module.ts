import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MailingModule } from 'src/mailing/mailing.module';
import { AdminService } from './admin/admin.service';
import { AdminController } from './admin/admin.controller';

@Module({
  controllers: [UserController, AdminController],
  providers: [UserService, AdminService],
  imports:[MailingModule],
  exports:[UserService]
})
export class UserModule {}
