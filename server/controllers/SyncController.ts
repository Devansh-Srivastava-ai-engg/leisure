import { Response } from 'express';
import { SyncModel } from '../models/Sync';
import { ResponseView } from '../views/responseView';
import { type AuthenticatedRequest } from '../middleware/auth';

const MAX_MUTATIONS_PER_BATCH = 200;

export class SyncController {
  static async push(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return ResponseView.error(res, 'Unauthorized', 401);
      }

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

      // 2. Validate basic structure and force record.user_id = req.userId on every item
      for (let i = 0; i < mutations.length; i++) {
        const item = mutations[i];
        if (!item || typeof item !== 'object') {
          return ResponseView.error(res, `Invalid mutation at index ${i}: must be an object`, 400);
        }
        if (item.payload && typeof item.payload === 'object') {
          item.payload.user_id = req.userId;
          item.payload.userId = req.userId;
        }
      }

      const result = SyncModel.processBatch(req.userId, mutations);

      return res.json({
        success: true,
        processedCount: result.processedCount,
        serverTimestamp: result.serverTimestamp,
      });
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async pull(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return ResponseView.error(res, 'Unauthorized', 401);
      }

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

      const result = SyncModel.pullChanges(req.userId!, validSince);

      return res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }
}