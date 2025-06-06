import prisma from '../config/database';
import { CreateEventRequest, UpdateEventRequest, EventFilters } from '../types/event';
import redisClient from '../config/redis';

export class EventService {
  async createEvent(data: CreateEventRequest, creatorId: string) {
    const event = await prisma.event.create({
      data: {
        ...data,
        eventDate: new Date(data.eventDate),
        availableSpots: data.maxCapacity,
        creatorId
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
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

    // Clear events cache
    await this.clearEventsCache();

    return event;
  }

  async getEvents(filters: EventFilters) {
    const {
      search,
      startDate,
      endDate,
      location,
      page = 1,
      limit = 10
    } = filters;

    const skip = (page - 1) * limit;
    const cacheKey = `events:${JSON.stringify(filters)}`;

    // Try to get from cache
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Redis error:', error);
    }

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (startDate || endDate) {
      where.eventDate = {};
      if (startDate) where.eventDate.gte = new Date(startDate);
      if (endDate) where.eventDate.lte = new Date(endDate);
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { eventDate: 'asc' },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
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
      }),
      prisma.event.count({ where })
    ]);

    const result = {
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    // Cache the result
    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(result)); // 5 minutes
    } catch (error) {
      console.error('Redis error:', error);
    }

    return result;
  }

  async getEventById(id: string) {
    const cacheKey = `event:${id}`;

    // Try to get from cache
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Redis error:', error);
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
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
      throw new Error('Event not found');
    }

    // Cache the result
    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(event)); // 5 minutes
    } catch (error) {
      console.error('Redis error:', error);
    }

    return event;
  }

  async updateEvent(id: string, data: UpdateEventRequest, userId: string) {
    // Check if event exists and user is the creator or admin
    const event = await prisma.event.findUnique({
      where: { id },
      include: { creator: true }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (event.creatorId !== userId && user?.role !== 'ADMIN') {
      throw new Error('Not authorized to update this event');
    }

    const updateData: any = { ...data };
    if (data.eventDate) {
      updateData.eventDate = new Date(data.eventDate);
    }

    // If maxCapacity is being updated, recalculate availableSpots
    if (data.maxCapacity) {
      const confirmedReservations = await prisma.reservation.count({
        where: {
          eventId: id,
          status: 'CONFIRMED'
        }
      });
      updateData.availableSpots = data.maxCapacity - confirmedReservations;
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
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

    // Clear cache
    await this.clearEventCache(id);
    await this.clearEventsCache();

    return updatedEvent;
  }

  async deleteEvent(id: string, userId: string) {
    // Check if event exists and user is the creator or admin
    const event = await prisma.event.findUnique({
      where: { id },
      include: { creator: true }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (event.creatorId !== userId && user?.role !== 'ADMIN') {
      throw new Error('Not authorized to delete this event');
    }

    await prisma.event.delete({ where: { id } });

    // Clear cache
    await this.clearEventCache(id);
    await this.clearEventsCache();

    return { message: 'Event deleted successfully' };
  }

  private async clearEventCache(eventId: string) {
    try {
      await redisClient.del(`event:${eventId}`);
    } catch (error) {
      console.error('Redis error:', error);
    }
  }

  private async clearEventsCache() {
    try {
      const keys = await redisClient.keys('events:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error('Redis error:', error);
    }
  }
}