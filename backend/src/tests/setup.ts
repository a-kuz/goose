import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import { prisma } from '../db';

dotenv.config();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

