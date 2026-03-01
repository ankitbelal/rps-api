import { Module } from '@nestjs/common';
import { ResultController } from './result.controller';
import { ResultService } from './result.service';
import { SubjectModule } from 'src/subject/subject.module';
import { StudentModule } from 'src/student/student.module';
import { UserModule } from 'src/user/user.module';
import { TeacherModule } from 'src/teacher/teacher.module';
import { MailingModule } from 'src/mailing/mailing.module';
import { ProgramModule } from 'src/program/program.module';
import { AuditTrailModule } from 'src/audit-trail/audit-trail.module';

@Module({
  controllers: [ResultController],
  providers: [ResultService],
  exports: [ResultService],
  imports: [
    StudentModule,
    SubjectModule,
    UserModule,
    TeacherModule,
    MailingModule,
    ProgramModule,
    AuditTrailModule,
  ],
})
export class ResultModule {}
