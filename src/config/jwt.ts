import { SignOptions } from 'jsonwebtoken';

export const jwtConfig = {
  secret: (process.env.JWT_SECRET || 'your-secret-key') as string,
  expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
};
