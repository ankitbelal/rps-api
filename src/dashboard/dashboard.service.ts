import { Injectable } from '@nestjs/common';
import { FacultyService } from 'src/faculty/faculty.service';
import { ProgramService } from 'src/program/program.service';
import { StudentService } from 'src/student/student.service';
import { SubjectService } from 'src/subject/subject.service';
import { SearchTeacherListDto } from 'src/teacher/dto/teacher.dto';
import { TeacherService } from 'src/teacher/teacher.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly teacherService: TeacherService,
    private readonly studentService: StudentService,
    private readonly programService: ProgramService,
    private readonly facultyService: FacultyService,
    private readonly subjectService: SubjectService,
  ) {}
  async getDashboardData() {
    const teachers: number = await this.teacherService.getTeachersCount();
    const students: number = await this.studentService.getStudentsCount();
    const programs: number = await this.programService.getProgramCount();
    const faculties: number = await this.facultyService.getFacultyCount();
    const subjects: number = await this.subjectService.getSubjectCount();

    return { faculties, programs, subjects, teachers, students };
  }
}
