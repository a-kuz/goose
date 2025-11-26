import { prisma } from '../db';
import { UserRole } from '@prisma/client';
import { RoundService } from './round.service';

export class TapService {
  static async processTap(userId: string, roundId: string, tapId: string, userRole: UserRole) {
    const result = await prisma.$queryRawUnsafe<Array<{ inserted: bigint }>>(
      `INSERT INTO "Tap" (id, "userId", "roundId", points, "createdAt")
       SELECT $1, $2, $3, 0, NOW()
       FROM "Round" r
       WHERE r.id = $3 
         AND r.status = 'ACTIVE'
         AND r."startTime" <= NOW()
         AND r."endTime" > NOW()
       ON CONFLICT (id) DO NOTHING
       RETURNING 1`,
      tapId,
      userId,
      roundId
    );

    if (!result[0]) {
      throw new Error('Round not found or not active');
    }
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

      await tx.$executeRawUnsafe(`
        INSERT INTO "PlayerStats" (id, "userId", "roundId", taps, score)
        SELECT 
          gen_random_uuid(),
          t."userId",
          t."roundId",
          COUNT(*) as taps,
          CASE 
            WHEN u.role = 'NIKITA' THEN 0
            ELSE COUNT(*) + (COUNT(*) / 11) * 9
          END as score
        FROM "Tap" t
        JOIN "User" u ON t."userId" = u.id
        WHERE t."roundId" = $1
        GROUP BY t."userId", t."roundId", u.role
        ON CONFLICT ("userId", "roundId") 
        DO UPDATE SET 
          taps = EXCLUDED.taps,
          score = EXCLUDED.score
      `, roundId);

      const totalScoreResult = await tx.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COALESCE(SUM(score), 0) as total FROM "PlayerStats" WHERE "roundId" = $1`,
        roundId
      );

      await tx.round.update({
        where: { id: roundId },
        data: { totalScore: Number(totalScoreResult[0]?.total || 0) },
      });

      await tx.tap.deleteMany({
        where: { roundId },
      });
    });
  }
}
