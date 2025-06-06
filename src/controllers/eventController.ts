import { Request, Response, NextFunction } from 'express';
import { EventService } from '../services/eventService';
import { CreateEventRequest, UpdateEventRequest, EventFilters } from '../types/event';
import { AuthRequest } from '../middleware/auth';

const eventService = new EventService();

export class EventController {
  async createEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data: CreateEventRequest = req.body;
      const creatorId = req.user!.id;
      
      const event = await eventService.createEvent(data, creatorId);
      
      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
      });
    } catch (error) {
      next(error);
    }
  }

  async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: EventFilters = {
        search: req.query.search as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        location: req.query.location as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };
      
      const result = await eventService.getEvents(filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const event = await eventService.getEventById(id);
      
      res.json({
        success: true,
        data: event
      });
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data: UpdateEventRequest = req.body;
      const userId = req.user!.id;
      
      const event = await eventService.updateEvent(id, data, userId);
      
      res.json({
        success: true,
        message: 'Event updated successfully',
        data: event
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const result = await eventService.deleteEvent(id, userId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}