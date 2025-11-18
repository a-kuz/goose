import type { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { config } from '../config';
import type { JWTPayload } from '../types';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JWTPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}

export async function jwtPlugin(fastify: FastifyInstance) {
  await fastify.register(jwt, {
    secret: config.jwtSecret,
  });

  fastify.decorate('authenticate', async function(request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
}

