import { prisma } from '../db';
import { UserRole } from '@prisma/client';
import { RoundService } from './round.service';

export class TapService {
  static async processTap(userId: string, roundId: string, tapId: string, userRole: UserRole) {
    console.log('🔧 TapService.processTap', { userId, roundId, tapId, userRole });
    
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
      console.error('❌ Round not found', { roundId });
      throw new Error('Round not found');
    }

    console.log('✓ Round found', { roundId, status: round.status });

    if (!RoundService.isRoundActive(round)) {
      console.error('❌ Round is not active', { roundId, status: round.status });
      throw new Error('Round is not active');
    }

    console.log('✓ Round is active');

    const existingTap = await prisma.tap.findUnique({
      where: { id: tapId },
    });

    if (existingTap) {
      console.error('❌ Tap already processed', { tapId });
      throw new Error('Tap already processed');
    }

    console.log('✓ Tap is new, creating...');

    const currentTapCount = await prisma.tap.count({
      where: {
        userId,
        roundId,
      },
    });

    const tapNumber = currentTapCount + 1;
    const points = userRole === UserRole.NIKITA ? 0 : (tapNumber % 11 === 0 ? 10 : 1);

    console.log('✓ Calculating points', { tapNumber, points, userRole });

    await prisma.tap.create({
      data: {
        id: tapId,
        userId,
        roundId,
        points,
      },
    });

    console.log('✓ Tap created in DB');

    const stats = await this.getTapStats(userId, roundId);

    console.log('✓ Stats retrieved', { stats });

    return {
      userId,
      roundId,
      taps: stats.taps,
      score: stats.score,
    };
  }

  static async getTapStats(userId: string, roundId: string) {
    const result = await prisma.$queryRawUnsafe<Array<{ taps: bigint; score: bigint }>>(
      `SELECT COUNT(id) as taps, COALESCE(SUM(points), 0) as score 
       FROM "Tap" 
       WHERE "userId" = $1 AND "roundId" = $2`,
      userId,
      roundId
    );

    return {
      taps: Number(result[0]?.taps || 0),
      score: Number(result[0]?.score || 0),
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
