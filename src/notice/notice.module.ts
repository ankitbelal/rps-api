import { Module } from '@nestjs/common';
import { NoticeService } from './notice.service';
import { NoticeController } from './notice.controller';
import { UserModule } from 'src/user/user.module';
import { MailingModule } from 'src/mailing/mailing.module';
import { StudentModule } from 'src/student/student.module';
import { TeacherModule } from 'src/teacher/teacher.module';

@Module({
  providers: [NoticeService],
  controllers: [NoticeController],
  imports: [UserModule, MailingModule, StudentModule, TeacherModule],
})
export class NoticeModule {}
