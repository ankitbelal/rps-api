import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { ProgramModule } from 'src/program/program.module';

@Module({
  controllers: [SubjectController],
  providers: [SubjectService],
  exports: [SubjectService],
  imports:[ProgramModule]
})
export class SubjectModule {}
