import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN'
    }
  });

  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      firstName: 'Regular',
      lastName: 'User',
      role: 'USER'
    }
  });

  const events = [
    {
      name: 'Tech Conference 2024',
      description: 'Annual technology conference featuring the latest trends in software development.',
      eventDate: new Date('2024-06-15T09:00:00Z'),
      location: 'San Francisco Convention Center',
      maxCapacity: 500,
      availableSpots: 500,
      creatorId: admin.id
    },
    {
      name: 'Online Workshop: React Best Practices',
      description: 'Learn the best practices for React development in this interactive workshop.',
      eventDate: new Date('2024-05-20T14:00:00Z'),
      onlineLink: 'https://zoom.us/j/123456789',
      maxCapacity: 100,
      availableSpots: 100,
      creatorId: admin.id
    },
    {
      name: 'Startup Networking Event',
      description: 'Connect with fellow entrepreneurs and investors in the startup ecosystem.',
      eventDate: new Date('2024-04-25T18:00:00Z'),
      location: 'WeWork Downtown',
      maxCapacity: 50,
      availableSpots: 50,
      creatorId: admin.id
    }
  ];

  for (const eventData of events) {
    await prisma.event.upsert({
      where: {
        name: eventData.name
      } as any,
      update: {},
      create: eventData
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
