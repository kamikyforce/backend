import { Router } from 'express';
import { ReservationController } from '../controllers/reservationController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest, adminUpdateReservationSchema } from '../middleware/validation';

const router = Router();
const reservationController = new ReservationController();

router.post('/events/:id/reserve', authenticateToken, reservationController.createReservation);
router.delete('/reservations/:id', authenticateToken, reservationController.cancelReservation);
router.get('/my-reservations', authenticateToken, reservationController.getUserReservations);

router.get('/events/:id/reservations', authenticateToken, requireAdmin, reservationController.getEventReservations);
router.get('/reservations/:id/calendar', authenticateToken, reservationController.getReservationCalendar);

// Admin routes
router.get('/admin/reservations', authenticateToken, requireAdmin, reservationController.adminGetAllReservations);
router.put('/admin/reservations/:id', authenticateToken, requireAdmin, validateRequest(adminUpdateReservationSchema), reservationController.adminUpdateReservation);

export default router;