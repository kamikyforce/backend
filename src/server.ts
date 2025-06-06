import { createServer } from 'http';
import app from './app';
import { SocketHandler } from './sockets/socketHandler';
import prisma from './config/database';
import redisClient from './config/redis';
import { initSocketHandler } from './services/reservationService';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0'; // Add this line

const server = createServer(app);

const socketHandler = initSocketHandler(server);

async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL database');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

async function connectRedis() {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Redis connection error:', error);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

async function startServer() {
  await connectDatabase();
  await connectRedis();
  
  // Update the server.listen call at the end of the file
  server.listen(PORT, HOST, async () => {
    await connectDatabase();
    await connectRedis();
    console.log(`Server running on ${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});