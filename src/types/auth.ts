export interface VtopCredentials {
  username: string;
  password: string;
}

export interface VtopSession {
  cookies: string;
  csrfToken: string;
  expiresAt: number;
  semesterCode: string;
  userId: string;
}

export interface LmsCredentials {
  token: string;
  userId: number;
}

export interface VitolCredentials {
  sessionKey: string;
  userId: string;
  host: string;
}
