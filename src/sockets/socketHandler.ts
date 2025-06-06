import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { JwtPayload } from '../types/auth';

export class SocketHandler {
  private io: SocketIOServer;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
        socket.data.user = decoded;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.data.user.userId} connected`);

      socket.join(`user:${socket.data.user.userId}`);

      socket.on('join-event', (eventId: string) => {
        socket.join(`event:${eventId}`);
      });

      socket.on('leave-event', (eventId: string) => {
        socket.leave(`event:${eventId}`);
      });

      socket.on('disconnect', () => {
        console.log(`User ${socket.data.user.userId} disconnected`);
      });
    });
  }

  notifyEventUpdate(eventId: string, data: any) {
    this.io.to(`event:${eventId}`).emit('event-updated', data);
  }

  notifyReservationConfirmed(userId: string, data: any) {
    this.io.to(`user:${userId}`).emit('reservation-confirmed', data);
  }

  notifyReservationCanceled(userId: string, data: any) {
    this.io.to(`user:${userId}`).emit('reservation-canceled', data);
  }

  notifyLowSpots(eventId: string, availableSpots: number) {
    this.io.to(`event:${eventId}`).emit('low-spots', { eventId, availableSpots });
  }

  notifyEventSoldOut(eventId: string) {
    this.io.to(`event:${eventId}`).emit('event-sold-out', { eventId });
  }
}