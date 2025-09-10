// server/controllers/exportController.js
import InventoryItem from '../models/InventoryItem.js';
import Transaction from '../models/Transaction.js';
import createCsvWriter from 'csv-writer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure export directory exists
const ensureExportsDir = (filePath) => {
  const exportsDir = path.dirname(filePath);
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
};

// Format Decimal128 values to fixed 2 decimal places
const formatDecimal128 = (val) =>
  val && val._bsontype === 'Decimal128'
    ? parseFloat(val.toString()).toFixed(2)
    : val;

// @desc    Export inventory data to CSV
// @route   GET /api/export/inventory
// @access  Private/Admin
export const exportInventory = async (req, res) => {
  try {
    const items = await InventoryItem.find({ isActive: true })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .lean();

    const csvData = items.map(item => {
      // Calculate area per unit and stock valuation
      const areaSqmPerUnit = item.sheetLengthMm && item.sheetWidthMm 
        ? (item.sheetLengthMm * item.sheetWidthMm) / 1_000_000 
        : 0;
      const thicknessInMeters = item.thicknessMm ? parseFloat(formatDecimal128(item.thicknessMm)) / 1000 : 0;
      const rate = item.rate ? parseFloat(formatDecimal128(item.rate)) : 0;
      const stockValuation = areaSqmPerUnit * thicknessInMeters * rate * item.currentQuantity;

      return {
        id: item._id.toString(),
        brand: item.brand,
        type: item.type,
        thicknessMm: formatDecimal128(item.thicknessMm),
        sheetLengthMm: item.sheetLengthMm,
        sheetWidthMm: item.sheetWidthMm,
        areaSqmPerUnit: areaSqmPerUnit.toFixed(4),
        initialQuantity: item.initialQuantity,
        currentQuantity: item.currentQuantity,
        totalSqm: formatDecimal128(item.totalSqm),
        rate: formatDecimal128(item.rate),
        stockValuation: stockValuation.toFixed(2),
        createdBy: item.createdBy?.username || 'Unknown',
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      };
    });

    const fileName = `inventory-export-${Date.now()}.csv`;
    const filePath = path.join(__dirname, '../exports', fileName);

    ensureExportsDir(filePath);

    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'brand', title: 'Brand' },
        { id: 'type', title: 'Type' },
        { id: 'thicknessMm', title: 'Thickness (mm)' },
        { id: 'sheetLengthMm', title: 'Length (mm)' },
        { id: 'sheetWidthMm', title: 'Width (mm)' },
        { id: 'areaSqmPerUnit', title: 'Area per Unit (sqm)' },
        { id: 'initialQuantity', title: 'Initial Quantity' },
        { id: 'currentQuantity', title: 'Current Quantity' },
        { id: 'totalSqm', title: 'Total Area (sqm)' },
        { id: 'rate', title: 'Rate per Unit (₹)' },
        { id: 'stockValuation', title: 'Stock Valuation (₹)' },
        { id: 'createdBy', title: 'Created By' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'updatedAt', title: 'Updated At' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('File download error:', err);
        return res.status(500).json({ success: false, message: 'Error downloading file' });
      }
      // Auto-delete after 1 minute
      setTimeout(() => fs.existsSync(filePath) && fs.unlinkSync(filePath), 60000);
    });
  } catch (error) {
    console.error('Export inventory error:', error);
    res.status(500).json({ success: false, message: 'Server error while exporting inventory' });
  }
};

// @desc    Export transaction data to CSV
// @route   GET /api/export/transactions
// @access  Private/Admin
export const exportTransactions = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const filter = {};
    if (start_date || end_date) {
      filter.createdAt = {};
      if (start_date) filter.createdAt.$gte = new Date(start_date);
      if (end_date) filter.createdAt.$lte = new Date(end_date);
    }

    const transactions = await Transaction.find(filter)
      .populate('item_id', 'brand type thicknessMm sheetLengthMm sheetWidthMm totalSqmPerUnit')
      .populate('user_id', 'username')
      .sort({ createdAt: -1 })
      .lean();

    const csvData = transactions.map(tx => {
      const item = tx.item_id;
      return {
        id: tx._id.toString(),
        timestamp: tx.createdAt.toISOString(),
        itemName: item
          ? `${item.brand} - ${formatDecimal128(item.thicknessMm)}mm - ${item.sheetLengthMm}x${item.sheetWidthMm}mm - ${item.type}`
          : 'Deleted Item',
        areaPerUnitSqm: item ? formatDecimal128(item.totalSqmPerUnit) : '',
        user: tx.user_id?.username || 'Unknown User',
        transactionType: tx.transactionType,
        reductionReason: tx.reductionReason || '',
        quantityChanged: tx.quantityChanged,
        previousQuantity: tx.previousQuantity,
        newQuantity: tx.newQuantity,
        notes: tx.notes || ''
      };
    });

    const fileName = `transactions-export-${Date.now()}.csv`;
    const filePath = path.join(__dirname, '../exports', fileName);

    ensureExportsDir(filePath);

    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'Transaction ID' },
        { id: 'timestamp', title: 'Date & Time' },
        { id: 'itemName', title: 'Item' },
        { id: 'areaPerUnitSqm', title: 'Area per Unit (sqm)' },
        { id: 'user', title: 'User' },
        { id: 'transactionType', title: 'Type' },
        { id: 'reductionReason', title: 'Reduction Reason' },
        { id: 'quantityChanged', title: 'Quantity Changed' },
        { id: 'previousQuantity', title: 'Previous Stock' },
        { id: 'newQuantity', title: 'New Stock' },
        { id: 'notes', title: 'Notes' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('File download error:', err);
        return res.status(500).json({ success: false, message: 'Error downloading file' });
      }
      setTimeout(() => fs.existsSync(filePath) && fs.unlinkSync(filePath), 60000);
    });
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error while exporting transactions' });
  }
};

// @desc    Export complete data (inventory + transactions)
// @route   GET /api/export/complete
// @access  Private/Admin
export const exportComplete = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Use separate endpoints for inventory and transactions',
    endpoints: {
      inventory: '/api/export/inventory',
      transactions: '/api/export/transactions'
    }
  });
};
