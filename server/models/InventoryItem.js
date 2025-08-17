// server/models/InventoryItem.js
import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  thicknessMm: {
    type: Number,
    required: [true, 'Thickness (mm) is required'],
    min: [0.1, 'Thickness must be positive']
  },
  sheetLengthMm: {
    type: Number,
    required: [true, 'Sheet length (mm) is required'],
    min: [1, 'Length must be positive']
  },
  sheetWidthMm: {
    type: Number,
    required: [true, 'Sheet width (mm) is required'],
    min: [1, 'Width must be positive']
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
  totalSqm: {
    type: Number,
    
    min: [0, 'Total sqm cannot be negative']
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

inventoryItemSchema.index(
  { brand: 1, type: 1, thicknessMm: 1, sheetLengthMm: 1, sheetWidthMm: 1 }
);


inventoryItemSchema.virtual('areaSqmPerUnit').get(function() {
  if (this.sheetLengthMm && this.sheetWidthMm) {
    return (this.sheetLengthMm * this.sheetWidthMm) / 1_000_000;
  }
  return 0;
});

/**
 * Display name now uses mm dimensions
 */
inventoryItemSchema.virtual('displayName').get(function() {
  return `${this.brand} - ${this.thicknessMm}mm - ${this.sheetLengthMm}x${this.sheetWidthMm}mm - ${this.type}`;
});

inventoryItemSchema.set('toJSON', { virtuals: true });

/**
 * Pre-save hook — recompute totalSqm if currentQuantity or dimensions change
 * (Length/width are fixed after creation by controller validation)
 */
inventoryItemSchema.pre('save', function(next) {
  this.totalSqm = this.areaSqmPerUnit * this.currentQuantity;
  next();
});

export default mongoose.model('InventoryItem', inventoryItemSchema);
