import { prisma } from '../db';
import { UserRole } from '@prisma/client';
import { RoundService } from './round.service';

export class TapService {
  static async processTap(userId: string, roundId: string, userRole: UserRole) {
    const round = await prisma.round.findUnique({
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

    await prisma.tap.create({
      data: {
        userId,
        roundId,
        points: 0,
      },
    });

    const stats = await prisma.tap.aggregate({
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

    return {
      id: `temp-${userId}-${roundId}`,
      userId,
      roundId,
      taps: stats._count.id,
      score: stats._sum.points || 0,
    };
  }

  static async finalizeRound(roundId: string) {
    return await prisma.$transaction(async (tx) => {
      const round = await tx.round.findUnique({
        where: { id: roundId },
        select: { status: true },
      });

      if (!round || round.status === 'FINISHED') {
        return;
      }

      const allTaps = await tx.tap.findMany({
        where: { roundId },
        orderBy: [
          { userId: 'asc' },
          { createdAt: 'asc' },
        ],
        include: {
          user: {
            select: { role: true },
          },
        },
      });

      const userStatsMap = new Map<string, { taps: number; score: number }>();

      let currentUserId = '';
      let tapNumberForUser = 0;

      for (const tap of allTaps) {
        if (tap.userId !== currentUserId) {
          currentUserId = tap.userId;
          tapNumberForUser = 0;
        }
        
        tapNumberForUser++;
        
        const points = tap.user.role === UserRole.NIKITA ? 0 : (tapNumberForUser % 11 === 0 ? 10 : 1);
        
        const existing = userStatsMap.get(tap.userId) || { taps: 0, score: 0 };
        userStatsMap.set(tap.userId, {
          taps: existing.taps + 1,
          score: existing.score + points,
        });
      }

      let totalScore = 0;

      for (const [userId, stats] of userStatsMap.entries()) {
        totalScore += stats.score;

        await tx.playerStats.upsert({
          where: {
            userId_roundId: {
              userId,
              roundId,
            },
          },
          create: {
            userId,
            roundId,
            taps: stats.taps,
            score: stats.score,
          },
          update: {
            taps: stats.taps,
            score: stats.score,
          },
        });
      }

      await tx.round.update({
        where: { id: roundId },
        data: { totalScore },
      });

      await tx.tap.deleteMany({
        where: { roundId },
      });
    });
  }
}
