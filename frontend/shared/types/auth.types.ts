export interface NavItem {
  path: string;
  label: string;
  key: string;
}

export interface IUser {
  id: string;
  email?: string;
  role?: string;
  accountType?: string;
  [key: string]: any;
}

export interface IDecodedToken {
  id?: string;
  email?: string;
  role?: string;
  accountType?: string;
  iat?: number;
  exp?: number;
}
