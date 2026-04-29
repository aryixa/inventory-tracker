// server/models/Booking.js
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: [true, 'Item ID is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  }
}, {
  timestamps: true,
  // Ensure getters run when converting to JSON or plain objects
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// Indexes for better query performance
bookingSchema.index({ itemId: 1, status: 1 });
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });

// Virtual: display name
bookingSchema.virtual('displayName').get(function() {
  return `Booking #${this._id} - ${this.quantity} units`;
});

export default mongoose.model('Booking', bookingSchema);
