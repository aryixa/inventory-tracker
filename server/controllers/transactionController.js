import Transaction from '../models/Transaction.js';
import InventoryItem from '../models/InventoryItem.js';


export const getTransactions = async (req, res) => {
  try {
    let page = parseInt(req.query.page || '1', 10);
    let limit = parseInt(req.query.limit || '20', 10);
    const { transactionType, reductionReason, startDate, endDate, search } = req.query;

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;

    const pipeline = [];

    pipeline.push({
      $lookup: {
        from: 'inventoryitems',
        let: { itemId: '$item_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$itemId'] } } },
          { $project: { _id: 1, brand: 1, type: 1, thickness: 1, sheetSize: 1 } }
        ],
        as: 'item',
      },

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
        as: 'user',
      },
    });
    pipeline.push({ $unwind: { path: '$user', preserveNullAndEmptyArrays: true } });
    
    const matchConditions = {};
    if (transactionType) matchConditions.transactionType = transactionType;
    if (reductionReason) matchConditions.reductionReason = reductionReason;
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      matchConditions.$or = [
        { 'item.brand': { $regex: searchRegex } },
        { 'item.type': { $regex: searchRegex } },
        { 'item.thickness': { $regex: searchRegex } },
        { 'user.username': { $regex: searchRegex } },
      ];
    }
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    pipeline.push({ $sort: { createdAt: -1 } });

    pipeline.push({
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    });

    const result = await Transaction.aggregate(pipeline);
    const transactions = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    const formattedTransactions = transactions.map((transaction) => ({
      ...transaction,
      item_id: transaction.item,
      user_id: transaction.user,
    }));

    res.status(200).json({
      success: true,
      data: formattedTransactions,
      meta: {
        count: formattedTransactions.length,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions',
    });
  }
};

export const getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('item_id', 'brand type thickness sheetSize')
      .populate('user_id', 'username');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction',
    });
  }
};

export const getTransactionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const stats = await Transaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAdditions: {
            $sum: { $cond: [{ $eq: ['$transactionType', 'addition'] }, 1, 0] },
          },
          totalReductions: {
            $sum: { $cond: [{ $eq: ['$transactionType', 'reduction'] }, 1, 0] },
          },
          totalUsage: {
            $sum: { $cond: [{ $eq: ['$reductionReason', 'usage'] }, 1, 0] },
          },
          totalBreakage: {
            $sum: { $cond: [{ $eq: ['$reductionReason', 'breakage'] }, 1, 0] },
          },
          totalQuantityAdded: {
            $sum: {
              $cond: [
                { $eq: ['$transactionType', 'addition'] },
                '$quantityChanged',
                0,
              ],
            },
          },
          totalQuantityReduced: {
            $sum: {
              $cond: [
                { $eq: ['$transactionType', 'reduction'] },
                '$quantityChanged',
                0,
              ],
            },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalTransactions: 0,
      totalAdditions: 0,
      totalReductions: 0,
      totalUsage: 0,
      totalBreakage: 0,
      totalQuantityAdded: 0,
      totalQuantityReduced: 0,
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction statistics',
    });
  }
};
