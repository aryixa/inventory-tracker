// server/controllers/inventoryController.js
import InventoryItem from '../models/InventoryItem.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';
import { io } from '../server.js';  

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
export const getInventoryItems = async (req, res) => {
  try {
    const { search } = req.query;
    let page = parseInt(req.query.page || '1', 10);
    let limit = parseInt(req.query.limit || '10', 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    let query = { isActive: true };
    if (search) {
      query.$or = [
        { brand: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { thickness: { $regex: search, $options: 'i' } },
        { sheetSize: { $regex: search, $options: 'i' } }
      ];
    }

    const items = await InventoryItem.find(query)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await InventoryItem.countDocuments(query);

    res.status(200).json({
      success: true,
      data: items,
      meta: {
        count: items.length,
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory items'
    });
  }
};

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private
export const getInventoryItem = async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id)
      .populate('createdBy', 'username');

    if (!item || !item.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inventory item'
    });
  }
};

// @desc    Create new inventory item (Admin only)
export const createInventoryItem = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { thickness, sheetSize, brand, type, initialQuantity } = req.body;

    const existingItem = await InventoryItem.findOne({
      thickness,
      sheetSize,
      brand,
      type,
      isActive: true
    }).session(session);

    if (existingItem) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'An item with these specifications already exists'
      });
    }

    const created = await InventoryItem.create([{
      thickness,
      sheetSize,
      brand,
      type,
      initialQuantity,
      currentQuantity: initialQuantity,
      createdBy: req.user.id
    }], { session });

    const itemCreated = created[0];

    await Transaction.create([{
      item_id: itemCreated._id, 
      user_id: req.user.id,    
      transactionType: 'addition',
      quantityChanged: initialQuantity,
      previousQuantity: 0,
      newQuantity: initialQuantity,
      notes: 'Initial stock addition'
    }], { session });

    await session.commitTransaction();

    const populatedItem = await InventoryItem.findById(itemCreated._id)
      .populate('createdBy', 'username');

    // 🔹 New: real-time event for created item
    io.to('inventory').emit('inventory:created', populatedItem);

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: populatedItem
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating inventory item'
    });
  } finally {
    session.endSession();
  }
};

// @desc    Update inventory quantity
export const updateInventoryQuantity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactionType, quantityChanged, reductionReason, notes } = req.body;
    const item_id = req.params.id;

    const item = await InventoryItem.findById(item_id).session(session);
    if (!item || !item.isActive) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    const previousQuantity = item.currentQuantity;
    let newQuantity;

    if (transactionType === 'addition') {
      if (req.user.role !== 'Admin') {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: 'Only admin can add inventory'
        });
      }
      newQuantity = previousQuantity + quantityChanged;
    } else if (transactionType === 'reduction') {
      if (previousQuantity < quantityChanged) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock available'
        });
      }
      newQuantity = previousQuantity - quantityChanged;
    } else {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction type'
      });
    }

    item.currentQuantity = newQuantity;
    await item.save({ session });

    await Transaction.create([{
      item_id,
      user_id: req.user.id,
      transactionType,
      reductionReason: transactionType === 'reduction' ? reductionReason : undefined,
      quantityChanged,
      previousQuantity,
      newQuantity,
      notes
    }], { session });

    await session.commitTransaction();

    const updatedItem = await InventoryItem.findById(item_id)
      .populate('createdBy', 'username');

    io.to('inventory').emit('inventory:updated', updatedItem);

    const message = transactionType === 'addition'
      ? `Added ${quantityChanged} units to inventory`
      : `Reduced ${quantityChanged} units from inventory (${reductionReason})`;

    res.status(200).json({
      success: true,
      message,
      data: updatedItem
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Update inventory quantity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating inventory quantity'
    });
  } finally {
    session.endSession();
  }
};

// @desc    Delete inventory item (Admin only)
export const deleteInventoryItem = async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);

    if (!item || !item.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    item.isActive = false;
    await item.save();

    // 🔹 New: real-time event for deleted item
    io.to('inventory').emit('inventory:deleted', { id: item._id.toString() });

    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting inventory item'
    });
  }
};
