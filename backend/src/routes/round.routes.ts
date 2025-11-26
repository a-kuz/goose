import { FastifyInstance } from 'fastify';
import { RoundService } from '../services/round.service';
import { UserRole } from '@prisma/client';
import { config } from '../config';

export async function roundRoutes(fastify: FastifyInstance) {
  fastify.post('/rounds', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user;

    if (user.role !== UserRole.ADMIN) {
      return reply.code(403).send({ error: 'Only admins can create rounds' });
    }

    const startDate = new Date(Date.now() + config.cooldownDuration * 1000);
    const round = await RoundService.createRound(startDate);
    return round;
  });

  fastify.get('/rounds', async () => {
    return RoundService.getAllRounds();
  });

  fastify.get<{ Params: { id: string } }>('/rounds/:id', async (request, reply) => {
    console.log('📊 GET /rounds/:id', { 
      roundId: request.params.id,
      timestamp: new Date().toISOString(),
      headers: {
        authorization: request.headers.authorization ? 'present' : 'missing',
        referer: request.headers.referer
      }
    });
    
    const round = await RoundService.getRoundById(request.params.id);

    if (!round) {
      console.error('❌ Round not found', { roundId: request.params.id });
      return reply.code(404).send({ error: 'Round not found' });
    }

    console.log('✅ Round found and returned', { roundId: request.params.id });
    return round;
  });

  fastify.get<{ Params: { roundId: string } }>('/rounds/:roundId/stats', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = request.user.id;
    const { roundId } = request.params;

    const stats = await RoundService.getPlayerStats(userId, roundId);

    if (!stats) {
      return reply.code(404).send({ error: 'Stats not found' });
    }

    return stats;
  });

  fastify.get<{ Params: { roundId: string } }>('/rounds/:roundId/all-stats', async (request, reply) => {
    const { roundId } = request.params;

    const stats = await RoundService.getAllPlayerStats(roundId);

    return {
      roundId,
      totalPlayers: stats.length,
      totalTaps: stats.reduce((sum, s) => sum + s.taps, 0),
      players: stats,
    };
  });
}
