import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import reservationRoutes from './routes/reservations';
import reportRoutes from './routes/reports';

import { errorHandler, notFound } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';

dotenv.config();

const app = express();

app.use(helmet());

// Comprehensive CORS configuration for ALL possible frontend URLs
const allowedOrigins = [
  // All known Vercel deployment URLs
  'https://frontend-three-psi-36.vercel.app',
  'https://frontend-gmmzyb6e7-micaelzs-projects.vercel.app',
  'https://frontend-5lyprauwd-micaelzs-projects.vercel.app',
  'https://frontend-8phdz9lbo-micaelzs-projects.vercel.app',
  'https://frontend-mdjsd9nc8-micaelzs-projects.vercel.app',
  
  // Local development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  
  // Environment variable
  process.env.FRONTEND_URL,
  
  // Additional Vercel patterns (if you have custom domains)
  process.env.CUSTOM_DOMAIN,
].filter(Boolean);

// Function to check if origin matches Vercel patterns
const isVercelDomain = (origin: string): boolean => {
  const vercelPatterns = [
    /^https:\/\/frontend-[a-z0-9]+-micaelzs-projects\.vercel\.app$/,
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
    /^https:\/\/frontend-[a-z0-9-]+\.vercel\.app$/,
  ];
  
  return vercelPatterns.some(pattern => pattern.test(origin));
};

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check if origin matches Vercel domain patterns
    if (isVercelDomain(origin)) {
      return callback(null, true);
    }
    
    // For development: allow localhost with any port
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.log(`CORS rejected origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
}));

app.use(generalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Add this line for Fly.io health checks
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', reservationRoutes);
app.use('/api/admin/reports', reportRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
