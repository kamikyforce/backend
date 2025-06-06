import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();
const reportController = new ReportController();

router.get('/occupancy', authenticateToken, requireAdmin, reportController.getEventOccupancy);

router.get('/events/:id/stats', authenticateToken, requireAdmin, reportController.getEventStatistics);

router.get('/events/:id/calendar', authenticateToken, requireAdmin, reportController.getEventCalendar);

export default router;
