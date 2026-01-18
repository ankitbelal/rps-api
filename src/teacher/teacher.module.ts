import { Module } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { TeacherController } from './teacher.controller';
import { UserModule } from 'src/user/user.module';
import { SubjectModule } from 'src/subject/subject.module';

@Module({
  controllers: [TeacherController],
  providers: [TeacherService],
  imports: [UserModule, SubjectModule],
  exports: [TeacherService],
})
export class TeacherModule {}
