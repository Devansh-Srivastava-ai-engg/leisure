import { Response } from 'express';
import { CustomerModel } from '../models/Customer';
import { TransactionModel } from '../models/Transaction';
import { ResponseView } from '../views/responseView';
import { type AuthenticatedRequest } from '../middleware/auth';

export class CustomerController {
  static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const search = req.query.search as string | undefined;
      const customers = CustomerModel.findAll(req.userId!, search);
      return ResponseView.collection(res, customers);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const customer = CustomerModel.findById(req.params.id, req.userId!);
      if (!customer) {
        return ResponseView.error(res, 'Customer not found', 404);
      }
      const transactions = TransactionModel.findByCustomerId(req.params.id, req.userId!);
      return ResponseView.success(res, { ...customer, transactions });
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, phone, balance, creditLimit, isPinned, notes } = req.body;
      if (!name) {
        return ResponseView.error(res, 'Customer name is required', 400);
      }
      const created = CustomerModel.create({
        name,
        phone,
        balance,
        credit_limit: creditLimit,
        is_pinned: isPinned,
        notes,
        user_id: req.userId!,
      });
      return ResponseView.success(res, created, 'Customer created successfully', 201);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, phone, balance, creditLimit, isPinned, notes } = req.body;
      const updated = CustomerModel.update(req.params.id, req.userId!, {
        name,
        phone,
        balance,
        credit_limit: creditLimit,
        is_pinned: isPinned,
        notes,
      });
      if (!updated) {
        return ResponseView.error(res, 'Customer not found', 404);
      }
      return ResponseView.success(res, updated, 'Customer updated successfully');
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const deleted = CustomerModel.delete(req.params.id, req.userId!);
      if (!deleted) {
        return ResponseView.error(res, 'Customer not found', 404);
      }
      return ResponseView.success(res, { id: req.params.id }, 'Customer deleted successfully');
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }
}
