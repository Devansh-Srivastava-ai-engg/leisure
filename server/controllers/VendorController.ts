import { Response } from 'express';
import { VendorModel } from '../models/Vendor';
import { ResponseView } from '../views/responseView';
import { type AuthenticatedRequest } from '../middleware/auth';

export class VendorController {
  static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const vendors = VendorModel.findAll(req.userId!);
      return ResponseView.collection(res, vendors);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, company, phone, balanceOwed } = req.body;
      if (!name) {
        return ResponseView.error(res, 'Supplier name is required', 400);
      }
      const created = VendorModel.create({
        user_id: req.userId!,
        name,
        company,
        phone,
        balance_owed: Number(balanceOwed) || 0,
      });
      return ResponseView.success(res, created, 'Supplier added successfully', 201);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async recordTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { vendorId, type, amount, note } = req.body;
      if (!vendorId || !type || !amount) {
        return ResponseView.error(res, 'vendorId, type, and amount are required', 400);
      }
      const result = VendorModel.recordTransaction({
        vendorId,
        userId: req.userId!,
        type,
        amount: Number(amount),
        note,
      });
      return ResponseView.success(res, result, 'Supplier transaction recorded', 201);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }
}
