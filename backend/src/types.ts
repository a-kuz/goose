import { UserRole } from '@prisma/client';

export interface JWTPayload {
  id: string;
  username: string;
  role: UserRole;
}

export interface TapRequest {
  roundId: string;
}

export interface RegisterRequest {
  username: string;
}

export interface LoginRequest {
  username: string;
}
