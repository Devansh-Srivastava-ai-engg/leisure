import { Request, Response, NextFunction } from 'express';

export const requireAdminSecret = (req: Request, res: Response, next: NextFunction) => {
  const adminSecret = process.env.ADMIN_SECRET || 'dukaankhata-secret-key-123';
  const providedSecret = req.headers['x-admin-secret'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!providedSecret || providedSecret !== adminSecret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid admin secret required for backup/restore operations',
    });
  }

  next();
};
