import { Router } from 'express';
import { VendorController } from '../controllers/VendorController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All vendor endpoints require a valid JWT
router.use(requireAuth);

router.get('/',                  VendorController.getAll);
router.post('/',                 VendorController.create);
router.post('/transactions',     VendorController.recordTransaction);

export default router;
