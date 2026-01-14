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
