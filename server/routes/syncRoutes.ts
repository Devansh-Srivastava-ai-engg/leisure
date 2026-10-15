import { Router } from 'express';
import { SyncController } from '../controllers/SyncController';

const router = Router();

router.post('/', SyncController.push);
router.get('/', SyncController.pull);
router.get('/pull', SyncController.pull);

export default router;
