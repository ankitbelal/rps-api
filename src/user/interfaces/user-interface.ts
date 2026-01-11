import { UserStatus, UserType } from 'utils/enums/general-enums';

export interface UserSync {
  id?: number;
  name?: string;
  email?: string;
  userType?: UserType;
  status?: UserStatus;
}
