import { describe, it, expect, beforeEach } from 'vitest';
import { TapService } from '../services/tap.service';
import { RoundService } from '../services/round.service';
import { AuthService } from '../services/auth.service';
import { UserRole } from '@prisma/client';
import { prisma } from '../db';

describe('TapService', () => {
  beforeEach(async () => {
    await prisma.playerStats.deleteMany();
    await prisma.round.deleteMany();
    await prisma.user.deleteMany();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('processTap', () => {
    it('should process tap and add 1 point for regular tap', async () => {
      const user = await AuthService.findOrCreateUser('TestUser');
      const startTime = new Date(Date.now() - 1000);
      const round = await RoundService.createRound(startTime);
      
      await prisma.round.update({
        where: { id: round.id },
        data: { status: 'ACTIVE' },
      });
      
      const stats = await TapService.processTap(user.id, round.id, user.role);
      
      expect(stats.taps).toBe(1);
      expect(stats.score).toBe(1);
    });

    it('should add 10 points for every 11th tap', async () => {
      const user = await AuthService.findOrCreateUser('EleventhTapUser');
      const startTime = new Date(Date.now() - 1000);
      const round = await RoundService.createRound(startTime);
      
      await prisma.round.update({
        where: { id: round.id },
        data: { status: 'ACTIVE' },
      });
      
      for (let i = 0; i < 10; i++) {
        await TapService.processTap(user.id, round.id, user.role);
      }
      
      const stats = await TapService.processTap(user.id, round.id, user.role);
      
      expect(stats.taps).toBe(11);
      expect(stats.score).toBe(20);
    });

    it('should not add points for Nikita role', async () => {
      const user = await AuthService.findOrCreateUser('Никита');
      const startTime = new Date(Date.now() - 1000);
      const round = await RoundService.createRound(startTime);
      
      await prisma.round.update({
        where: { id: round.id },
        data: { status: 'ACTIVE' },
      });
      
      const stats = await TapService.processTap(user.id, round.id, user.role);
      
      expect(stats.taps).toBe(1);
      expect(stats.score).toBe(0);
    });

    it('should throw error for inactive round', async () => {
      const user = await AuthService.findOrCreateUser('TestUser');
      const startTime = new Date(Date.now() + 60000);
      const round = await RoundService.createRound(startTime);
      
      await expect(
        TapService.processTap(user.id, round.id, user.role)
      ).rejects.toThrow('Round is not active');
    });

    it('should throw error for non-existent round', async () => {
      const user = await AuthService.findOrCreateUser('TestUser');
      
      await expect(
        TapService.processTap(user.id, 'non-existent-id', user.role)
      ).rejects.toThrow('Round not found');
    });

    it('should update round total score', async () => {
      const user = await AuthService.findOrCreateUser('TestUser');
      const startTime = new Date(Date.now() - 1000);
      const round = await RoundService.createRound(startTime);
      
      await prisma.round.update({
        where: { id: round.id },
        data: { status: 'ACTIVE' },
      });
      
      await TapService.processTap(user.id, round.id, user.role);
      await TapService.processTap(user.id, round.id, user.role);
      
      const updatedRound = await prisma.round.findUnique({
        where: { id: round.id },
      });
      
      expect(updatedRound?.totalScore).toBe(2);
    });

    it('should handle concurrent taps correctly', async () => {
      const user = await AuthService.findOrCreateUser('ConcurrentUser');
      const startTime = new Date(Date.now() - 1000);
      const round = await RoundService.createRound(startTime);
      
      await prisma.round.update({
        where: { id: round.id },
        data: { status: 'ACTIVE' },
      });
      
      await TapService.processTap(user.id, round.id, user.role);
      await TapService.processTap(user.id, round.id, user.role);
      await TapService.processTap(user.id, round.id, user.role);
      
      const finalStats = await prisma.playerStats.findUnique({
        where: {
          userId_roundId: {
            userId: user.id,
            roundId: round.id,
          },
        },
      });
      expect(finalStats?.taps).toBe(3);
      expect(finalStats?.score).toBe(3);
    });
  });
});

