import { Router } from 'express';
import { VendorController } from '../controllers/VendorController';

const router = Router();

router.get('/', VendorController.getAll);
router.post('/', VendorController.create);
router.post('/transactions', VendorController.recordTransaction);

export default router;
