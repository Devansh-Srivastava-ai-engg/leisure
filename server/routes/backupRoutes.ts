import { Router } from 'express';
import express from 'express';
import { BackupController } from '../controllers/BackupController';
import { requireAdminSecret } from '../middleware/auth';

const router = Router();

// 1. Exporting backup requires the admin secret
router.get('/', requireAdminSecret, BackupController.exportBackup);

// 2. Restoring backup requires the admin secret + allows payloads up to 5MB
router.post(
  '/restore',
  requireAdminSecret,
  express.json({ limit: '5mb' }),
  BackupController.restoreBackup
);

export default router;