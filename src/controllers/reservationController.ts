import { Request, Response, NextFunction } from 'express';
import { ReservationService } from '../services/reservationService';
import { CreateReservationRequest } from '../types/reservation';
import { AuthRequest } from '../middleware/auth';
import { ReservationStatus } from '@prisma/client';
import prisma from '../config/database';

const reservationService = new ReservationService();

export class ReservationController {
  async createReservation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id: eventId } = req.params;
      const userId = req.user!.id;
      
      const reservation = await reservationService.createReservation(
        { eventId },
        userId
      );
      
      res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        data: reservation
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelReservation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const reservation = await reservationService.cancelReservation(id, userId);
      
      res.json({
        success: true,
        message: 'Reservation canceled successfully',
        data: reservation
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserReservations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const reservations = await reservationService.getUserReservations(userId);
      
      res.json({
        success: true,
        data: reservations
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventReservations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const reservations = await reservationService.getEventReservations(id);
      
      res.json({
        success: true,
        data: reservations
      });
    } catch (error) {
      next(error);
    }
  }

  // Add this method to the ReservationController class
  
  async getReservationCalendar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      // Find the reservation
      const reservation = await prisma.reservation.findUnique({
        where: { id },
        include: {
          event: true
        }
      });
      
      if (!reservation) {
        throw new Error('Reservation not found');
      }
      
      // Check if user owns the reservation or is admin
      if (reservation.userId !== userId && req.user!.role !== 'ADMIN') {
        throw new Error('Not authorized to access this reservation');
      }
      
      if (reservation.status !== 'CONFIRMED') {
        throw new Error('Cannot generate calendar for canceled reservations');
      }
      
      // Generate iCal
      const { generateICalEvent, generateGoogleCalendarUrl } = require('../utils/calendarUtils');
      const icalContent = await generateICalEvent(reservation.event);
      const googleCalendarUrl = generateGoogleCalendarUrl(reservation.event);
      
      res.json({
        success: true,
        data: {
          icalContent,
          googleCalendarUrl,
          event: reservation.event
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async adminUpdateReservation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const reservation = await reservationService.adminUpdateReservation(id, {
        status: status as ReservationStatus
      });
      
      res.json({
        success: true,
        message: 'Reservation updated successfully',
        data: reservation
      });
    } catch (error) {
      next(error);
    }
  }

  async adminGetAllReservations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, status, eventId, userId } = req.query;
      
      const reservations = await reservationService.adminGetAllReservations({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        eventId: eventId as string,
        userId: userId as string
      });
      
      res.json({
        success: true,
        data: reservations
      });
    } catch (error) {
      next(error);
    }
  }
}