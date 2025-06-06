import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import redisClient from '../config/redis';
import { generateICalEvent, generateGoogleCalendarUrl } from '../utils/calendarUtils';

export class ReportController {
  async getEventOccupancy(req: Request, res: Response, next: NextFunction) {
    try {
      const cacheKey = 'report:event-occupancy';
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        return res.json({
          success: true,
          cached: true,
          data: JSON.parse(cachedData)
        });
      }
      
      const events = await prisma.event.findMany({
        select: {
          id: true,
          name: true,
          eventDate: true,
          maxCapacity: true,
          availableSpots: true,
          _count: {
            select: {
              reservations: {
                where: {
                  status: 'CONFIRMED'
                }
              }
            }
          }
        },
        orderBy: {
          eventDate: 'asc'
        }
      });
      
      const reportData = events.map(event => ({
        id: event.id,
        name: event.name,
        eventDate: event.eventDate,
        maxCapacity: event.maxCapacity,
        reservedSpots: event._count.reservations,
        availableSpots: event.availableSpots,
        occupancyRate: Math.round((event._count.reservations / event.maxCapacity) * 100)
      }));
      
      await redisClient.set(cacheKey, JSON.stringify(reportData), {
        EX: 300
      });
      
      res.json({
        success: true,
        cached: false,
        data: reportData
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getEventStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id;
      
      
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          name: true,
          eventDate: true,
          maxCapacity: true,
          availableSpots: true,
          _count: {
            select: {
              reservations: {
                where: {
                  status: 'CONFIRMED'
                }
              }
            }
          }
        }
      });
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      // Calculate statistics
      const stats = {
        id: event.id,
        name: event.name,
        eventDate: event.eventDate,
        maxCapacity: event.maxCapacity,
        reservedSpots: event._count.reservations,
        availableSpots: event.availableSpots,
        occupancyRate: Math.round((event._count.reservations / event.maxCapacity) * 100)
      };
      
      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getEventCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id;
      const format = req.query.format as string || 'ical';
      
      // Get event details
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          name: true,
          description: true,
          eventDate: true,
          location: true,
          onlineLink: true
        }
      });
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      if (format === 'google') {
        // Generate Google Calendar URL
        const googleUrl = generateGoogleCalendarUrl({
          name: event.name,
          description: event.description,
          eventDate: event.eventDate,
          location: event.location,
          onlineLink: event.onlineLink
        });
        
        return res.json({
          success: true,
          data: {
            type: 'google_calendar_url',
            url: googleUrl,
            event: {
              id: event.id,
              name: event.name,
              eventDate: event.eventDate
            }
          }
        });
      } else if (format === 'ical') {
        // Generate iCal file
        const icalData = await generateICalEvent({
          id: event.id,
          name: event.name,
          description: event.description,
          eventDate: event.eventDate,
          location: event.location,
          onlineLink: event.onlineLink
        });
        
        // Set appropriate headers for iCal download
        res.setHeader('Content-Type', 'text/calendar');
        res.setHeader('Content-Disposition', `attachment; filename="${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`);
        
        return res.send(icalData);
      } else {
        // Return both options
        const googleUrl = generateGoogleCalendarUrl({
          name: event.name,
          description: event.description,
          eventDate: event.eventDate,
          location: event.location,
          onlineLink: event.onlineLink
        });
        
        return res.json({
          success: true,
          data: {
            event: {
              id: event.id,
              name: event.name,
              description: event.description,
              eventDate: event.eventDate,
              location: event.location,
              onlineLink: event.onlineLink
            },
            calendar_options: {
              google_calendar_url: googleUrl,
              ical_download_url: `${req.protocol}://${req.get('host')}/api/admin/reports/events/${eventId}/calendar?format=ical`
            }
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }
}