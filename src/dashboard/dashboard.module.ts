import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { StudentModule } from 'src/student/student.module';
import { TeacherModule } from 'src/teacher/teacher.module';
import { UserModule } from 'src/user/user.module';
import { ProgramModule } from 'src/program/program.module';
import { FacultyModule } from 'src/faculty/faculty.module';
import { SubjectModule } from 'src/subject/subject.module';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
  imports: [
    StudentModule,
    TeacherModule,
    UserModule,
    ProgramModule,
    FacultyModule,
    SubjectModule,
  ],
})
export class DashboardModule {}
