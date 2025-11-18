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
    const round = await RoundService.getRoundById(request.params.id);

    if (!round) {
      return reply.code(404).send({ error: 'Round not found' });
    }

    return round;
  });
}

