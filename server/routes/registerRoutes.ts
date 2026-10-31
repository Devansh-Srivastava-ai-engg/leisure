import { Router } from 'express';
import { RegisterController } from '../controllers/RegisterController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All register endpoints require a valid JWT
router.use(requireAuth);

router.get('/today',  RegisterController.getToday);
router.get('/',       RegisterController.getHistory);
router.post('/close', RegisterController.closeToday);

export default router;
