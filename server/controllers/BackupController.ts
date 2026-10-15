import { Request, Response } from 'express';
import { SyncModel } from '../models/Sync';
import { ResponseView } from '../views/responseView';

export class BackupController {
  static async exportBackup(_req: Request, res: Response) {
    try {
      const dump = SyncModel.getFullBackup();
      const date = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dukaankhata-cloud-backup-${date}.json"`);
      return res.json(dump);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async restoreBackup(req: Request, res: Response) {
    try {
      const { data } = req.body;

      if (!data || typeof data !== 'object') {
        return ResponseView.error(res, 'A valid JSON data backup payload is required', 400);
      }

      if (!Array.isArray(data.customers) && !Array.isArray(data.inventory)) {
        return ResponseView.error(res, 'Backup payload must contain "customers" or "inventory" data', 400);
      }

      SyncModel.restoreBackup(data);
      return ResponseView.success(res, null, 'Database backup restored successfully');
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }
}