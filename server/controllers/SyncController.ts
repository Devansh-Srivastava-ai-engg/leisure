import { Request, Response } from 'express';
import { SyncModel } from '../models/Sync';
import { ResponseView } from '../views/responseView';

const MAX_MUTATIONS_PER_BATCH = 200;

export class SyncController {
  static async push(req: Request, res: Response) {
    try {
      const { mutations } = req.body;

      if (!Array.isArray(mutations)) {
        return ResponseView.error(res, 'mutations array is required in request body', 400);
      }

      // 1. Enforce batch size limit to prevent memory exhaustion / DoS
      if (mutations.length === 0) {
        return res.json({
          success: true,
          processedCount: 0,
          serverTimestamp: new Date().toISOString(),
        });
      }

      if (mutations.length > MAX_MUTATIONS_PER_BATCH) {
        return ResponseView.error(
          res,
          `Batch too large. Maximum ${MAX_MUTATIONS_PER_BATCH} mutations allowed per request.`,
          413
        );
      }

      // 2. Validate basic structure of each mutation object
      for (let i = 0; i < mutations.length; i++) {
        const item = mutations[i];
        if (!item || typeof item !== 'object') {
          return ResponseView.error(res, `Invalid mutation at index ${i}: must be an object`, 400);
        }
      }

      const result = SyncModel.processBatch(mutations);

      return res.json({
        success: true,
        processedCount: result.processedCount,
        serverTimestamp: result.serverTimestamp,
      });
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async pull(req: Request, res: Response) {
    try {
      const sinceRaw = req.query.since as string | undefined;
      let validSince: string | undefined = undefined;

      // 3. Validate timestamp format if provided
      if (sinceRaw) {
        const parsedDate = new Date(sinceRaw);
        if (isNaN(parsedDate.getTime())) {
          return ResponseView.error(res, 'Invalid "since" timestamp format. Must be a valid ISO string.', 400);
        }
        validSince = parsedDate.toISOString();
      }

      const result = SyncModel.pullChanges(validSince);

      return res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }
}