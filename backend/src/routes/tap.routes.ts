import type { FastifyInstance } from 'fastify';
import { TapService } from '../services/tap.service';
import type { TapRequest } from '../types';
import { BroadcastService } from '../services/broadcast.service';
import { wsClients } from '../plugins/websocket.plugin';

export async function tapRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: TapRequest }>('/tap', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user;
    const { roundId, tapId } = request.body;

    if (!roundId) {
      return reply.code(400).send({ error: 'Round ID is required' });
    }

    if (!tapId) {
      return reply.code(400).send({ error: 'Tap ID is required' });
    }

    try {
      const stats = await TapService.processTap(user.id, roundId, tapId, user.role);
      
      wsClients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'tap',
            roundId,
            userId: user.id,
            tapId,
            stats,
          }));
        }
      });

      await BroadcastService.publishTap({
        roundId,
        userId: user.id,
        tapId,
        stats,
      });

      return { ...stats, tapId };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

