import { Router } from 'express';
import customerRoutes from './customerRoutes';
import transactionRoutes from './transactionRoutes';
import inventoryRoutes from './inventoryRoutes';
import vendorRoutes from './vendorRoutes';
import registerRoutes from './registerRoutes';
import syncRoutes from './syncRoutes';
import backupRoutes from './backupRoutes';
import healthRoutes from './healthRoutes';

const apiRouter = Router();

apiRouter.use('/customers', customerRoutes);
apiRouter.use('/transactions', transactionRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/vendors', vendorRoutes);
apiRouter.use('/registers', registerRoutes);
apiRouter.use('/sync', syncRoutes);
apiRouter.use('/pull', syncRoutes);
apiRouter.use('/backup', backupRoutes);
apiRouter.use('/health', healthRoutes);

export default apiRouter;
