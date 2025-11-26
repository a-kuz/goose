import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service';
import { RegisterRequest, LoginRequest } from '../types';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: RegisterRequest }>('/register', async (request, reply) => {
    const { username } = request.body;

    if (!username || username.trim().length === 0) {
      return reply.code(400).send({ error: 'Username is required' });
    }

    const user = await AuthService.findOrCreateUser(username);
    const token = fastify.jwt.sign({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return { token, user };
  });

  fastify.post<{ Body: LoginRequest }>('/login', async (request, reply) => {
    const { username } = request.body;

    if (!username || username.trim().length === 0) {
      return reply.code(400).send({ error: 'Username is required' });
    }

    const user = await AuthService.findOrCreateUser(username);
    const token = fastify.jwt.sign({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return { token, user };
  });

  fastify.get('/me', {
    onRequest: [fastify.authenticate],
  }, async (request) => {
    return request.user;
  });
}
