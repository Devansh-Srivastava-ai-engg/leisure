import { Router } from 'express';
import { SyncController } from '../controllers/SyncController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Protect all sync endpoints with requireAuth
router.use(requireAuth);

router.post('/', SyncController.push);
router.post('/push', SyncController.push);
router.get('/', SyncController.pull);
router.get('/pull', SyncController.pull);

export default router;
