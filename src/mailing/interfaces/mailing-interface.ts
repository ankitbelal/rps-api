export interface PasswordResetUser {
  name: string;
  email: string;
  otp: string;
  verifyUrl: string;
  expiryMinutes: number;
}
