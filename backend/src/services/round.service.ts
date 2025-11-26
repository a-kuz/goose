import { prisma } from '../db';
import { RoundStatus } from '@prisma/client';
import { config } from '../config';
import { TapService } from './tap.service';

export class RoundService {
  static async createRound(startTime: Date) {
    const cooldownEnd = startTime;
    const endTime = new Date(startTime.getTime() + config.roundDuration * 1000);

    return prisma.round.create({
      data: {
        startTime,
        endTime,
        cooldownEnd,
        status: RoundStatus.COOLDOWN,
      },
    });
  }

  static async getRoundById(roundId: string) {
    await this.updateRoundStatuses();
    
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        playerStats: {
          include: {
            user: true,
          },
          orderBy: {
            score: 'desc',
          },
        },
      },
    });
    
    if (!round) return null;
    
    return {
      ...round,
      serverTime: new Date().toISOString(),
    };
  }

  static async getAllRounds() {
    await this.updateRoundStatuses();
    
    const rounds = await prisma.round.findMany({
      orderBy: {
        startTime: 'desc',
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });
    
    return rounds;
  }

  static async getAllRoundsWithUserStats(userId: string) {
    await this.updateRoundStatuses();
    
    const rounds = await prisma.round.findMany({
      orderBy: {
        startTime: 'desc',
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    const roundsWithStats = await Promise.all(
      rounds.map(async (round) => {
        if (round.status !== RoundStatus.FINISHED) {
          return round;
        }

        const userStats = await prisma.playerStats.findUnique({
          where: {
            userId_roundId: {
              userId,
              roundId: round.id,
            },
          },
          select: {
            score: true,
          },
        });

        if (!userStats) {
          return round;
        }

        const betterPlayers = await prisma.playerStats.count({
          where: {
            roundId: round.id,
            score: {
              gt: userStats.score,
            },
          },
        });

        return {
          ...round,
          userStats: {
            score: userStats.score,
            position: betterPlayers + 1,
          },
        };
      })
    );

    return roundsWithStats;
  }

  static async updateRoundStatuses() {
    const now = new Date();

    await prisma.round.updateMany({
      where: {
        status: RoundStatus.COOLDOWN,
        startTime: {
          lte: now,
        },
      },
      data: {
        status: RoundStatus.ACTIVE,
      },
    });

    const finishedRounds = await prisma.round.findMany({
      where: {
        status: RoundStatus.ACTIVE,
        endTime: {
          lte: now,
        },
      },
      select: { id: true },
    });

    for (const round of finishedRounds) {
      await prisma.$transaction(async (tx) => {
        const currentRound = await tx.round.findUnique({
          where: { id: round.id },
          select: { status: true },
        });

        if (currentRound?.status !== RoundStatus.ACTIVE) {
          return;
        }

        await TapService.finalizeRound(round.id);
        
        await tx.round.update({
          where: { id: round.id },
          data: { status: RoundStatus.FINISHED },
        });
      });
    }
  }

  static isRoundActive(round: { startTime: Date; endTime: Date }): boolean {
    const now = new Date();
    return now >= round.startTime && now <= round.endTime;
  }

  static async getPlayerStats(userId: string, roundId: string) {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      select: { status: true },
    });

    if (!round) return null;

    if (round.status === RoundStatus.FINISHED) {
      return prisma.playerStats.findUnique({
        where: {
          userId_roundId: {
            userId,
            roundId,
          },
        },
      });
    }

    const result = await prisma.tap.aggregate({
      where: {
        userId,
        roundId,
      },
      _count: {
        id: true,
      },
      _sum: {
        points: true,
      },
    });

    if (result._count.id === 0) {
      return null;
    }

    return {
      id: `temp-${userId}-${roundId}`,
      userId,
      roundId,
      taps: result._count.id,
      score: result._sum.points || 0,
    };
  }

  static async getAllPlayerStats(roundId: string) {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      select: { status: true },
    });

    if (!round) return [];

    if (round.status === RoundStatus.FINISHED) {
      return prisma.playerStats.findMany({
        where: { roundId },
        orderBy: { score: 'desc' },
      });
    }

    const taps = await prisma.tap.groupBy({
      by: ['userId'],
      where: {
        roundId,
      },
      _count: {
        id: true,
      },
      _sum: {
        points: true,
      },
      orderBy: {
        _sum: {
          points: 'desc',
        },
      },
    });

    return taps.map(tap => ({
      id: `temp-${tap.userId}-${roundId}`,
      userId: tap.userId,
      roundId,
      taps: tap._count.id,
      score: tap._sum.points || 0,
    }));
  }
}
