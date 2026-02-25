import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { UserModule } from 'src/user/user.module';
import { SubjectModule } from 'src/subject/subject.module';
import { ProgramModule } from 'src/program/program.module';
import { AuditTrailModule } from 'src/audit-trail/audit-trail.module';

@Module({
  imports: [UserModule, SubjectModule, ProgramModule, AuditTrailModule],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
