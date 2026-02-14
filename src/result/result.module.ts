import { Module } from '@nestjs/common';
import { ResultController } from './result.controller';
import { ResultService } from './result.service';
import { SubjectModule } from 'src/subject/subject.module';
import { StudentModule } from 'src/student/student.module';

@Module({
  controllers: [ResultController],
  providers: [ResultService],
  exports: [ResultService],
  imports: [StudentModule, SubjectModule],
})
export class ResultModule {}
