// server/controllers/bookingController.js
import Booking from "../models/Booking.js";
import InventoryItem from "../models/InventoryItem.js";
import mongoose from "mongoose";
import { getIO } from "../socket.js";

/**
 * @desc Create a new booking request
 * @route POST /api/bookings
 * @access Private (Users and Admins)
 */
export const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { itemId, quantity, notes } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!itemId || !quantity) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(400).json({
        success: false,
        message: "Item ID and quantity are required",
      });
    }

    const quantityNum = Number(quantity);
    if (!Number.isFinite(quantityNum) || quantityNum < 1) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      });
    }

    // Check if item exists and is active
    const item = await InventoryItem.findById(itemId).session(session);
    if (!item || !item.isActive) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    // Create booking (pending status doesn't affect stock)
    const booking = new Booking({
      itemId,
      quantity: quantityNum,
      userId,
      notes: notes?.trim()
    });

    await booking.save({ session });
    await session.commitTransaction();

    // Populate booking details for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate('itemId', 'brand type thicknessMm sheetLengthMm sheetWidthMm')
      .populate('userId', 'username');

    // Emit socket event for real-time updates
    console.log('Emitting booking:created event');
    getIO()?.to("bookings").emit("booking:created", populatedBooking);

    res.status(201).json({
      success: true,
      message: "Booking request created successfully",
      data: populatedBooking,
    });
  } catch (error) {
    // Only abort if transaction is still active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Create booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating booking",
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc Get all bookings (with filtering)
 * @route GET /api/bookings
 * @access Private (Admins see all, Users see their own)
 */
export const getBookings = async (req, res) => {
  try {
    const { status, itemId } = req.query;
    const { role, id: userId } = req.user;

    // Build query
    let query = {};
    
    // Non-admin users can only see their own bookings
    if (role !== "Admin") {
      query.userId = userId;
    }

    // Filter by status if provided
    if (status && ["pending", "approved", "rejected", "cancelled"].includes(status)) {
      query.status = status;
    }

    // Filter by item if provided
    if (itemId) {
      query.itemId = itemId;
    }

    const bookings = await Booking.find(query)
      .populate('itemId', 'brand type thicknessMm sheetLengthMm sheetWidthMm currentQuantity')
      .populate('userId', 'username')
      .populate('approvedBy', 'username')
      .populate('rejectedBy', 'username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching bookings",
    });
  }
};

/**
 * @desc Approve a booking
 * @route PATCH /api/bookings/:id/approve
 * @access Private/Admin
 */
export const approveBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingId = req.params.id;
    const adminId = req.user.id;

    // Find booking and populate item
    const booking = await Booking.findById(bookingId)
      .populate('itemId')
      .session(session);

    if (!booking) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status !== "pending") {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(400).json({
        success: false,
        message: `Cannot approve booking with status: ${booking.status}`,
      });
    }

    const item = booking.itemId;
    
    // Check available quantity
    if (booking.quantity > item.currentQuantity) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${item.currentQuantity}, Requested: ${booking.quantity}`,
      });
    }

    // Update booking status
    booking.status = "approved";
    booking.approvedBy = adminId;
    booking.approvedAt = new Date();

    await booking.save({ session });

    // Update item current quantity (reduce actual stock)
    item.currentQuantity -= booking.quantity;
    await item.save({ session });

    await session.commitTransaction();

    // Get updated booking with populated details
    const updatedBooking = await Booking.findById(bookingId)
      .populate('itemId', 'brand type thicknessMm sheetLengthMm sheetWidthMm currentQuantity')
      .populate('userId', 'username')
      .populate('approvedBy', 'username')
      .populate('rejectedBy', 'username');

    // Emit socket events
    getIO()?.to("bookings").emit("booking:updated", updatedBooking);
    getIO()?.to("inventory").emit("inventory:updated", item.toObject({ virtuals: true }));

    res.status(200).json({
      success: true,
      message: "Booking approved successfully",
      data: updatedBooking,
    });
  } catch (error) {
    // Only abort if transaction is still active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Approve booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while approving booking",
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc Reject a booking
 * @route PATCH /api/bookings/:id/reject
 * @access Private/Admin
 */
export const rejectBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingId = req.params.id;
    const { rejectionReason } = req.body;
    const adminId = req.user.id;

    // Find booking
    const booking = await Booking.findById(bookingId).session(session);

    if (!booking) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status !== "pending") {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(400).json({
        success: false,
        message: `Cannot reject booking with status: ${booking.status}`,
      });
    }

    // Update booking status
    booking.status = "rejected";
    booking.rejectedBy = adminId;
    booking.rejectedAt = new Date();
    if (rejectionReason?.trim()) {
      booking.rejectionReason = rejectionReason.trim();
    }

    await booking.save({ session });

    await session.commitTransaction();

    // Get updated booking with populated details
    const updatedBooking = await Booking.findById(bookingId)
      .populate('itemId', 'brand type thicknessMm sheetLengthMm sheetWidthMm currentQuantity')
      .populate('userId', 'username')
      .populate('approvedBy', 'username')
      .populate('rejectedBy', 'username');

    // Emit socket event
    console.log('Emitting booking:updated event (reject)');
    getIO()?.to("bookings").emit("booking:updated", updatedBooking);

    res.status(200).json({
      success: true,
      message: "Booking rejected successfully",
      data: updatedBooking,
    });
  } catch (error) {
    // Only abort if transaction is still active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Reject booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while rejecting booking",
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc Cancel an approved booking
 * @route PATCH /api/bookings/:id/cancel
 * @access Private/Admin
 */
export const cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingId = req.params.id;
    const adminId = req.user.id;

    // Find booking and populate item
    const booking = await Booking.findById(bookingId)
      .populate('itemId')
      .session(session);

    if (!booking) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status !== "approved") {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking with status: ${booking.status}`,
      });
    }

    const item = booking.itemId;

    // Update booking status
    booking.status = "cancelled";
    await booking.save({ session });

    // Update item current quantity (restore stock)
    item.currentQuantity += booking.quantity;
    await item.save({ session });

    await session.commitTransaction();

    // Get updated booking with populated details
    const updatedBooking = await Booking.findById(bookingId)
      .populate('itemId', 'brand type thicknessMm sheetLengthMm sheetWidthMm currentQuantity')
      .populate('userId', 'username')
      .populate('approvedBy', 'username')
      .populate('rejectedBy', 'username');

    // Emit socket events
    getIO()?.to("bookings").emit("booking:updated", updatedBooking);
    getIO()?.to("inventory").emit("inventory:updated", item.toObject({ virtuals: true }));

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: updatedBooking,
    });
  } catch (error) {
    // Only abort if transaction is still active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Cancel booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while cancelling booking",
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc Get booking statistics
 * @route GET /api/bookings/stats
 * @access Private/Admin
 */
export const getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" }
        }
      }
    ]);

    const result = {
      pending: { count: 0, totalQuantity: 0 },
      approved: { count: 0, totalQuantity: 0 },
      rejected: { count: 0, totalQuantity: 0 },
      cancelled: { count: 0, totalQuantity: 0 }
    };

    stats.forEach(stat => {
      if (result[stat._id]) {
        result[stat._id] = {
          count: stat.count,
          totalQuantity: stat.totalQuantity
        };
      }
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get booking stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching booking statistics",
    });
  }
};

/**
 * @desc Delete a booking entirely from the local DB
 * @route DELETE /api/bookings/:id
 * @access Private/Admin
 */
export const deleteBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Admins can delete bookings (usually only approved/rejected) per business rules
    await booking.deleteOne();

    res.status(200).json({
      success: true,
      message: "Booking deleted successfully",
    });

  } catch (error) {
    console.error("Delete booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting booking",
    });
  }
};
