import { randomInt } from 'crypto';
import { StudentStatus, UserStatus } from './enums/general-enums';
/**
 * Generate a random number string of given digits.
 * @param digits Number of digits (default 6)
 * @returns string
 */
export async function generateRandomNumbers(digits = 6): Promise<string> {
  const max = 10 ** digits;
  const number = randomInt(0, max);
  return number.toString().padStart(digits, '0');
}

export async function mapStudentUserStatus(
  status: StudentStatus,
): Promise<UserStatus> {
  switch (status) {
    case StudentStatus.ACTIVE:
      return UserStatus.ACTIVE;

    case StudentStatus.PASSED:
      return UserStatus.DISABLED;

    default:
      return UserStatus.DISABLED;
  }
}
