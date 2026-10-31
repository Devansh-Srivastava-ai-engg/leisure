import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All inventory endpoints require a valid JWT
router.use(requireAuth);

router.get('/',           InventoryController.getAll);
router.get('/:id',        InventoryController.getById);
router.post('/',          InventoryController.create);
router.put('/:id/stock',  InventoryController.updateStock);

export default router;
