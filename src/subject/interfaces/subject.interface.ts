import { SubjectTeacherStatus } from 'utils/enums/general-enums';

interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface SubjectResponse {
  id: number;
  name: string;
  code: string;
  credits: number;
  semester: number;
  type: string;
  program: {
    id: number;
    name: string;
    code: string;
  };
  subjectTeacher: Teacher;
  createdAt: Date;
}

export interface SubjectTeacher {
  teacherId?: number;
  subjectId?: number;
  status?: SubjectTeacherStatus;
}
