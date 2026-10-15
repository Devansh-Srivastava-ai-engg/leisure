import { Request, Response } from 'express';
import { CustomerModel } from '../models/Customer';
import { TransactionModel } from '../models/Transaction';
import { ResponseView } from '../views/responseView';

export class CustomerController {
  static async getAll(req: Request, res: Response) {
    try {
      const search = req.query.search as string | undefined;
      const customers = CustomerModel.findAll(search);
      return ResponseView.collection(res, customers);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const customer = CustomerModel.findById(req.params.id);
      if (!customer) {
        return ResponseView.error(res, 'Customer not found', 404);
      }
      const transactions = TransactionModel.findByCustomerId(req.params.id);
      return ResponseView.success(res, { ...customer, transactions });
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async create(req: Request, res: Response) {
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
      });
      return ResponseView.success(res, created, 'Customer created successfully', 201);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { name, phone, balance, creditLimit, isPinned, notes } = req.body;
      const updated = CustomerModel.update(req.params.id, {
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

  static async delete(req: Request, res: Response) {
    try {
      const deleted = CustomerModel.delete(req.params.id);
      if (!deleted) {
        return ResponseView.error(res, 'Customer not found', 404);
      }
      return ResponseView.success(res, { id: req.params.id }, 'Customer deleted successfully');
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }
}
