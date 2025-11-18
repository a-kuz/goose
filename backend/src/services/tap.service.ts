import { prisma } from '../db';
import { UserRole } from '@prisma/client';
import { RoundService } from './round.service';

export class TapService {
  static async processTap(userId: string, roundId: string, userRole: UserRole) {
    return await prisma.$transaction(async (tx) => {
      const round = await tx.round.findUnique({
        where: { id: roundId },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      });

      if (!round) {
        throw new Error('Round not found');
      }

      if (!RoundService.isRoundActive(round)) {
        throw new Error('Round is not active');
      }

      let playerStats = await tx.playerStats.findUnique({
        where: {
          userId_roundId: {
            userId,
            roundId,
          },
        },
      });

      if (!playerStats) {
        playerStats = await tx.playerStats.create({
          data: {
            userId,
            roundId,
            taps: 0,
            score: 0,
          },
        });
      }

      const newTapCount = playerStats.taps + 1;
      let pointsToAdd = 0;

      if (userRole !== UserRole.NIKITA) {
        pointsToAdd = newTapCount % 11 === 0 ? 10 : 1;
      }

      const updatedStats = await tx.playerStats.update({
        where: {
          id: playerStats.id,
        },
        data: {
          taps: newTapCount,
          score: playerStats.score + pointsToAdd,
        },
      });

      if (pointsToAdd > 0) {
        await tx.round.update({
          where: { id: roundId },
          data: {
            totalScore: {
              increment: pointsToAdd,
            },
          },
        });
      }

      return updatedStats;
    }, {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    });
  }
}

