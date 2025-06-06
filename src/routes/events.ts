import { Router } from 'express';
import { EventController } from '../controllers/eventController';
import { validateRequest, createEventSchema, updateEventSchema } from '../middleware/validation';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();
const eventController = new EventController();

router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);
router.post('/', authenticateToken, requireAdmin, validateRequest(createEventSchema), eventController.createEvent);
router.put('/:id', authenticateToken, requireAdmin, validateRequest(updateEventSchema), eventController.updateEvent);
router.delete('/:id', authenticateToken, requireAdmin, eventController.deleteEvent);

export default router;