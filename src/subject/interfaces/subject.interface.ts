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

export interface SubjectInternal {
  semester?: number;
  programId: number;
}
export interface SubjectInternalResponse {
  id?: number;
  name?: string;
  code?: string;
  semester?: number;
}

export interface ProgramSemesterPair {
  programId: number;
  semester: number;
}

export interface ProgramSemesterDashboard {
  programId: number;
  programName: string;
  programCode: string;
  semesters: { semester: number; subjectCount: number }[];
}
