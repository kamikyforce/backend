import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../config/database';
import { jwtConfig } from '../config/jwt';
import { LoginRequest, RegisterRequest, AuthResponse } from '../types/auth';

export class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = data;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user,
      token
    };
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    };
  }

  private generateToken(userId: string, email: string, role: string): string {
    const secret = jwtConfig.secret;
    const expiresIn = jwtConfig.expiresIn as SignOptions['expiresIn'];

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const payload = { userId, email, role };

    return jwt.sign(payload, secret, { expiresIn });
  }
}
