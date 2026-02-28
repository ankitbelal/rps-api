export enum UserType {
  ADMIN = 'A',
  TEACHER = 'T',
  STUDENT = 'S',
  SUPERADMIN = 'SA',
}

export enum UserStatus {
  ACTIVE = 'A',
  PENDING = 'P',
  DISABLED = 'D',
}

export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
  OTHER = 'O',
}

export enum StudentStatus {
  ACTIVE = 'A',
  PASSED = 'P',
  SUSPENDED = 'S',
}

export enum SubjectTeacherStatus {
  ACTIVE = 'A',
  OLD = 'O',
}

export enum ExamTerm {
  FIRST = 'F',
  SECOND = 'S',
  FINAL = 'FINAL',
}

export const statusLabels: Record<StudentStatus, string> = {
  [StudentStatus.ACTIVE]: 'Active',
  [StudentStatus.PASSED]: 'Passed',
  [StudentStatus.SUSPENDED]: 'Suspended',
};

export enum AuditActCodes {
  STUDENT_ENROLL = 'SENROLL',
  STUDENT_PROMOTION = 'SPROMO',
  RESULT_PUBLISH = 'RESPUB',
}

export enum LogType {
  STUDENT_PROMOTION = 'promotion',
  RESULT_PUBLISH = 'result',
  MIXED = 'mixed',
}
