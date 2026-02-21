import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { EvaluationParametersModule } from 'src/evaluation-parameters/evaluation-parameters.module';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [SubjectController],
  providers: [SubjectService],
  exports: [SubjectService],
  imports: [EvaluationParametersModule, UserModule],
})
export class SubjectModule {}
