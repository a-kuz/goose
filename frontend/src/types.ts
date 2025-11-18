export enum UserRole {
  ADMIN = 'ADMIN',
  SURVIVOR = 'SURVIVOR',
  NIKITA = 'NIKITA',
}

export enum RoundStatus {
  COOLDOWN = 'COOLDOWN',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export interface Round {
  id: string;
  startTime: string;
  endTime: string;
  cooldownEnd: string;
  status: RoundStatus;
  totalScore: number;
  playerStats?: PlayerStats[];
  serverTime?: string;
}

export interface PlayerStats {
  id: string;
  userId: string;
  roundId: string;
  taps: number;
  score: number;
  user?: User;
}

