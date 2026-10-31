import { Response } from 'express';
import { DailyRegisterModel } from '../models/DailyRegister';
import { ResponseView } from '../views/responseView';
import { type AuthenticatedRequest } from '../middleware/auth';

export class RegisterController {
  static async getToday(req: AuthenticatedRequest, res: Response) {
    try {
      const register = DailyRegisterModel.getToday(req.userId!);
      return ResponseView.success(res, register);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async getHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 30;
      const registers = DailyRegisterModel.findAll(req.userId!, limit);
      return ResponseView.collection(res, registers);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async closeToday(req: AuthenticatedRequest, res: Response) {
    try {
      const { countedCash, denominations, notes } = req.body;
      const closed = DailyRegisterModel.closeToday(req.userId!, {
        countedCash,
        denominations,
        notes,
      });
      return ResponseView.success(res, closed, 'Day register closed successfully');
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }
}
