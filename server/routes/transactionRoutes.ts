import { Router } from 'express';
import { TransactionController } from '../controllers/TransactionController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All transaction endpoints require a valid JWT
router.use(requireAuth);

router.get('/',  TransactionController.getAll);
router.post('/', TransactionController.create);

export default router;
