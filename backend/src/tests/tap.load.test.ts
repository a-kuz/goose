import { describe, it, expect, beforeEach } from 'vitest';
import { TapService } from '../services/tap.service';
import { RoundService } from '../services/round.service';
import { AuthService } from '../services/auth.service';
import { prisma } from '../db';

describe.sequential('TapService Load Tests', () => {
  beforeEach(async () => {
    await prisma.playerStats.deleteMany({});
    await prisma.tap.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('should handle multiple users with concurrent taps and calculate correct total score', async () => {
    const userCount = 5;
    const tapsPerUser = 20;

    const users = await Promise.all(
      Array.from({ length: userCount }, (_, i) => 
        AuthService.findOrCreateUser(`LoadTestUser${i}`)
      )
    );

    const startTime = new Date(Date.now() - 1000);
    const round = await RoundService.createRound(startTime);
    
    await prisma.round.update({
      where: { id: round.id },
      data: { status: 'ACTIVE' },
    });

    const tapPromises = users.flatMap(user =>
      Array.from({ length: tapsPerUser }, () =>
        TapService.processTap(user.id, round.id, user.role)
      )
    );

    await Promise.all(tapPromises);

    await TapService.finalizeRound(round.id);

    const playerStats = await prisma.playerStats.findMany({
      where: { roundId: round.id },
    });

    expect(playerStats.length).toBe(userCount);

    playerStats.forEach(stats => {
      expect(stats.taps).toBe(tapsPerUser);
      
      const eleventhTapsCount = Math.floor(tapsPerUser / 11);
      const regularTapsCount = tapsPerUser - eleventhTapsCount;
      const expectedScore = regularTapsCount * 1 + eleventhTapsCount * 10;
      
      expect(stats.score).toBe(expectedScore);
    });

    const totalExpectedScore = playerStats.reduce((sum, stats) => sum + stats.score, 0);

    const updatedRound = await prisma.round.findUnique({
      where: { id: round.id },
    });

    expect(updatedRound?.totalScore).toBe(totalExpectedScore);
  });

  it('should handle heavy concurrent load from many users', async () => {
    const userCount = 50;
    const tapsPerUser = 100;

    const users = await Promise.all(
      Array.from({ length: userCount }, (_, i) => 
        AuthService.findOrCreateUser(`HeavyLoadUser${i}`)
      )
    );

    const startTime = new Date(Date.now() - 1000);
    const round = await RoundService.createRound(startTime);
    
    await prisma.round.update({
      where: { id: round.id },
      data: { status: 'ACTIVE' },
    });

    const allTapPromises = users.flatMap(user =>
      Array.from({ length: tapsPerUser }, () =>
        TapService.processTap(user.id, round.id, user.role)
      )
    );

    await Promise.all(allTapPromises);

    await TapService.finalizeRound(round.id);

    const playerStats = await prisma.playerStats.findMany({
      where: { roundId: round.id },
    });

    expect(playerStats.length).toBe(userCount);

    const totalTaps = playerStats.reduce((sum, stats) => sum + stats.taps, 0);
    expect(totalTaps).toBe(userCount * tapsPerUser);

    const totalScore = playerStats.reduce((sum, stats) => sum + stats.score, 0);
    
    const updatedRound = await prisma.round.findUnique({
      where: { id: round.id },
    });

    expect(updatedRound?.totalScore).toBe(totalScore);
  });

  it('should correctly handle mixed users including Nikita role', async () => {
    const regularUsers = await Promise.all([
      AuthService.findOrCreateUser('RegularUser1'),
      AuthService.findOrCreateUser('RegularUser2'),
    ]);
    
    const nikitaUser = await AuthService.findOrCreateUser('Никита');
    const allUsers = [...regularUsers, nikitaUser];

    const tapsPerUser = 15;

    const startTime = new Date(Date.now() - 1000);
    const round = await RoundService.createRound(startTime);
    
    await prisma.round.update({
      where: { id: round.id },
      data: { status: 'ACTIVE' },
    });

    const tapPromises = allUsers.flatMap(user =>
      Array.from({ length: tapsPerUser }, () =>
        TapService.processTap(user.id, round.id, user.role)
      )
    );

    await Promise.all(tapPromises);

    await TapService.finalizeRound(round.id);

    const nikitaStats = await prisma.playerStats.findUnique({
      where: {
        userId_roundId: {
          userId: nikitaUser.id,
          roundId: round.id,
        },
      },
    });

    expect(nikitaStats?.taps).toBe(tapsPerUser);
    expect(nikitaStats?.score).toBe(0);

    const regularStats = await prisma.playerStats.findMany({
      where: {
        roundId: round.id,
        userId: { in: regularUsers.map(u => u.id) },
      },
    });

    regularStats.forEach(stats => {
      expect(stats.taps).toBe(tapsPerUser);
      expect(stats.score).toBeGreaterThan(0);
    });

    const totalRegularScore = regularStats.reduce((sum, stats) => sum + stats.score, 0);

    const updatedRound = await prisma.round.findUnique({
      where: { id: round.id },
    });

    expect(updatedRound?.totalScore).toBe(totalRegularScore);
  });

  it('should handle extreme concurrent load with race conditions', async () => {
    const userCount = 100;
    const tapsPerUser = 30;

    const users = await Promise.all(
      Array.from({ length: userCount }, (_, i) => 
        AuthService.findOrCreateUser(`RaceConditionUser${i}`)
      )
    );

    const startTime = new Date(Date.now() - 1000);
    const round = await RoundService.createRound(startTime);
    
    await prisma.round.update({
      where: { id: round.id },
      data: { status: 'ACTIVE' },
    });

    const tapBatches = [];
    for (let i = 0; i < tapsPerUser; i++) {
      const batch = users.map(user => 
        TapService.processTap(user.id, round.id, user.role)
      );
      tapBatches.push(Promise.all(batch));
    }

    await Promise.all(tapBatches);

    await TapService.finalizeRound(round.id);

    const playerStats = await prisma.playerStats.findMany({
      where: { roundId: round.id },
    });

    expect(playerStats.length).toBe(userCount);

    const allTapsCorrect = playerStats.every(stats => stats.taps === tapsPerUser);
    expect(allTapsCorrect).toBe(true);

    let expectedTotalScore = 0;
    playerStats.forEach(stats => {
      const eleventhTapsCount = Math.floor(stats.taps / 11);
      const regularTapsCount = stats.taps - eleventhTapsCount;
      const expectedScore = regularTapsCount * 1 + eleventhTapsCount * 10;
      expect(stats.score).toBe(expectedScore);
      expectedTotalScore += expectedScore;
    });

    const updatedRound = await prisma.round.findUnique({
      where: { id: round.id },
    });

    expect(updatedRound?.totalScore).toBe(expectedTotalScore);
  });

  it('should verify tap count increments are sequential per user', async () => {
    const user = await AuthService.findOrCreateUser('SequentialTestUser');
    const concurrentTaps = 30;

    const startTime = new Date(Date.now() - 1000);
    const round = await RoundService.createRound(startTime);
    
    await prisma.round.update({
      where: { id: round.id },
      data: { status: 'ACTIVE' },
    });

    const tapPromises = Array.from({ length: concurrentTaps }, () =>
      TapService.processTap(user.id, round.id, user.role)
    );

    await Promise.all(tapPromises);

    await TapService.finalizeRound(round.id);

    const finalStats = await prisma.playerStats.findUnique({
      where: {
        userId_roundId: {
          userId: user.id,
          roundId: round.id,
        },
      },
    });

    expect(finalStats?.taps).toBe(concurrentTaps);
    
    const eleventhTapsCount = Math.floor(concurrentTaps / 11);
    const regularTapsCount = concurrentTaps - eleventhTapsCount;
    const expectedScore = regularTapsCount * 1 + eleventhTapsCount * 10;
    expect(finalStats?.score).toBe(expectedScore);
  });
});
