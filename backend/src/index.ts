import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './db';
import { jwtPlugin } from './plugins/jwt.plugin';
import { websocketPlugin } from './plugins/websocket.plugin';
import { authRoutes } from './routes/auth.routes';
import { roundRoutes } from './routes/round.routes';
import { tapRoutes } from './routes/tap.routes';
import { RoundService } from './services/round.service';
import { BroadcastService } from './services/broadcast.service';

const fastify = Fastify({
  logger: true,
});

async function start() {
  try {
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    await connectDatabase();

    await jwtPlugin(fastify);
    await websocketPlugin(fastify);
    await BroadcastService.init(fastify);

    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(roundRoutes, { prefix: '/api' });
    await fastify.register(tapRoutes, { prefix: '/api' });

    await RoundService.updateRoundStatuses();

    setInterval(async () => {
      try {
        await RoundService.updateRoundStatuses();
      } catch (error) {
        console.error('Error updating round statuses:', error);
      }
    }, 1000);

    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Server listening on port ${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    await disconnectDatabase();
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await fastify.close();
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await fastify.close();
  await disconnectDatabase();
  process.exit(0);
});

start();

