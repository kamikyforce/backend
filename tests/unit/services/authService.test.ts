import { AuthService } from '../../../src/services/authService';
import prisma from '../../../src/config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mocks das dependências
jest.mock('../../../src/config/database', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    it('deve registrar um novo usuário com sucesso', async () => {
      // Arrange
      const hashedPassword = 'hashedPassword123';
      const createdUser = {
        id: 'user-123',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'USER'
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);
      (jwt.sign as jest.Mock).mockReturnValue('mocked-jwt-token');

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email }
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      });

      expect(jwt.sign).toHaveBeenCalled();
      expect(result).toEqual({
        user: createdUser,
        token: 'mocked-jwt-token'
      });
    });

    it('deve lançar erro se o e-mail já existir', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'already-exists' });

      await expect(authService.register(userData)).rejects.toThrow('User already exists with this email');
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    const foundUser = {
      id: 'user-123',
      email: loginData.email,
      password: 'hashedPassword',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER'
    };

    it('deve autenticar um usuário com sucesso', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(foundUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mocked-jwt-token');

      const result = await authService.login(loginData);

      expect(result.user).toEqual({
        id: foundUser.id,
        email: foundUser.email,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        role: foundUser.role
      });

      expect(result.token).toBe('mocked-jwt-token');
    });

    it('deve lançar erro se o usuário não existir', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('deve lançar erro se a senha for inválida', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(foundUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });
  });
});
