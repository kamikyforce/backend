import { EventService } from '../../../src/services/eventService';
import prisma from '../../../src/config/database';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  event: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
}));

describe('EventService', () => {
  let eventService: EventService;
  
  beforeEach(() => {
    eventService = new EventService();
    jest.clearAllMocks();
  });
  
  describe('createEvent', () => {
    it('should create an event successfully', async () => {
      // Arrange
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        eventDate: '2023-12-31T23:59:59Z',
        location: 'Test Location',
        maxCapacity: 100
      };
      
      const creatorId = 'user123';
      const createdEvent = {
        id: 'event123',
        ...eventData,
        eventDate: new Date(eventData.eventDate),
        creatorId,
        availableSpots: eventData.maxCapacity,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      (prisma.event.create as jest.Mock).mockResolvedValue(createdEvent);
      
      // Act
      const result = await eventService.createEvent(eventData, creatorId);
      
      // Assert
      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          name: eventData.name,
          description: eventData.description,
          eventDate: expect.any(Date),
          location: eventData.location,
          maxCapacity: eventData.maxCapacity,
          availableSpots: eventData.maxCapacity,
          creatorId: creatorId
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
      expect(result).toEqual(createdEvent);
    });
  });
});