import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../services/auth.service';
import { UserRole } from '@prisma/client';
import { prisma } from '../db';

describe('AuthService', () => {
  beforeEach(async () => {
    await prisma.playerStats.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('determineRole', () => {
    it('should assign ADMIN role for username "admin"', () => {
      const role = AuthService.determineRole('admin');
      expect(role).toBe(UserRole.ADMIN);
    });

    it('should assign NIKITA role for username "Никита"', () => {
      const role = AuthService.determineRole('Никита');
      expect(role).toBe(UserRole.NIKITA);
    });

    it('should assign SURVIVOR role for other usernames', () => {
      const role = AuthService.determineRole('Ivan');
      expect(role).toBe(UserRole.SURVIVOR);
    });

    it('should be case insensitive', () => {
      expect(AuthService.determineRole('ADMIN')).toBe(UserRole.ADMIN);
      expect(AuthService.determineRole('никита')).toBe(UserRole.NIKITA);
    });
  });

  describe('findOrCreateUser', () => {
    it('should create a new user if not exists', async () => {
      const user = await AuthService.findOrCreateUser('TestUser');
      
      expect(user).toBeDefined();
      expect(user.username).toBe('TestUser');
      expect(user.role).toBe(UserRole.SURVIVOR);
    });

    it('should return existing user if already exists', async () => {
      const user1 = await AuthService.findOrCreateUser('TestUser');
      const user2 = await AuthService.findOrCreateUser('TestUser');
      
      expect(user1.id).toBe(user2.id);
    });

    it('should create admin user correctly', async () => {
      const user = await AuthService.findOrCreateUser('admin');
      
      expect(user.role).toBe(UserRole.ADMIN);
    });

    it('should create Nikita user correctly', async () => {
      const user = await AuthService.findOrCreateUser('Никита');
      
      expect(user.role).toBe(UserRole.NIKITA);
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const createdUser = await AuthService.findOrCreateUser('TestUser');
      const foundUser = await AuthService.getUserById(createdUser.id);
      
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
    });

    it('should return null for non-existent user', async () => {
      const user = await AuthService.getUserById('non-existent-id');
      
      expect(user).toBeNull();
    });
  });
});

