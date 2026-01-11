import { UserStatus, UserType } from 'utils/enums/general-enums';

export interface UserSync {
  name?: string;
  email?: string;
  userType?: UserType;
  status?: UserStatus;
}
