import { Router } from 'express';
import { TransactionController } from '../controllers/TransactionController';

const router = Router();

router.get('/', TransactionController.getAll);
router.post('/', TransactionController.create);

export default router;
