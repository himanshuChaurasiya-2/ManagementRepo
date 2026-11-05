export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "sales";
  jobPosition?: string;
  status: "active" | "inactive";
  mustChangePassword: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  accessToken?: string;
  refreshToken?: string;
  user: User;
}