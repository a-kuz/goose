import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { RoundService } from '../services/round.service';
import { TapService } from '../services/tap.service';
import { AuthService } from '../services/auth.service';
import { prisma } from '../db';

let tapCounter = 0;
const generateTapId = (userId: string, roundId: string) => {
  return `${userId}-${roundId}-${Date.now()}-${tapCounter++}-${Math.random().toString(36).substr(2, 9)}`;
};

describe.sequential('Round Lifecycle Load Tests', () => {
  beforeEach(async () => {
    await prisma.tap.deleteMany({});
    await prisma.playerStats.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should handle complete lifecycle of 50 rounds', async () => {
    const roundCount = 50;
    const usersPerRound = 10;
    const tapsPerUser = 20;

    const testStartTime = Date.now();

    for (let i = 0; i < roundCount; i++) {
      const startTime = new Date(Date.now() - 1000);
      const round = await RoundService.createRound(startTime);
      
      await prisma.round.update({
        where: { id: round.id },
        data: { status: 'ACTIVE' },
      });

      const users = await Promise.all(
        Array.from({ length: usersPerRound }, (_, j) => 
          AuthService.findOrCreateUser(`LifecycleUser${i}_${j}`)
        )
      );

      const tapPromises = users.flatMap(user =>
        Array.from({ length: tapsPerUser }, () =>
          TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
        )
      );

      await Promise.all(tapPromises);

      await TapService.finalizeRound(round.id);

      await prisma.round.update({
        where: { id: round.id },
        data: { status: 'FINISHED' },
      });
    }

    const testEndTime = Date.now();
    const duration = testEndTime - testStartTime;

    const rounds = await prisma.round.findMany({
      include: { playerStats: true },
    });

    expect(rounds.length).toBe(roundCount);
    expect(rounds.every(r => r.status === 'FINISHED')).toBe(true);

    const totalStats = await prisma.playerStats.count();
    expect(totalStats).toBe(roundCount * usersPerRound);

    const totalTaps = await prisma.tap.count();
    expect(totalTaps).toBe(0);

    console.log(`${roundCount} complete round lifecycles in ${duration}ms (${(duration / roundCount).toFixed(2)}ms per round)`);
  });

  it('should handle parallel round lifecycles', async () => {
    const roundCount = 20;
    const usersPerRound = 15;
    const tapsPerUser = 25;

    const testStartTime = Date.now();

    const roundPromises = Array.from({ length: roundCount }, async (_, i) => {
      const startTime = new Date(Date.now() - 1000);
      const round = await RoundService.createRound(startTime);
      
      await prisma.round.update({
        where: { id: round.id },
        data: { status: 'ACTIVE' },
      });

      const users = await Promise.all(
        Array.from({ length: usersPerRound }, (_, j) => 
          AuthService.findOrCreateUser(`ParallelUser${i}_${j}`)
        )
      );

      const tapPromises = users.flatMap(user =>
        Array.from({ length: tapsPerUser }, () =>
          TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
        )
      );

      await Promise.all(tapPromises);

      await TapService.finalizeRound(round.id);

      await prisma.round.update({
        where: { id: round.id },
        data: { status: 'FINISHED' },
      });

      return round;
    });

    await Promise.all(roundPromises);

    const testEndTime = Date.now();
    const duration = testEndTime - testStartTime;

    const rounds = await prisma.round.findMany({
      include: { playerStats: true },
    });

    expect(rounds.length).toBe(roundCount);
    expect(rounds.every(r => r.status === 'FINISHED')).toBe(true);

    const totalStats = await prisma.playerStats.count();
    expect(totalStats).toBe(roundCount * usersPerRound);

    console.log(`${roundCount} parallel round lifecycles completed in ${duration}ms`);
  });

  it('should handle rapid round creation and status updates', async () => {
    const roundCount = 100;

    const testStartTime = Date.now();

    const createPromises = Array.from({ length: roundCount }, () => {
      const startTime = new Date(Date.now() + 5000);
      return RoundService.createRound(startTime);
    });

    const rounds = await Promise.all(createPromises);

    const testEndTime = Date.now();
    const createDuration = testEndTime - testStartTime;

    expect(rounds.length).toBe(roundCount);
    expect(rounds.every(r => r.status === 'COOLDOWN')).toBe(true);

    const updateStartTime = Date.now();

    await RoundService.updateRoundStatuses();

    const updateEndTime = Date.now();
    const updateDuration = updateEndTime - updateStartTime;

    console.log(`${roundCount} rounds created in ${createDuration}ms, status update took ${updateDuration}ms`);
  });

  it('should handle mass player stats retrieval', async () => {
    const roundCount = 10;
    const usersPerRound = 100;
    const tapsPerUser = 30;

    const rounds = await Promise.all(
      Array.from({ length: roundCount }, async (_, i) => {
        const startTime = new Date(Date.now() - 1000);
        const round = await RoundService.createRound(startTime);
        
        await prisma.round.update({
          where: { id: round.id },
          data: { status: 'ACTIVE' },
        });

        const users = await Promise.all(
          Array.from({ length: usersPerRound }, (_, j) => 
            AuthService.findOrCreateUser(`StatsUser${i}_${j}`)
          )
        );

        const tapPromises = users.flatMap(user =>
          Array.from({ length: tapsPerUser }, () =>
            TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
          )
        );

        await Promise.all(tapPromises);

        return { round, users };
      })
    );

    const testStartTime = Date.now();

    const statsPromises = rounds.flatMap(({ round, users }) =>
      users.map(user => RoundService.getPlayerStats(user.id, round.id))
    );

    const stats = await Promise.all(statsPromises);

    const testEndTime = Date.now();
    const duration = testEndTime - testStartTime;

    expect(stats.length).toBe(roundCount * usersPerRound);
    expect(stats.every(s => s !== null)).toBe(true);

    console.log(`${stats.length} player stats retrieved in ${duration}ms (${(stats.length / (duration / 1000)).toFixed(2)} queries/s)`);
  });

  it('should handle mass getAllPlayerStats queries', async () => {
    const roundCount = 50;
    const usersPerRound = 20;
    const tapsPerUser = 25;

    const rounds = await Promise.all(
      Array.from({ length: roundCount }, async (_, i) => {
        const startTime = new Date(Date.now() - 1000);
        const round = await RoundService.createRound(startTime);
        
        await prisma.round.update({
          where: { id: round.id },
          data: { status: 'ACTIVE' },
        });

        const users = await Promise.all(
          Array.from({ length: usersPerRound }, (_, j) => 
            AuthService.findOrCreateUser(`AllStatsUser${i}_${j}`)
          )
        );

        const tapPromises = users.flatMap(user =>
          Array.from({ length: tapsPerUser }, () =>
            TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
          )
        );

        await Promise.all(tapPromises);

        return round;
      })
    );

    const testStartTime = Date.now();

    const allStatsPromises = rounds.map(round => 
      RoundService.getAllPlayerStats(round.id)
    );

    const allStats = await Promise.all(allStatsPromises);

    const testEndTime = Date.now();
    const duration = testEndTime - testStartTime;

    expect(allStats.length).toBe(roundCount);
    expect(allStats.every(stats => stats.length === usersPerRound)).toBe(true);

    console.log(`${roundCount} getAllPlayerStats queries completed in ${duration}ms (${(roundCount / (duration / 1000)).toFixed(2)} queries/s)`);
  });

  it('should handle mixed active and finished rounds', async () => {
    const activeRoundCount = 25;
    const finishedRoundCount = 25;
    const usersPerRound = 15;
    const tapsPerUser = 20;

    const activeRounds = await Promise.all(
      Array.from({ length: activeRoundCount }, async (_, i) => {
        const startTime = new Date(Date.now() - 1000);
        const round = await RoundService.createRound(startTime);
        
        await prisma.round.update({
          where: { id: round.id },
          data: { status: 'ACTIVE' },
        });

        const users = await Promise.all(
          Array.from({ length: usersPerRound }, (_, j) => 
            AuthService.findOrCreateUser(`ActiveUser${i}_${j}`)
          )
        );

        const tapPromises = users.flatMap(user =>
          Array.from({ length: tapsPerUser }, () =>
            TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
          )
        );

        await Promise.all(tapPromises);

        return round;
      })
    );

    const finishedRounds = await Promise.all(
      Array.from({ length: finishedRoundCount }, async (_, i) => {
        const startTime = new Date(Date.now() - 1000);
        const round = await RoundService.createRound(startTime);
        
        await prisma.round.update({
          where: { id: round.id },
          data: { status: 'ACTIVE' },
        });

        const users = await Promise.all(
          Array.from({ length: usersPerRound }, (_, j) => 
            AuthService.findOrCreateUser(`FinishedUser${i}_${j}`)
          )
        );

        const tapPromises = users.flatMap(user =>
          Array.from({ length: tapsPerUser }, () =>
            TapService.processTap(user.id, round.id, generateTapId(user.id, round.id), user.role)
          )
        );

        await Promise.all(tapPromises);

        await TapService.finalizeRound(round.id);

        await prisma.round.update({
          where: { id: round.id },
          data: { status: 'FINISHED' },
        });

        return round;
      })
    );

    const testStartTime = Date.now();

    const allRounds = await RoundService.getAllRounds();

    const testEndTime = Date.now();
    const duration = testEndTime - testStartTime;

    expect(allRounds.length).toBe(activeRoundCount + finishedRoundCount);

    const activeCount = allRounds.filter(r => r.status === 'ACTIVE').length;
    const finishedCount = allRounds.filter(r => r.status === 'FINISHED').length;

    expect(activeCount).toBe(activeRoundCount);
    expect(finishedCount).toBe(finishedRoundCount);

    console.log(`Retrieved ${allRounds.length} mixed rounds in ${duration}ms`);
  });
});
