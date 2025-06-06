import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import {
  validateRequest,
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', authLimiter, validateRequest(registerSchema), authController.register);
router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);

// Protected routes
router.get('/me', authenticateToken, authController.getMe);
router.put('/me', authenticateToken, validateRequest(updateProfileSchema), authController.updateProfile);
router.delete('/me', authenticateToken, authController.deleteProfile);
router.post('/logout', authenticateToken, authController.logout);

export default router;
