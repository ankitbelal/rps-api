export interface PasswordResetUser {
  name: string;
  email: string;
  otp: string;
  verifyUrl: string;
  expiryMinutes: number;
}

export interface CreatedUser {
  name: string;
  email: string;
  password: string;
  loginUrl: string;
}
