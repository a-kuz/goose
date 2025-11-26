import type { FastifyInstance } from 'fastify';
import { Client, Pool } from 'pg';
import { config } from '../config';
import { randomUUID } from 'crypto';

type TapBroadcastPayload = {
  roundId: string;
  userId: string;
  tapId: string;
  stats: {
    userId: string;
    roundId: string;
    taps: number;
    score: number;
  };
};

type BroadcastMessage = {
  origin: string;
  type: 'tap';
  payload: TapBroadcastPayload;
};

export class BroadcastService {
  private static publisher: Pool | null = null;
  private static listener: Client | null = null;
  private static initialized = false;
  private static readonly channel = 'tap_events';
  private static readonly instanceId = randomUUID();

  static async init(fastify: FastifyInstance) {
    if (this.initialized) {
      return;
    }

    this.publisher = new Pool({
      connectionString: config.databaseUrl,
    });

    this.listener = new Client({
      connectionString: config.databaseUrl,
    });

    await this.listener.connect();
    await this.listener.query(`LISTEN ${this.channel}`);

    this.listener.on('notification', (message: any) => {
      if (!message.payload) {
        return;
      }

      const data = JSON.parse(message.payload) as BroadcastMessage;

      if (data.origin === this.instanceId) {
        return;
      }

      if (data.type === 'tap') {
        const { wsClients } = require('../plugins/websocket.plugin');
        wsClients.forEach((client: any) => {
          if (client.readyState === 1) {
            client.send(
              JSON.stringify({
                type: 'tap',
                roundId: data.payload.roundId,
                userId: data.payload.userId,
                tapId: data.payload.tapId,
                stats: data.payload.stats,
              }),
            );
          }
        });
      }
    });

    fastify.addHook('onClose', async () => {
      if (this.listener) {
        await this.listener.query(`UNLISTEN ${this.channel}`);
        await this.listener.end();
        this.listener = null;
      }

      if (this.publisher) {
        await this.publisher.end();
        this.publisher = null;
      }

      this.initialized = false;
    });

    this.initialized = true;
  }

  static async publishTap(payload: TapBroadcastPayload) {
    if (!this.publisher) {
      this.publisher = new Pool({
        connectionString: config.databaseUrl,
      });
    }

    const message: BroadcastMessage = {
      origin: this.instanceId,
      type: 'tap',
      payload,
    };

    await this.publisher.query('SELECT pg_notify($1, $2)', [
      this.channel,
      JSON.stringify(message),
    ]);
  }
}

