//server\routes\dashboard.js
import express from 'express';
import Transaction from '../models/Transaction.js';
import InventoryItem from '../models/InventoryItem.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get category usage data for dashboard
router.get('/category-usage', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const hasStart = Boolean(startDate);
    const hasEnd = Boolean(endDate);

    // Parse dates
    let start = hasStart ? new Date(startDate) : null;
    let end = hasEnd ? new Date(endDate) : null;

    // Validate date range
    if ((start && isNaN(start.getTime())) || (end && isNaN(end.getTime()))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (start) {
      start.setHours(0, 0, 0, 0);
    }

    if (end) {
      // Set end date to end of day
      end.setHours(23, 59, 59, 999);
    }

    if (start && end && start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    // ✅ FIX: await distinct before filtering
    const allCategories = (await InventoryItem.distinct('category')).filter(Boolean);

    const createdAtFilter =
      start && end
        ? { $gte: start, $lte: end }
        : start
          ? { $gte: start }
          : end
            ? { $lte: end }
            : null;

    // Get all reduction transactions (usage) within date range
    const usageTransactions = await Transaction.find({
      transactionType: 'reduction',
      reductionReason: 'usage',
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {})
    }).populate('item_id');

    // Calculate usage by category
    const categoryUsageMap = new Map();

    // Initialize all categories with zero usage
    allCategories.forEach(category => {
      categoryUsageMap.set(category, {
        category,
        totalItemsUsed: 0,
        totalSqmArea: 0
      });
    });

    // Process usage transactions
    for (const transaction of usageTransactions) {
      const inventoryItem = transaction.item_id;
      if (!inventoryItem || !inventoryItem.category) continue;

      const category = inventoryItem.category;
      const quantityUsed = Math.abs(transaction.quantityChanged || 0);

      // Guard against missing dimensions
      if (!inventoryItem.sheetWidthMm || !inventoryItem.sheetLengthMm) continue;

      // Calculate area per unit in sqm
      const areaPerUnitSqm =
        (inventoryItem.sheetWidthMm * inventoryItem.sheetLengthMm) / 1_000_000;
      const totalAreaSqm = areaPerUnitSqm * quantityUsed;

      if (!categoryUsageMap.has(category)) {
        categoryUsageMap.set(category, {
          category,
          totalItemsUsed: 0,
          totalSqmArea: 0
        });
      }

      const usage = categoryUsageMap.get(category);
      usage.totalItemsUsed += quantityUsed;
      usage.totalSqmArea += totalAreaSqm;
    }

    // Convert to array and sort by category name
    const categoryUsage = Array.from(categoryUsageMap.values())
      .filter(usage => usage.category) // Filter out null/undefined categories
      .sort((a, b) => a.category.localeCompare(b.category));

    res.json({
      success: true,
      data: categoryUsage
    });
  } catch (error) {
    console.error('Error fetching category usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category usage data'
    });
  }
});

export default router;
