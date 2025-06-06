import prisma from '../config/database';
import { CreateReservationRequest } from '../types/reservation';
import { SocketHandler } from '../sockets/socketHandler';
import { Server } from 'http';
import { ReservationStatus } from '@prisma/client';

// Singleton para o SocketHandler
let socketHandlerInstance: SocketHandler | null = null;

export const initSocketHandler = (server: Server) => {
  socketHandlerInstance = new SocketHandler(server);
  return socketHandlerInstance;
};

export const getSocketHandler = (): SocketHandler | null => {
  return socketHandlerInstance;
};

export class ReservationService {
  [x: string]: any;
  async createReservation(data: CreateReservationRequest, userId: string) {
    const { eventId } = data;

    // Check if event exists and has available spots
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.availableSpots <= 0) {
      throw new Error('No available spots for this event');
    }

    // Check if user already has a reservation for this event
    const existingReservation = await prisma.reservation.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });

    if (existingReservation && existingReservation.status === 'CONFIRMED') {
      throw new Error('You already have a reservation for this event');
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create or update reservation
      const reservation = await tx.reservation.upsert({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        },
        update: {
          status: 'CONFIRMED',
          reservationDate: new Date()
        },
        create: {
          eventId,
          userId,
          status: 'CONFIRMED'
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              eventDate: true,
              location: true,
              onlineLink: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Decrement available spots
      const updatedEvent = await tx.event.update({
        where: { id: eventId },
        data: {
          availableSpots: {
            decrement: 1
          }
        }
      });

      return { reservation, updatedEvent };
    });

    // Send real-time notifications
    const socketHandler = getSocketHandler();
    if (socketHandler) {
      // Notify user about reservation confirmation
      socketHandler.notifyReservationConfirmed(userId, {
        reservation: result.reservation,
        event: result.reservation.event
      });

      // Check if spots are running low (less than 10% available)
      if (result.updatedEvent.availableSpots > 0 && 
          result.updatedEvent.availableSpots <= result.updatedEvent.maxCapacity * 0.1) {
        socketHandler.notifyLowSpots(
          eventId, 
          result.updatedEvent.availableSpots
        );
      }

      // Check if event is sold out
      if (result.updatedEvent.availableSpots === 0) {
        socketHandler.notifyEventSoldOut(eventId);
      }
    }

    return result.reservation;
  }

  async cancelReservation(reservationId: string, userId: string) {
    // Find the reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { event: true, user: true }
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Check if user owns the reservation or is admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (reservation.userId !== userId && user?.role !== 'ADMIN') {
      throw new Error('Not authorized to cancel this reservation');
    }

    if (reservation.status === 'CANCELED') {
      throw new Error('Reservation is already canceled');
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update reservation status
      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELED' },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              eventDate: true,
              location: true,
              onlineLink: true
            }
          }
        }
      });

      // Increment available spots
      const updatedEvent = await tx.event.update({
        where: { id: reservation.eventId },
        data: {
          availableSpots: {
            increment: 1
          }
        }
      });

      return { updatedReservation, updatedEvent };
    });

    // Send real-time notification
    const socketHandler = getSocketHandler();
    if (socketHandler) {
      socketHandler.notifyReservationCanceled(reservation.userId, {
        reservation: result.updatedReservation,
        event: result.updatedReservation.event
      });

      // Notify about event update if it was previously sold out
      if (result.updatedEvent.availableSpots === 1) {
        socketHandler.notifyEventUpdate(reservation.eventId, {
          availableSpots: result.updatedEvent.availableSpots,
          status: 'SPOTS_AVAILABLE'
        });
      }
    }

    return result.updatedReservation;
  }

  async getUserReservations(userId: string) {
    const reservations = await prisma.reservation.findMany({
      where: {
        userId,
        status: 'CONFIRMED'
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            description: true,
            eventDate: true,
            location: true,
            onlineLink: true,
            maxCapacity: true,
            availableSpots: true
          }
        }
      },
      orderBy: {
        reservationDate: 'desc'
      }
    });

    return reservations;
  }

  async getEventReservations(eventId: string) {
    const reservations = await prisma.reservation.findMany({
      where: {
        eventId,
        status: 'CONFIRMED'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        reservationDate: 'asc'
      }
    });

    return reservations;
  }

  async adminUpdateReservation(reservationId: string, data: { status?: ReservationStatus }) {
    const { status } = data;
    
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { event: true, user: true }
    });
    
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    
    // Handle status change
    if (status && status !== reservation.status) {
      if (status === 'CANCELED' && reservation.status === 'CONFIRMED') {
        // Increment available spots
        await prisma.event.update({
          where: { id: reservation.eventId },
          data: { availableSpots: { increment: 1 } }
        });
      } else if (status === 'CONFIRMED' && reservation.status === 'CANCELED') {
        // Check if spots are available
        const event = await prisma.event.findUnique({
          where: { id: reservation.eventId }
        });
        
        if (!event || event.availableSpots <= 0) {
          throw new Error('No available spots for this event');
        }
        
        // Decrement available spots
        await prisma.event.update({
          where: { id: reservation.eventId },
          data: { availableSpots: { decrement: 1 } }
        });
      }
    }
    
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        ...(status && { status })
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            location: true,
            onlineLink: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    return updatedReservation;
  }

  async adminGetAllReservations(filters: {
    page: number;
    limit: number;
    status?: string;
    eventId?: string;
    userId?: string;
  }) {
    const { page, limit, status, eventId, userId } = filters;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (status) where.status = status;
    if (eventId) where.eventId = eventId;
    if (userId) where.userId = userId;
    
    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              eventDate: true,
              location: true,
              onlineLink: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.reservation.count({ where })
    ]);
    
    return {
      reservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}