import { Router } from 'express';
import { CustomerController } from '../controllers/CustomerController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All customer endpoints require a valid JWT
router.use(requireAuth);

router.get('/',     CustomerController.getAll);
router.get('/:id',  CustomerController.getById);
router.post('/',    CustomerController.create);
router.put('/:id',  CustomerController.update);
router.delete('/:id', CustomerController.delete);

export default router;
