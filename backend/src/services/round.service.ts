import { prisma } from '../db';
import { RoundStatus } from '@prisma/client';
import { config } from '../config';

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
    
    const serverTime = new Date().toISOString();
    return rounds.map(round => ({
      ...round,
      serverTime,
    }));
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

    await prisma.round.updateMany({
      where: {
        status: RoundStatus.ACTIVE,
        endTime: {
          lte: now,
        },
      },
      data: {
        status: RoundStatus.FINISHED,
      },
    });
  }

  static isRoundActive(round: { startTime: Date; endTime: Date }): boolean {
    const now = new Date();
    return now >= round.startTime && now <= round.endTime;
  }
}

