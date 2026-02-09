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

    // Calculate usage by category and thickness
    const categoryUsageMap = new Map();

    const allCategoryThicknessPairs = await InventoryItem.aggregate([
      {
        $match: {
          category: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: {
            category: '$category',
            thicknessMm: '$thicknessMm'
          }
        }
      }
    ]);

    for (const pair of allCategoryThicknessPairs) {
      const category = pair?._id?.category;
      const thicknessRaw = pair?._id?.thicknessMm;
      if (!category || thicknessRaw == null) continue;

      const thicknessMm = typeof thicknessRaw === 'number'
        ? thicknessRaw
        : Number.parseFloat(thicknessRaw.toString());

      if (!Number.isFinite(thicknessMm)) continue;

      const key = `${category}|${thicknessMm}`;
      categoryUsageMap.set(key, {
        category,
        thicknessMm,
        totalItemsUsed: 0,
        totalSqmArea: 0
      });
    }

    // Process usage transactions
    for (const transaction of usageTransactions) {
      const inventoryItem = transaction.item_id;
      if (!inventoryItem || !inventoryItem.category) continue;

      const category = inventoryItem.category;
      const thicknessRaw = inventoryItem.thicknessMm;
      const thicknessMm = typeof thicknessRaw === 'number'
        ? thicknessRaw
        : thicknessRaw == null
          ? NaN
          : Number.parseFloat(thicknessRaw.toString());

      if (!Number.isFinite(thicknessMm)) continue;
      const quantityUsed = Math.abs(transaction.quantityChanged || 0);

      // Guard against missing dimensions
      if (!inventoryItem.sheetWidthMm || !inventoryItem.sheetLengthMm) continue;

      // Calculate area per unit in sqm
      const areaPerUnitSqm =
        (inventoryItem.sheetWidthMm * inventoryItem.sheetLengthMm) / 1_000_000;
      const totalAreaSqm = areaPerUnitSqm * quantityUsed;

      // Create composite key for category + thickness
      const key = `${category}|${thicknessMm}`;

      if (!categoryUsageMap.has(key)) {
        categoryUsageMap.set(key, {
          category,
          thicknessMm,
          totalItemsUsed: 0,
          totalSqmArea: 0
        });
      }

      const usage = categoryUsageMap.get(key);
      usage.totalItemsUsed += quantityUsed;
      usage.totalSqmArea += totalAreaSqm;
    }

    // Convert to array and sort by category name, then by thickness
    const categoryUsage = Array.from(categoryUsageMap.values())
      .filter(usage => usage.category) // Filter out null/undefined categories
      .sort((a, b) => {
        // First sort by category name
        const categoryComparison = a.category.localeCompare(b.category);
        if (categoryComparison !== 0) return categoryComparison;
        
        // Then sort by thickness (ascending)
        return (a.thicknessMm ?? 0) - (b.thicknessMm ?? 0);
      });

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
