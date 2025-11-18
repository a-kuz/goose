import { describe, it, expect, beforeEach } from 'vitest';
import { RoundService } from '../services/round.service';
import { RoundStatus } from '@prisma/client';
import { prisma } from '../db';
import { config } from '../config';

describe('RoundService', () => {
  beforeEach(async () => {
    await prisma.playerStats.deleteMany();
    await prisma.round.deleteMany();
  });

  describe('createRound', () => {
    it('should create a round with correct times', async () => {
      const startTime = new Date(Date.now() + 60000);
      const round = await RoundService.createRound(startTime);
      
      expect(round).toBeDefined();
      expect(round.status).toBe(RoundStatus.COOLDOWN);
      expect(new Date(round.startTime).getTime()).toBe(startTime.getTime());
      
      const expectedEndTime = new Date(startTime.getTime() + config.roundDuration * 1000);
      expect(new Date(round.endTime).getTime()).toBe(expectedEndTime.getTime());
    });

    it('should set totalScore to 0', async () => {
      const startTime = new Date(Date.now() + 60000);
      const round = await RoundService.createRound(startTime);
      
      expect(round.totalScore).toBe(0);
    });
  });

  describe('getRoundById', () => {
    it('should return round with player stats', async () => {
      const startTime = new Date(Date.now() + 60000);
      const createdRound = await RoundService.createRound(startTime);
      
      const round = await RoundService.getRoundById(createdRound.id);
      
      expect(round).toBeDefined();
      expect(round?.id).toBe(createdRound.id);
      expect(round?.playerStats).toBeDefined();
    });

    it('should return null for non-existent round', async () => {
      const round = await RoundService.getRoundById('non-existent-id');
      
      expect(round).toBeNull();
    });
  });

  describe('getAllRounds', () => {
    it('should return all rounds ordered by startTime desc', async () => {
      const round1 = await RoundService.createRound(new Date(Date.now() + 60000));
      const round2 = await RoundService.createRound(new Date(Date.now() + 120000));
      
      const rounds = await RoundService.getAllRounds();
      
      expect(rounds.length).toBeGreaterThanOrEqual(2);
      expect(rounds[0].id).toBe(round2.id);
      expect(rounds[1].id).toBe(round1.id);
    });
  });

  describe('updateRoundStatuses', () => {
    it('should update COOLDOWN to ACTIVE when time comes', async () => {
      const startTime = new Date(Date.now() - 1000);
      const round = await RoundService.createRound(startTime);
      
      await RoundService.updateRoundStatuses();
      
      const updatedRound = await prisma.round.findUnique({
        where: { id: round.id },
      });
      
      expect(updatedRound?.status).toBe(RoundStatus.ACTIVE);
    });

    it('should update ACTIVE to FINISHED when time comes', async () => {
      const startTime = new Date(Date.now() - config.roundDuration * 1000 - 1000);
      const round = await RoundService.createRound(startTime);
      
      await prisma.round.update({
        where: { id: round.id },
        data: { status: RoundStatus.ACTIVE },
      });
      
      await RoundService.updateRoundStatuses();
      
      const updatedRound = await prisma.round.findUnique({
        where: { id: round.id },
      });
      
      expect(updatedRound?.status).toBe(RoundStatus.FINISHED);
    });
  });

  describe('isRoundActive', () => {
    it('should return true for active round', () => {
      const now = new Date();
      const round = {
        startTime: new Date(now.getTime() - 10000),
        endTime: new Date(now.getTime() + 10000),
      };
      
      expect(RoundService.isRoundActive(round)).toBe(true);
    });

    it('should return false for future round', () => {
      const now = new Date();
      const round = {
        startTime: new Date(now.getTime() + 10000),
        endTime: new Date(now.getTime() + 20000),
      };
      
      expect(RoundService.isRoundActive(round)).toBe(false);
    });

    it('should return false for finished round', () => {
      const now = new Date();
      const round = {
        startTime: new Date(now.getTime() - 20000),
        endTime: new Date(now.getTime() - 10000),
      };
      
      expect(RoundService.isRoundActive(round)).toBe(false);
    });
  });
});

