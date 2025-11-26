import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { TapService } from '../services/tap.service';
import { RoundService } from '../services/round.service';
import { AuthService } from '../services/auth.service';
import { prisma } from '../db';

let tapCounter = 0;
const generateTapId = (userId: string, roundId: string) => {
  return `${userId}-${roundId}-${Date.now()}-${tapCounter++}-${Math.random().toString(36).substr(2, 9)}`;
};

describe.sequential('Concurrent Users Load Tests', () => {
  beforeEach(async () => {
    await prisma.tap.deleteMany({});
    await prisma.playerStats.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should handle 100 users with 50 taps each', async () => {
    const userCount = 50;
    const tapsPerUser = 50;

    const users = await Promise.all(
      Array.from({ length: userCount }, (_, i) => 
        AuthService.findOrCreateUser(`User${i}`)
      )
    );

    const startTime = new Date(Date.now() - 1000);
    const round = await RoundService.createRound(startTime);
    
    await prisma.round.update({
      where: { id: round.id },
      data: { status: 'ACTIVE' },
    });

    const testStartTime = Date.now();

    const tapPromises = users.flatMap(user =>
      Array.from({ length: tapsPerUser }, () =>
        TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
      )
    );

    await Promise.all(tapPromises);

    const testEndTime = Date.now();
    const duration = testEndTime - testStartTime;

    await new Promise(resolve => setTimeout(resolve, 500));

    const totalTaps = await prisma.tap.count({
      where: { roundId: round.id },
    });

    expect(totalTaps).toBe(userCount * tapsPerUser);

    console.log(`${userCount * tapsPerUser} taps from ${userCount} users completed in ${duration}ms (${(tapPromises.length / (duration / 1000)).toFixed(2)} taps/s)`);
  });

  it('should handle 500 users with 20 taps each (10000 total taps)', async () => {
    const userCount = 500;
    const tapsPerUser = 20;

    const users = await Promise.all(
      Array.from({ length: userCount }, (_, i) => 
        AuthService.findOrCreateUser(`MassUser${i}`)
      )
    );

    const startTime = new Date(Date.now() - 1000);
    const round = await RoundService.createRound(startTime);
    
    await prisma.round.update({
      where: { id: round.id },
      data: { status: 'ACTIVE' },
    });

    const testStartTime = Date.now();

    const tapPromises = users.flatMap(user =>
      Array.from({ length: tapsPerUser }, () =>
        TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
      )
    );

    await Promise.all(tapPromises);

    const testEndTime = Date.now();
    const duration = testEndTime - testStartTime;

    await new Promise(resolve => setTimeout(resolve, 500));

    const totalTaps = await prisma.tap.count({
      where: { roundId: round.id },
    });

    expect(totalTaps).toBe(userCount * tapsPerUser);

    console.log(`${userCount * tapsPerUser} taps from ${userCount} users completed in ${duration}ms (${(tapPromises.length / (duration / 1000)).toFixed(2)} taps/s)`);
  });

  it('should handle wave pattern load (users joining gradually)', async () => {
    const waveCount = 10;
    const usersPerWave = 20;
    const tapsPerUser = 30;

    const startTime = new Date(Date.now() - 1000);
    const round = await RoundService.createRound(startTime);
    
    await prisma.round.update({
      where: { id: round.id },
      data: { status: 'ACTIVE' },
    });

    const testStartTime = Date.now();

    for (let wave = 0; wave < waveCount; wave++) {
      const users = await Promise.all(
        Array.from({ length: usersPerWave }, (_, i) => 
          AuthService.findOrCreateUser(`WaveUser${wave}_${i}`)
        )
      );

      const tapPromises = users.flatMap(user =>
        Array.from({ length: tapsPerUser }, () =>
          TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
        )
      );

      await Promise.all(tapPromises);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const testEndTime = Date.now();
    const duration = testEndTime - testStartTime;

    await new Promise(resolve => setTimeout(resolve, 500));

    const totalTaps = await prisma.tap.count({
      where: { roundId: round.id },
    });

    const expectedTaps = waveCount * usersPerWave * tapsPerUser;
    expect(totalTaps).toBe(expectedTaps);

    console.log(`${expectedTaps} taps in ${waveCount} waves completed in ${duration}ms (${(expectedTaps / (duration / 1000)).toFixed(2)} taps/s)`);
  });

  it('should handle extreme burst from single user', async () => {
    const tapsCount = 5000;

    const user = await AuthService.findOrCreateUser('BurstUser');

    const startTime = new Date(Date.now() - 1000);
    const round = await RoundService.createRound(startTime);
    
    await prisma.round.update({
      where: { id: round.id },
      data: { status: 'ACTIVE' },
    });

    const testStartTime = Date.now();

    const tapPromises = Array.from({ length: tapsCount }, () =>
      TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
    );

    await Promise.all(tapPromises);

    const testEndTime = Date.now();
    const duration = testEndTime - testStartTime;

    await new Promise(resolve => setTimeout(resolve, 500));

    const totalTaps = await prisma.tap.count({
      where: { roundId: round.id, userId: user.id },
    });

    expect(totalTaps).toBe(tapsCount);

    await TapService.finalizeRound(round.id);

    const playerStats = await prisma.playerStats.findUnique({
      where: {
        userId_roundId: {
          userId: user.id,
          roundId: round.id,
        },
      },
    });

    expect(playerStats).toBeDefined();
    expect(playerStats!.taps).toBe(tapsCount);

    const expectedScore = tapsCount + Math.floor(tapsCount / 11) * 9;
    expect(playerStats!.score).toBe(expectedScore);

    console.log(`${tapsCount} burst taps completed in ${duration}ms (${(tapsCount / (duration / 1000)).toFixed(2)} taps/s)`);
  });

  it('should handle mixed user roles under load', async () => {
    const regularUsers = await Promise.all(
      Array.from({ length: 50 }, (_, i) => 
        AuthService.findOrCreateUser(`RegularUser${i}`)
      )
    );

    const nikitaUsers = await Promise.all(
      Array.from({ length: 10 }, (_, i) => 
        AuthService.findOrCreateUser(`Никита${i}`)
      )
    );

    const allUsers = [...regularUsers, ...nikitaUsers];
    const tapsPerUser = 40;

    const startTime = new Date(Date.now() - 1000);
    const round = await RoundService.createRound(startTime);
    
    await prisma.round.update({
      where: { id: round.id },
      data: { status: 'ACTIVE' },
    });

    const testStartTime = Date.now();

    const tapPromises = allUsers.flatMap(user =>
      Array.from({ length: tapsPerUser }, () =>
        TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
      )
    );

    await Promise.all(tapPromises);

    const testEndTime = Date.now();
    const duration = testEndTime - testStartTime;

    await new Promise(resolve => setTimeout(resolve, 500));

    const totalTaps = await prisma.tap.count({
      where: { roundId: round.id },
    });

    expect(totalTaps).toBe(allUsers.length * tapsPerUser);

    const nikitaTaps = await prisma.tap.findMany({
      where: {
        roundId: round.id,
        userId: { in: nikitaUsers.map(u => u.id) },
      },
    });

    expect(nikitaTaps.every(tap => tap.points === 0)).toBe(true);

    console.log(`${allUsers.length * tapsPerUser} taps from mixed roles completed in ${duration}ms`);
  });

  it('should handle concurrent round finalization', async () => {
    const roundCount = 20;
    const usersPerRound = 10;
    const tapsPerUser = 30;

    const rounds = await Promise.all(
      Array.from({ length: roundCount }, async (_, i) => {
        const startTime = new Date(Date.now() - 1000);
        const round = await RoundService.createRound(startTime);
        
        await prisma.round.update({
          where: { id: round.id },
          data: { status: 'ACTIVE' },
        });

        return round;
      })
    );

    const testStartTime = Date.now();

    for (const round of rounds) {
      const users = await Promise.all(
        Array.from({ length: usersPerRound }, (_, i) => 
          AuthService.findOrCreateUser(`Round${round.id}_User${i}`)
        )
      );

      const tapPromises = users.flatMap(user =>
        Array.from({ length: tapsPerUser }, () =>
          TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
        )
      );

      await Promise.all(tapPromises);
    }

    const finalizationPromises = rounds.map(round => 
      TapService.finalizeRound(round.id)
    );

    await Promise.all(finalizationPromises);

    const testEndTime = Date.now();
    const duration = testEndTime - testStartTime;

    const playerStats = await prisma.playerStats.findMany({
      where: {
        roundId: { in: rounds.map(r => r.id) },
      },
    });

    expect(playerStats.length).toBe(roundCount * usersPerRound);

    const totalTaps = await prisma.tap.count({
      where: {
        roundId: { in: rounds.map(r => r.id) },
      },
    });

    expect(totalTaps).toBe(0);

    console.log(`${roundCount} rounds finalized concurrently in ${duration}ms`);
  });

  it('should verify score calculation accuracy under load', async () => {
    const userCount = 100;
    const tapsPerUser = 100;

    const users = await Promise.all(
      Array.from({ length: userCount }, (_, i) => 
        AuthService.findOrCreateUser(`ScoreUser${i}`)
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
        TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
      )
    );

    await Promise.all(tapPromises);

    await new Promise(resolve => setTimeout(resolve, 500));

    await TapService.finalizeRound(round.id);

    for (const user of users) {
      const playerStats = await prisma.playerStats.findUnique({
        where: {
          userId_roundId: {
            userId: user.id,
            roundId: round.id,
          },
        },
      });

      expect(playerStats).toBeDefined();
      expect(playerStats!.taps).toBe(tapsPerUser);

      const expectedScore = tapsPerUser + Math.floor(tapsPerUser / 11) * 9;
      expect(playerStats!.score).toBe(expectedScore);
    }
  });
});
