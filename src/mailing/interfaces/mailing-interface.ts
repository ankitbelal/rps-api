export interface PasswordResetUser {
  name: string;
  email: string;
  otp: string;
  verifyUrl?: string;
  expiryMinutes: number;
}

export interface CreatedUser {
  name: string;
  email: string;
  password: string;
  loginUrl?: string;
}

export interface StudentResultEmail {
  student: {
    name: string;
    rollNumber: string;
    registrationNumber: string;
    email: string;
  };
  result: {
    examName: string;
    semester: string;
    publishedDate?: string;
    dashboardLink?: string;
  };
}

export interface BulkPublishResultEmail {
  email: string;
  publisherName: string;
  program: { name: string; code: string };
  examName: string;
  semesters: string; // e.g. "1, 2, 3"
  totalStudents: number;
  successCount: number;
  errorCount: number;
  hasErrors: boolean;
}

export interface NoticeEmailData {
  email: string;
  subject: string;
  description: string;
  
}
