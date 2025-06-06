import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { LoginRequest, RegisterRequest } from '../types/auth';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data: RegisterRequest = req.body;
      const result = await authService.register(data);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data: LoginRequest = req.body;
      const result = await authService.login(data);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true
        }
      });

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response) {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { firstName, lastName, email } = req.body;
      
      // Check if email is being changed and if it already exists
      if (email) {
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });
        
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Email already exists');
        }
      }
      
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email && { email })
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true
        }
      });
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      
      // Cancel all user's reservations before deleting
      await prisma.reservation.updateMany({
        where: { 
          userId,
          status: 'CONFIRMED'
        },
        data: { status: 'CANCELED' }
      });
      
      // Update available spots for events
      const userReservations = await prisma.reservation.findMany({
        where: { userId, status: 'CANCELED' },
        select: { eventId: true }
      });
      
      for (const reservation of userReservations) {
        await prisma.event.update({
          where: { id: reservation.eventId },
          data: {
            availableSpots: {
              increment: 1
            }
          }
        });
      }
      
      // Delete user
      await prisma.user.delete({
        where: { id: userId }
      });
      
      res.json({
        success: true,
        message: 'Profile deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}