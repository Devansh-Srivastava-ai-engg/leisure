import { Router } from 'express';
import { RegisterController } from '../controllers/RegisterController';

const router = Router();

router.get('/today', RegisterController.getToday);
router.get('/', RegisterController.getHistory);
router.post('/close', RegisterController.closeToday);

export default router;
