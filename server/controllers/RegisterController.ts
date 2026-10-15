import { Request, Response } from 'express';
import { DailyRegisterModel } from '../models/DailyRegister';
import { ResponseView } from '../views/responseView';

export class RegisterController {
  static async getToday(_req: Request, res: Response) {
    try {
      const register = DailyRegisterModel.getToday();
      return ResponseView.success(res, register);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async getHistory(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 30;
      const registers = DailyRegisterModel.findAll(limit);
      return ResponseView.collection(res, registers);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async closeToday(req: Request, res: Response) {
    try {
      const { countedCash, denominations, notes } = req.body;
      const closed = DailyRegisterModel.closeToday({
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
