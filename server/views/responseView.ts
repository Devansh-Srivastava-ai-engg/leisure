import { Response } from 'express';

export class ResponseView {
  static success(res: Response, data: any, message = 'Success', status = 200) {
    return res.status(status).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static collection(res: Response, data: any[], total?: number, status = 200) {
    return res.status(status).json({
      success: true,
      count: data.length,
      total: total ?? data.length,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static error(res: Response, error: any, status = 500) {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Internal Server Error';
    return res.status(status).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
}
