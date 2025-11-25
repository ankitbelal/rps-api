import { Module } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { TeacherController } from './teacher.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [TeacherController],
  providers: [TeacherService],
  imports: [UserModule],
})
export class TeacherModule {}
