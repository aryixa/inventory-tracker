// server/controllers/inventoryController.js
import InventoryItem from "../models/InventoryItem.js";
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";
import { io } from "../server.js";

/**
 * @desc Get all inventory items (pagination optional)
 * @route GET /api/inventory
 * @access Private
 */
export const getInventoryItems = async (req, res) => {
  try {
    const { search } = req.query;

    // Parse limit/page
    const rawLimit = (req.query.limit ?? "").toString().trim().toLowerCase();
    const rawPage = (req.query.page ?? "").toString().trim();

    const parsedLimit = rawLimit === "all" ? 0 : parseInt(rawLimit || "0", 10);
    const parsedPage = parseInt(rawPage || "1", 10);

    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 0;
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const paginationActive = limit > 0;

    const query = { isActive: true };

    if (search && String(search).trim().length > 0) {
      const term = String(search).trim();
      const numeric = Number(term);

      const or = [
        { brand: { $regex: term, $options: "i" } },
        { type: { $regex: term, $options: "i" } },
      ];

      if (Number.isFinite(numeric)) {
        const decimalVal = mongoose.Types.Decimal128.fromString(
          numeric.toFixed(2)
        );
        or.push({ thicknessMm: decimalVal });
        or.push({ sheetLengthMm: numeric });
        or.push({ sheetWidthMm: numeric });
      }

      query.$or = or;
    }

    let mongooseQuery = InventoryItem.find(query)
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    if (paginationActive) {
      mongooseQuery = mongooseQuery.limit(limit).skip((page - 1) * limit);
    }

    const [items, total] = await Promise.all([
      mongooseQuery.lean({ virtuals: true }),
      InventoryItem.countDocuments(query),
    ]);

    // Convert Decimal128 → number for lean results
    items.forEach((i) => {
      if (i.thicknessMm && i.thicknessMm._bsontype === "Decimal128") {
        i.thicknessMm = parseFloat(i.thicknessMm.toString());
      }
      if (i.rate && i.rate._bsontype === "Decimal128") {
        i.rate = parseFloat(i.rate.toString());
      }
    });
      
    if (req.user?.role !== "Admin") {
      items.forEach(i => {
        delete i.stockValuation;
      });
    }

    res.status(200).json({
      success: true,
      data: items,
      meta: {
        count: items.length,
        total,
        page: paginationActive ? page : 1,
        pages: paginationActive ? Math.ceil(total / limit) : 1,
      },
    });
  } catch (error) {
    console.error("Get inventory items error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching inventory items",
    });
  }
};

/**
 * @desc Get inventory items for a specific category, sorted by thickness
 * @route GET /api/inventory/by-category?category=...
 * @access Private
 */
export const getItemsByCategory = async (req, res) => {
  try {
    const rawCategory = (req.query.category ?? "").toString().trim();

    if (!rawCategory) {
      return res.status(400).json({
        success: false,
        message: "category query parameter is required",
      });
    }

    const query = {
      isActive: true,
      category: rawCategory,
    };

    let mongooseQuery = InventoryItem.find(query)
      .populate("createdBy", "username")
      .sort({ thicknessMm: 1 });

    const [items, total] = await Promise.all([
      mongooseQuery.lean({ virtuals: true }),
      InventoryItem.countDocuments(query),
    ]);

    items.forEach((i) => {
      if (i.thicknessMm && i.thicknessMm._bsontype === "Decimal128") {
        i.thicknessMm = parseFloat(i.thicknessMm.toString());
      }
      if (i.rate && i.rate._bsontype === "Decimal128") {
        i.rate = parseFloat(i.rate.toString());
      }
    });

    if (req.user?.role !== "Admin") {
      items.forEach((i) => {
        delete i.stockValuation;
      });
    }

    res.status(200).json({
      success: true,
      data: items,
      meta: {
        count: items.length,
        total,
      },
    });
  } catch (error) {
    console.error("Get items by category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching items by category",
    });
  }
};

/**
 * @desc Get single inventory item
 * @route GET /api/inventory/:id
 * @access Private
 */
export const getInventoryItem = async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id).populate(
      "createdBy",
      "username"
    );

    if (!item || !item.isActive) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error("Get inventory item error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching inventory item",
    });
  }
};

/**
 * @desc Create new inventory item (dimensions in mm; Admin-only via route guard)
 * @route POST /api/inventory
 * @access Private
 */
export const createInventoryItem = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Debug: Log req.user to see what's available
    console.log('req.user in createInventoryItem:', req.user);
    
    if (Object.prototype.hasOwnProperty.call(req.body, "sheetSize")) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          "sheetSize is deprecated. Provide sheetLengthMm and sheetWidthMm (in mm).",
      });
    }

    const {
      thicknessMm,
      sheetLengthMm,
      sheetWidthMm,
      brand,
      type,
      category,
      initialQuantity,
      rate,
    } = req.body;

    const thicknessVal = parseFloat(thicknessMm);
    const decimalThickness = mongoose.Types.Decimal128.fromString(
      thicknessVal.toFixed(2)
    );
    const lengthVal = Number(sheetLengthMm);
    const widthVal = Number(sheetWidthMm);
    const initialQtyVal = Number(initialQuantity);
    const rateVal = parseFloat(rate);

    if (
      !Number.isFinite(thicknessVal) ||
      thicknessVal <= 0 ||
      !Number.isFinite(lengthVal) ||
      lengthVal <= 0 ||
      !Number.isFinite(widthVal) ||
      widthVal <= 0 ||
      !Number.isFinite(rateVal) ||
      rateVal < 0
    ) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          "thicknessMm, sheetLengthMm, and sheetWidthMm must be positive numbers (mm) and rate must be a non-negative number.",
      });
    }

    if (
      !Number.isFinite(initialQtyVal) ||
      initialQtyVal < 0 ||
      !Number.isInteger(initialQtyVal)
    ) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "initialQuantity must be a non-negative integer.",
      });
    }

    if (!brand || !type || !category) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "brand, type and category are required.",
      });
    }

    const existingItem = await InventoryItem.findOne({
      thicknessMm: decimalThickness,
      sheetLengthMm: lengthVal,
      sheetWidthMm: widthVal,
      brand,
      type,
      category,
      isActive: true,
    }).session(session);

    if (existingItem) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "An item with these specifications already exists",
      });
    }

    // Ensure we have a valid user ID
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      await session.abortTransaction();
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    const itemDoc = new InventoryItem({
      thicknessMm: decimalThickness,
      sheetLengthMm: lengthVal,
      sheetWidthMm: widthVal,
      brand,
      type,
      category,
      initialQuantity: initialQtyVal,
      currentQuantity: initialQtyVal,
      rate: mongoose.Types.Decimal128.fromString(rateVal.toFixed(2)),
      createdBy: userId,
    });

    await itemDoc.save({ session });

    await Transaction.create(
      [
        {
          item_id: itemDoc._id,
          user_id: userId,
          transactionType: "addition",
          quantityChanged: initialQtyVal,
          previousQuantity: 0,
          newQuantity: initialQtyVal,
          notes: "Initial stock addition",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const populatedItem = await InventoryItem.findById(itemDoc._id).populate(
      "createdBy",
      "username"
    );

    io.to("inventory").emit(
      "inventory:created",
      populatedItem.toObject({ virtuals: true })
    );

    res.status(201).json({
      success: true,
      message: "Inventory item created successfully",
      data: populatedItem,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Create inventory item error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating inventory item",
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc Get distinct inventory categories
 * @route GET /api/inventory/categories
 * @access Private
 */
export const getInventoryCategories = async (req, res) => {
  try {
    const categories = await InventoryItem.distinct("category", {
      isActive: true,
      category: { $ne: null, $ne: "" },
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get inventory categories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching inventory categories",
    });
  }
};

/**
 * @desc Update inventory quantity (addition | reduction)
 * @route PATCH /api/inventory/:id/quantity
 * @access Private
 */
export const updateInventoryQuantity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactionType, quantityChanged, reductionReason, notes } =
      req.body;
    const item_id = req.params.id;

    if (!["addition", "reduction"].includes(transactionType)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    const qtyDelta = Number(quantityChanged);
    if (
      !Number.isFinite(qtyDelta) ||
      qtyDelta < 1 ||
      !Number.isInteger(qtyDelta)
    ) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "quantityChanged must be a positive integer (>=1).",
      });
    }

    if (transactionType === "reduction") {
      const allowedReasons = ["usage", "breakage"];
      if (!allowedReasons.includes(reductionReason)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `reductionReason must be one of: ${allowedReasons.join(",")}`,
        });
      }
    }

    
    const item = await InventoryItem.findById(item_id).session(session);
    if (!item || !item.isActive) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    const previousQuantity = item.currentQuantity;
    let newQuantity;

    if (transactionType === "addition") {
      if (req.user?.role === "Admin" || typeof req.user?.role === "undefined") {
        newQuantity = previousQuantity + qtyDelta;
      } else {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: "Only admins can add inventory",
        });
      }
    } else {
      if (previousQuantity < qtyDelta) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Insufficient stock available",
        });
      }
      newQuantity = previousQuantity - qtyDelta;
    }

    item.currentQuantity = newQuantity;
    await item.save({ session }); // pre-save hook recomputes totalSqm

    await Transaction.create(
      [
        {
          item_id: item_id,
          user_id: req.user.id,
          transactionType,
          reductionReason:
            transactionType === "reduction" ? reductionReason : undefined,
          quantityChanged: qtyDelta,
          previousQuantity,
          newQuantity,
          notes,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const updatedItem = await InventoryItem.findById(item_id).populate(
      "createdBy",
      "username"
    );

    io.to("inventory").emit(
      "inventory:updated",
      updatedItem.toObject({ virtuals: true })
    );

    const message =
      transactionType === "addition"
        ? `Added ${qtyDelta} units to inventory`
        : `Reduced ${qtyDelta} units from inventory (${reductionReason})`;

    res.status(200).json({ success: true, message, data: updatedItem });
  } catch (error) {
    await session.abortTransaction();
    console.error("Update inventory quantity error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating inventory quantity",
    });
  } finally {
    session.endSession();
  }
};
// /** 
//  * @desc Update full/partial inventory item details (Admin only)
//  * @route PUT /api/inventory/:id
//  * @access Private/Admin
//  */
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = ['brand', 'type', 'category', 'thicknessMm', 'sheetLengthMm', 'sheetWidthMm', 'rate'];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.thicknessMm !== undefined) {
      const thicknessVal = parseFloat(updateData.thicknessMm);
      if (!Number.isFinite(thicknessVal) || thicknessVal <= 0) {
        return res.status(400).json({
          success: false,
          message: 'thicknessMm must be a positive number'
        });
      }
      updateData.thicknessMm = mongoose.Types.Decimal128.fromString(
        thicknessVal.toFixed(2)
      );
    }
    
    if (updateData.rate !== undefined) {
      const rateVal = parseFloat(updateData.rate);
      if (!Number.isFinite(rateVal) || rateVal < 0) {
        return res.status(400).json({
          success: false,
          message: 'rate must be a non-negative number'
        });
      }
      updateData.rate = mongoose.Types.Decimal128.fromString(
        rateVal.toFixed(2)
      );
    }
    if (updateData.brand !== undefined) {
      updateData.brand = String(updateData.brand).trim();
    }
    if (updateData.type !== undefined) {
      updateData.type = String(updateData.type).trim();
    }
    if (updateData.category !== undefined) {
      updateData.category = String(updateData.category).trim();
    }
    const updatedItem = await InventoryItem.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username');

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Emit socket event so all clients update in real time
    io.to('inventory').emit(
      'inventory:updated',
      updatedItem.toObject({ virtuals: true })
    );

    res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating inventory item'
    });
  }
};


/**
 * @desc Delete inventory item (soft delete; Admin-only via route guard)
 * @route DELETE /api/inventory/:id
 * @access Private
 */
export const deleteInventoryItem = async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item || !item.isActive) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    item.isActive = false;
    await item.save();

    io.to("inventory").emit("inventory:deleted", {
      id: item._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: "Inventory item deleted successfully",
    });
  } catch (error) {
    console.error("Delete inventory item error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting inventory item",
    });
  }
};
