import Fastify from 'fastify';
import cors from '@fastify/cors';
import { jwtPlugin } from './plugins/jwt.plugin';
import { websocketPlugin } from './plugins/websocket.plugin';
import { BroadcastService } from './services/broadcast.service';
import { authRoutes } from './routes/auth.routes';
import { roundRoutes } from './routes/round.routes';
import { tapRoutes } from './routes/tap.routes';

type AppOptions = {
  logger?: boolean;
  enableBroadcast?: boolean;
};

export async function createApp(options: AppOptions = {}) {
  const { logger = true, enableBroadcast = true } = options;
  const fastify = Fastify({ logger });

  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await jwtPlugin(fastify);
  await websocketPlugin(fastify);

  if (enableBroadcast) {
    await BroadcastService.init(fastify);
  }

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(roundRoutes, { prefix: '/api' });
  await fastify.register(tapRoutes, { prefix: '/api' });

  return fastify;
}
