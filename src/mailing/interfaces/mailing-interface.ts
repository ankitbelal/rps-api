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
