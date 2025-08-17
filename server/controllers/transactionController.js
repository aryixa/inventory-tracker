// server/controllers/transactionController.js
import Transaction from '../models/Transaction.js';

// Get paginated transactions with optional filters and joined item/user
export const getTransactions = async (req, res) => {
  try {
    let page = parseInt(req.query.page || '1', 10);
    let limit = parseInt(req.query.limit || '20', 10);
    const { transactionType, reductionReason, search, date } = req.query;

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;

    const pipeline = [];

    // Pre-lookup match on transaction fields for performance
    const preMatch = {};
    if (transactionType) preMatch.transactionType = transactionType;
    if (reductionReason) preMatch.reductionReason = reductionReason;

    // Logic for "on date" filter
    if (date) {
      const selectedDate = new Date(date);
      if (!isNaN(selectedDate.getTime())) {
        const startOfSelectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const endOfSelectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
        preMatch.createdAt = {
          $gte: startOfSelectedDay,
          $lt: endOfSelectedDay
        };
      }
    }

    if (Object.keys(preMatch).length > 0) {
      pipeline.push({ $match: preMatch });
    }

    // Join inventory item (canonical fields) and user
    pipeline.push({
      $lookup: {
        from: 'inventoryitems',
        let: { itemId: '$item_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$itemId'] } } },
          {
            $project: {
              _id: 1,
              brand: 1,
              type: 1,
              thicknessMm: 1,
              sheetLengthMm: 1,
              sheetWidthMm: 1,
              totalSqmPerUnit: 1
            }
          }
        ],
        as: 'item'
      }
    });
    pipeline.push({ $unwind: { path: '$item', preserveNullAndEmptyArrays: true } });

    pipeline.push({
      $lookup: {
        from: 'users',
        let: { userId: '$user_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
          { $project: { _id: 1, username: 1, role: 1, isActive: 1, createdAt: 1 } }
        ],
        as: 'user'
      }
    });
    pipeline.push({ $unwind: { path: '$user', preserveNullAndEmptyArrays: true } });

    // Post-lookup match for search across joined fields
    if (search && String(search).trim().length > 0) {
      const term = String(search).trim();
      const num = Number(term);
      const orConds = [
        { 'item.brand': { $regex: term, $options: 'i' } },
        { 'item.type': { $regex: term, $options: 'i' } },
        { 'user.username': { $regex: term, $options: 'i' } }
      ];
      if (Number.isFinite(num)) {
        orConds.push({ 'item.thicknessMm': num });
        orConds.push({ 'item.sheetLengthMm': num });
        orConds.push({ 'item.sheetWidthMm': num });
      }
      pipeline.push({ $match: { $or: orConds } });
    }

    pipeline.push({ $sort: { createdAt: -1 } });

    pipeline.push({
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        totalCount: [{ $count: 'count' }]
      }
    });

    const result = await Transaction.aggregate(pipeline);
    const transactions = result[0]?.data || [];
    const total = result[0]?.totalCount?.[0]?.count || 0;

    const formattedTransactions = transactions.map((t) => ({
      ...t,
      item_id: t.item ?? null,
      user_id: t.user ?? null
    }));

    res.status(200).json({
      success: true,
      data: formattedTransactions,
      meta: {
        count: formattedTransactions.length,
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions'
    });
  }
};

export const getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('item_id', 'brand type thicknessMm sheetLengthMm sheetWidthMm totalSqmPerUnit')
      .populate('user_id', 'username role');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction'
    });
  }
};

export const getTransactionStats = async (req, res) => {
  try {
    const { date } = req.query;

    const dateFilter = {};
    if (date) {
      const selectedDate = new Date(date);
      if (!isNaN(selectedDate.getTime())) {
        const startOfSelectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const endOfSelectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
        dateFilter.createdAt = {
          $gte: startOfSelectedDay,
          $lt: endOfSelectedDay
        };
      }
    }

    const stats = await Transaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAdditions: { $sum: { $cond: [{ $eq: ['$transactionType', 'addition'] }, 1, 0] } },
          totalReductions: { $sum: { $cond: [{ $eq: ['$transactionType', 'reduction'] }, 1, 0] } },
          totalUsage: { $sum: { $cond: [{ $eq: ['$reductionReason', 'usage'] }, 1, 0] } },
          totalBreakage: { $sum: { $cond: [{ $eq: ['$reductionReason', 'breakage'] }, 1, 0] } },
          totalQuantityAdded: {
            $sum: { $cond: [{ $eq: ['$transactionType', 'addition'] }, '$quantityChanged', 0] }
          },
          totalQuantityReduced: {
            $sum: { $cond: [{ $eq: ['$transactionType', 'reduction'] }, '$quantityChanged', 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalTransactions: 0,
      totalAdditions: 0,
      totalReductions: 0,
      totalUsage: 0,
      totalBreakage: 0,
      totalQuantityAdded: 0,
      totalQuantityReduced: 0
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction statistics'
    });
  }
};