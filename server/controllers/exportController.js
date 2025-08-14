//server\controllers\exportController.js
import InventoryItem from '../models/InventoryItem.js';
import Transaction from '../models/Transaction.js';
import createCsvWriter from 'csv-writer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Export inventory data to CSV
// @route   GET /api/export/inventory
// @access  Private/Admin
export const exportInventory = async (req, res) => {
  try {
    // Get all active inventory items
    const items = await InventoryItem.find({ isActive: true })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    // Prepare data for CSV
    const csvData = items.map(item => ({
      id: item._id.toString(),
      brand: item.brand,
      type: item.type,
      thickness: item.thickness,
      sheetSize: item.sheetSize,
      initialQuantity: item.initialQuantity,
      currentQuantity: item.currentQuantity,
      createdBy: item.createdBy.username,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }));

    // Create CSV file
    const fileName = `inventory-export-${Date.now()}.csv`;
    const filePath = path.join(__dirname, '../exports', fileName);

    // Ensure exports directory exists
    const exportsDir = path.dirname(filePath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'brand', title: 'Brand' },
        { id: 'type', title: 'Type' },
        { id: 'thickness', title: 'Thickness' },
        { id: 'sheetSize', title: 'Sheet Size' },
        { id: 'initialQuantity', title: 'Initial Quantity' },
        { id: 'currentQuantity', title: 'Current Quantity' },
        { id: 'createdBy', title: 'Created By' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'updatedAt', title: 'Updated At' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    // Send file as download
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('File download error:', err);
        res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      }
      
      // Clean up file after download
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 60000); // Delete after 1 minute
    });
  } catch (error) {
    console.error('Export inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting inventory'
    });
  }
};

// @desc    Export transaction data to CSV
// @route   GET /api/export/transactions
// @access  Private/Admin
export const exportTransactions = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Build date filter
    let filter = {};
    if (start_date || end_date) {
      filter.createdAt = {};
      if (start_date) {
        filter.createdAt.$gte = new Date(start_date);
      }
      if (end_date) {
        filter.createdAt.$lte = new Date(end_date);
      }
    }

    // Get all transactions
    const transactions = await Transaction.find(filter)
      .populate('item_id', 'brand type thickness sheetSize')
      .populate('user_id', 'username')
      .sort({ createdAt: -1 });

    // Prepare data for CSV
    const csvData = transactions.map(transaction => ({
      id: transaction._id.toString(),
      timestamp: transaction.createdAt.toISOString(),
      itemName: transaction.item_id ? 
        `${transaction.item_id.brand} - ${transaction.item_id.thickness} - ${transaction.item_id.sheetSize} - ${transaction.item_id.type}` : 
        'Deleted Item',
      user: transaction.user_id ? transaction.user_id.username : 'Unknown User',
      transactionType: transaction.transactionType,
      reductionReason: transaction.reductionReason || '',
      quantityChanged: transaction.quantityChanged,
      previousQuantity: transaction.previousQuantity,
      newQuantity: transaction.newQuantity,
      notes: transaction.notes || ''
    }));

    // Create CSV file
    const fileName = `transactions-export-${Date.now()}.csv`;
    const filePath = path.join(__dirname, '../exports', fileName);

    // Ensure exports directory exists
    const exportsDir = path.dirname(filePath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'Transaction ID' },
        { id: 'timestamp', title: 'Date & Time' },
        { id: 'itemName', title: 'Item' },
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

    // Send file as download
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('File download error:', err);
        res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      }
      
      // Clean up file after download
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 60000); // Delete after 1 minute
    });
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting transactions'
    });
  }
};

// @desc    Export complete data (inventory + transactions)
// @route   GET /api/export/complete
// @access  Private/Admin
export const exportComplete = async (req, res) => {
  try {
    // This endpoint returns URLs for both exports
    res.status(200).json({
      success: true,
      message: 'Use separate endpoints for inventory and transactions',
      endpoints: {
        inventory: '/api/export/inventory',
        transactions: '/api/export/transactions'
      }
    });
  } catch (error) {
    console.error('Export complete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};