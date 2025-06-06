import { createServer } from 'http';
import app from './app';
import { SocketHandler } from './sockets/socketHandler';
import prisma from './config/database';
import redisClient from './config/redis';
import { initSocketHandler } from './services/reservationService';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const server = createServer(app);
let socketHandler: any;

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
    // Check if Redis is already connected
    if (redisClient.isOpen) {
      console.log('Redis already connected');
      return;
    }
    
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Redis connection error:', error);
    // Don't exit process for Redis errors, continue without Redis
  }
}

async function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  
  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  try {
    // Disconnect from database
    await prisma.$disconnect();
    console.log('Database disconnected');
    
    // Disconnect from Redis if connected
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('Redis disconnected');
    }
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

async function startServer() {
  try {
    // Connect to database first
    await connectDatabase();
    
    // Connect to Redis (non-blocking)
    await connectRedis();
    
    // Initialize socket handler after connections are established
    socketHandler = initSocketHandler(server);
    
    // Start the server
    server.listen(PORT, HOST, () => {
      console.log(`Server running on ${HOST}:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Server started successfully');
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error('Server startup error:', error);
  process.exit(1);
});