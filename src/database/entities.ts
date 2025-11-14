import { User } from 'src/database/entities/user.entity';
import { UserActivity } from 'src/database/entities/user-activity.entity';
import { Program } from 'src/database/entities/program.entity';
import { Subject } from 'src/database/entities/subject.entity';
import { Student } from 'src/database/entities/student.entity';
import { Teacher } from 'src/database/entities/teacher.entity';
import { Faculty } from 'src/database/entities/faculty.entity';
import { StudentSubjectMarks } from './entities/student-marks.entity';
export const entities = [
  User,
  UserActivity,
  Program,
  Subject,
  Student,
  Teacher,
  Faculty,
  StudentSubjectMarks,
];
