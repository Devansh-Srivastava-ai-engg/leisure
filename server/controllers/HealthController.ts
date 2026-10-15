import { Request, Response } from 'express';
import { CustomerModel } from '../models/Customer';
import { TransactionModel } from '../models/Transaction';
import { InventoryModel } from '../models/Inventory';
import { VendorModel } from '../models/Vendor';
import { SyncModel } from '../models/Sync';
import { renderDashboardHtml } from '../views/dashboardView';

export class HealthController {
  static async getHealth(_req: Request, res: Response) {
    try {
      const stats = {
        status: 'healthy',
        architecture: 'MVC (Model-View-Controller)',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          engine: 'SQLite (WAL Mode)',
          customers: CustomerModel.count(),
          transactions: TransactionModel.count(),
          inventory: InventoryModel.count(),
          vendors: VendorModel.count(),
          syncEventsLogged: SyncModel.auditLogCount(),
        },
      };
      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ status: 'unhealthy', error: err.message });
    }
  }

  static async getDashboard(_req: Request, res: Response) {
    try {
      const metrics = {
        uptime: Math.floor(process.uptime()),
        customers: CustomerModel.count(),
        transactions: TransactionModel.count(),
        inventory: InventoryModel.count(),
        vendors: VendorModel.count(),
        syncEvents: SyncModel.auditLogCount(),
      };
      const html = renderDashboardHtml(metrics);
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (err: any) {
      return res.status(500).send(`<h1>Error</h1><p>${err.message}</p>`);
    }
  }
}
