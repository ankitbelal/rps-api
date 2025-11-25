import { Module } from '@nestjs/common';
import { ProgramService } from './program.service';
import { ProgramController } from './program.controller';
import { FacultyModule } from 'src/faculty/faculty.module';

@Module({
  controllers: [ProgramController],
  providers: [ProgramService],
  imports: [FacultyModule],
})
export class ProgramModule {}
