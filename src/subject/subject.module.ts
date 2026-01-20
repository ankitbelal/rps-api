import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { EvaluationParametersModule } from 'src/evaluation-parameters/evaluation-parameters.module';

@Module({
  controllers: [SubjectController],
  providers: [SubjectService],
  exports: [SubjectService],
  imports: [EvaluationParametersModule],
})
export class SubjectModule {}
