import { Response } from 'express';
import { InventoryModel } from '../models/Inventory';
import { ResponseView } from '../views/responseView';
import { type AuthenticatedRequest } from '../middleware/auth';

export class InventoryController {
  static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const items = InventoryModel.findAll(req.userId!);
      return ResponseView.collection(res, items);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const item = InventoryModel.findById(req.params.id, req.userId!);
      if (!item) {
        return ResponseView.error(res, 'Item not found', 404);
      }
      return ResponseView.success(res, item);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        name,
        nameHi,
        category,
        parentUnitName,
        subUnitName,
        looseUnitName,
        unitsPerParent,
        unitsPerSub,
        stockInLooseUnits,
        looseSellingPrice,
        subSellingPrice,
        parentCostPrice,
        lowStockThresholdLoose,
        quickPreset,
        color,
        icon,
      } = req.body;

      if (!name) {
        return ResponseView.error(res, 'Item name is required', 400);
      }

      const created = InventoryModel.create({
        user_id: req.userId!,
        name,
        name_hi: nameHi,
        category,
        parent_unit_name: parentUnitName,
        sub_unit_name: subUnitName,
        loose_unit_name: looseUnitName,
        units_per_parent: unitsPerParent,
        units_per_sub: unitsPerSub,
        stock_in_loose_units: stockInLooseUnits,
        loose_selling_price: looseSellingPrice,
        sub_selling_price: subSellingPrice,
        parent_cost_price: parentCostPrice,
        low_stock_threshold_loose: lowStockThresholdLoose,
        quick_preset: quickPreset,
        color,
        icon,
      });

      return ResponseView.success(res, created, 'Item created successfully', 201);
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }

  static async updateStock(req: AuthenticatedRequest, res: Response) {
    try {
      const { stockInLooseUnits, deductLooseUnits } = req.body;
      const updated = InventoryModel.updateStock(req.params.id, req.userId!, {
        stockInLooseUnits,
        deductLooseUnits,
      });
      if (!updated) {
        return ResponseView.error(res, 'Item not found', 404);
      }
      return ResponseView.success(res, updated, 'Stock updated successfully');
    } catch (err) {
      return ResponseView.error(res, err);
    }
  }
}
