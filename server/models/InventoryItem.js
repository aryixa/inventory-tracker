//server\models\InventoryItem.js
import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  thickness: {
    type: String,
    required: [true, 'Thickness is required'],
    trim: true
  },
  sheetSize: {
    type: String,
    required: [true, 'Sheet size is required'],
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    trim: true
  },
  initialQuantity: {
    type: Number,
    required: [true, 'Initial quantity is required'],
    min: [0, 'Initial quantity cannot be negative']
  },
  currentQuantity: {
    type: Number,
    required: [true, 'Current quantity is required'],
    min: [0, 'Current quantity cannot be negative']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create compound index for better query performance
inventoryItemSchema.index({ brand: 1, type: 1, thickness: 1, sheetSize: 1 });

// Virtual for item display name
inventoryItemSchema.virtual('displayName').get(function() {
  return `${this.brand} - ${this.thickness} - ${this.sheetSize} - ${this.type}`;
});

// Ensure virtual fields are serialized
inventoryItemSchema.set('toJSON', { virtuals: true });

export default mongoose.model('InventoryItem', inventoryItemSchema);
