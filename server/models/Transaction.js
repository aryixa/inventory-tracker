//server\models\Transaction.js
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: [true, 'Item ID is required']
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  transactionType: {
    type: String,
    enum: ['addition', 'reduction'],
    required: [true, 'Transaction type is required']
  },
  reductionReason: {
    type: String,
    enum: ['usage', 'breakage'],
    required: function() {
      return this.transactionType === 'reduction';
    }
  },
  quantityChanged: {
    type: Number,
    required: [true, 'Quantity changed is required'],
    min: [1, 'Quantity changed must be at least 1']
  },
  previousQuantity: {
    type: Number,
    required: [true, 'Previous quantity is required'],
    min: [0, 'Previous quantity cannot be negative']
  },
  newQuantity: {
    type: Number,
    required: [true, 'New quantity is required'],
    min: [0, 'New quantity cannot be negative']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
transactionSchema.index({ itemId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ transactionType: 1, createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
