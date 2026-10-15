import { Request, Response } from 'express';
import { VendorModel } from '../models/Vendor';
import { ResponseView } from '../views/responseView';

export class VendorController {
  static async getAll(_req: Request, res: Response) {
    try {
      const vendors = VendorModel.findAll();
      return ResponseView.collection(res, vendors);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name, company, phone, balanceOwed } = req.body;
      if (!name) {
        return ResponseView.error(res, 'Supplier name is required', 400);
      }
      const created = VendorModel.create({
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

  static async recordTransaction(req: Request, res: Response) {
    try {
      const { vendorId, type, amount, note } = req.body;
      if (!vendorId || !type || !amount) {
        return ResponseView.error(res, 'vendorId, type, and amount are required', 400);
      }
      const result = VendorModel.recordTransaction({
        vendorId,
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
