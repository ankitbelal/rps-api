import { Gender, UserStatus, UserType } from 'utils/enums/general-enums';

export interface UserSync {
  id?: number;
  name?: string;
  email?: string;
  userType?: UserType;
  status?: UserStatus;
}


export interface SuperAdmin {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: Gender;
  address1: string;
  address2: string;
  status: UserStatus;
  DOB: Date;
}
