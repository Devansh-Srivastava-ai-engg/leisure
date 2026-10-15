import { Request, Response } from 'express';
import { TransactionModel } from '../models/Transaction';
import { ResponseView } from '../views/responseView';

// Allowed Enums
const ALLOWED_TYPES = new Set(['UDHAR', 'JAMA', 'CREDIT_GIVEN', 'PAYMENT_RECEIVED']);
const ALLOWED_PAYMENT_METHODS = new Set(['CASH', 'UPI', 'ONLINE']);

export class TransactionController {
  static async getAll(req: Request, res: Response) {
    try {
      const { customerId, type, limit, offset } = req.query;

      // Bound pagination to prevent memory exhaustion (DoS)
      const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
      const parsedOffset = Math.max(Number(offset) || 0, 0);

      const transactions = TransactionModel.findAll({
        customerId: typeof customerId === 'string' ? customerId.trim() : undefined,
        type: typeof type === 'string' && ALLOWED_TYPES.has(type.toUpperCase()) ? type.toUpperCase() : undefined,
        limit: parsedLimit,
        offset: parsedOffset,
      });

      return ResponseView.collection(res, transactions);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { customerId, customerName, type, amount, note, items, paymentMethod } = req.body;

      // 1. Validate required presence
      if (!type || amount === undefined || amount === null) {
        return ResponseView.error(res, 'Transaction type and amount are required', 400);
      }

      // 2. Validate Amount (must be positive finite number, <= 5,00,000)
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 500000) {
        return ResponseView.error(res, 'Invalid amount: must be a positive number up to ₹5,00,000', 400);
      }

      // 3. Validate Type
      const normalizedType = String(type).toUpperCase();
      if (!ALLOWED_TYPES.has(normalizedType)) {
        return ResponseView.error(res, `Invalid transaction type. Allowed: ${Array.from(ALLOWED_TYPES).join(', ')}`, 400);
      }

      // 4. Validate Payment Method
      const normalizedMethod = paymentMethod ? String(paymentMethod).toUpperCase() : 'CASH';
      if (!ALLOWED_PAYMENT_METHODS.has(normalizedMethod)) {
        return ResponseView.error(res, 'Invalid payment method', 400);
      }

      // 5. Sanitize Strings & Items
      // 5. Sanitize Strings & Items
      const sanitizedName = customerName ? String(customerName).trim().slice(0, 100) : undefined;
      const sanitizedNote = note ? String(note).trim().slice(0, 255) : undefined;
      const itemsJson = Array.isArray(items) ? JSON.stringify(items.slice(0, 50)) : undefined;

      const created = TransactionModel.create({
        customer_id: customerId ? String(customerId).trim() : undefined,
        customer_name: sanitizedName,
        type: normalizedType,
        amount: parsedAmount,
        note: sanitizedNote,
        items_json: itemsJson,
        payment_method: normalizedMethod,
      });

      return ResponseView.success(res, created, 'Transaction recorded successfully', 201);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }
}