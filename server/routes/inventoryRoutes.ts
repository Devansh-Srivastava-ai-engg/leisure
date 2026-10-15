import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';

const router = Router();

router.get('/', InventoryController.getAll);
router.get('/:id', InventoryController.getById);
router.post('/', InventoryController.create);
router.put('/:id/stock', InventoryController.updateStock);

export default router;
