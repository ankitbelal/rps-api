import { User } from 'src/database/entities/user.entity';
import { UserActivity } from 'src/database/entities/user-activity.entity';
import { Program } from 'src/database/entities/program.entity';
import { Subject } from 'src/database/entities/subject.entity';
import { Student } from 'src/database/entities/student.entity';
import { Teacher } from 'src/database/entities/teacher.entity';
import { Faculty } from 'src/database/entities/faculty.entity';
import { StudentSubjectMarks } from './entities/student-marks.entity';
import { StudentAttendance } from './entities/student-attendance.entity';
import { UserOTP } from './entities/user-otps.entity';
import { EvaluationParameter } from './entities/evaluation-parameter.entity';
import { SubjectsEvaluationParameter } from './entities/subject-evaluation-parameter.entity';
import { ExtraParametersMarks } from './entities/extra-parameters-marks.entity';
import { AuditTrails } from './entities/audit-trails.entity';
import { AdminUsers } from './entities/admin-users.entity';
import { SubjectTeachers } from './entities/subject-teacher.entity';
export const entities = [
  User,
  UserActivity,
  Program,
  Subject,
  Student,
  Teacher,
  SubjectTeachers,
  Faculty,
  StudentSubjectMarks,
  StudentAttendance,
  UserOTP,
  EvaluationParameter,
  SubjectsEvaluationParameter,
  ExtraParametersMarks,
  AuditTrails,
  AdminUsers,
];
