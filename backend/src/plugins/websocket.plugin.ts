import type { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';

export const wsClients = new Set<WebSocket>();

export async function websocketPlugin(fastify: FastifyInstance) {
  await fastify.register(websocket);

  fastify.get('/ws', { websocket: true }, (socket: any, _req) => {
    wsClients.add(socket);

    socket.on('close', () => {
      wsClients.delete(socket);
    });

    socket.on('error', () => {
      wsClients.delete(socket);
    });
  });
}

