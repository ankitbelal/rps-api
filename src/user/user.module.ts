import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MailingModule } from 'src/mailing/mailing.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports:[MailingModule],
  exports:[UserService]
})
export class UserModule {}
