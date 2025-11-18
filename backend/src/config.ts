import dotenv from 'dotenv';

dotenv.config();

const defaultDatabaseUrl = 'postgresql://postgres:postgres@localhost:5432/goose?schema=public';
const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl;
process.env.DATABASE_URL = databaseUrl;

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  roundDuration: parseInt(process.env.ROUND_DURATION || '60', 10),
  cooldownDuration: parseInt(process.env.COOLDOWN_DURATION || '30', 10),
  databaseUrl,
};

