import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { EvaluationParametersModule } from 'src/evaluation-parameters/evaluation-parameters.module';
import { ResultModule } from 'src/result/result.module';

@Module({
  controllers: [SubjectController],
  providers: [SubjectService],
  exports: [SubjectService],
  imports: [EvaluationParametersModule, ResultModule],
})
export class SubjectModule {}
