export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}