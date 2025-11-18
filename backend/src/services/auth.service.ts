import { prisma } from '../db';
import { UserRole } from '@prisma/client';

export class AuthService {
  static determineRole(username: string): UserRole {
    if (username.toLowerCase() === 'admin') {
      return UserRole.ADMIN;
    }
    if (username.toLowerCase() === 'никита') {
      return UserRole.NIKITA;
    }
    return UserRole.SURVIVOR;
  }

  static async findOrCreateUser(username: string) {
    let user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      const role = this.determineRole(username);
      user = await prisma.user.create({
        data: {
          username,
          role,
        },
      });
    }

    return user;
  }

  static async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }
}

