import { Injectable } from '@nestjs/common';
import { FacultyService } from 'src/faculty/faculty.service';
import { ProgramService } from 'src/program/program.service';
import { StudentService } from 'src/student/student.service';
import { SubjectService } from 'src/subject/subject.service';
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
  async getAdminDashboardData() {
    const [
      teachers,
      students,
      programs,
      faculties,
      subjects,
      studentsDistributions,
    ] = await Promise.all([
      this.teacherService.getTeachersCount(),
      this.studentService.getStudentsDashboardData(),
      this.programService.getProgramCount(),
      this.facultyService.getFacultyCount(),
      this.subjectService.getSubjectCount(),
      this.studentService.getStudentDistributionByProgram(),
    ]);

    return {
      faculties,
      programs,
      subjects,
      teachers,
      students,
      studentsDistributions,
    };
  }
}
