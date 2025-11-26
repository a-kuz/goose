import { config } from './config';
import { connectDatabase, disconnectDatabase } from './db';
import { RoundService } from './services/round.service';
import { createApp } from './app';

let roundStatusInterval: NodeJS.Timeout | null = null;
let server: Awaited<ReturnType<typeof createApp>> | null = null;

async function start() {
  try {
    await connectDatabase();
    server = await createApp();

    await RoundService.updateRoundStatuses();

    roundStatusInterval = setInterval(async () => {
      try {
        await RoundService.updateRoundStatuses();
      } catch (error) {
        console.error('Error updating round statuses:', error);
      }
    }, 1000);

    await server.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`🚀 Server listening on port ${config.port}`);
  } catch (err) {
    console.error(err);
    await cleanup();
    process.exit(1);
  }
}

async function cleanup() {
  console.log('\n🛑 Shutting down gracefully...');

  if (roundStatusInterval) {
    clearInterval(roundStatusInterval);
  }

  console.log('🔌 Closing server...');
  if (server) {
    await server.close();
    server = null;
  }

  console.log('🗄️  Disconnecting database...');
  await disconnectDatabase();

  console.log('✅ Cleanup complete');
}

process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught Exception:', error);
  await cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
  await cleanup();
  process.exit(1);
});

start();
