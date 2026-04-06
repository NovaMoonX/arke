export interface Session {
  id: string;
  pin: string;
  participants: string[];
  createdAt: number;
  expiresAt: number;
}
