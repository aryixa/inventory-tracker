// server/models/InventoryItem.js
import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  thicknessMm: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Thickness (mm) is required'],
    min: [0.1, 'Thickness must be positive'],
    // Getter: convert Decimal128 → JS number for API/UI
    get: v => v == null ? v : parseFloat(v.toString()),
    // Setter: round to 2 decimal places before storing
    set: v => v == null
      ? v
      : mongoose.Types.Decimal128.fromString(parseFloat(v).toFixed(2))
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
  rate: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative'],
    // Getter: convert Decimal128 → JS number for API/UI
    get: v => v == null ? v : parseFloat(v.toString()),
    // Setter: round to 2 decimal places before storing
    set: v => v == null
      ? v
      : mongoose.Types.Decimal128.fromString(parseFloat(v).toFixed(2))
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
  timestamps: true,
  // Ensure getters run when converting to JSON or plain objects
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// Compound index for uniqueness/search
inventoryItemSchema.index(
  { brand: 1, type: 1, thicknessMm: 1, sheetLengthMm: 1, sheetWidthMm: 1 }
);

// Virtual: area per unit in sqm
inventoryItemSchema.virtual('areaSqmPerUnit').get(function() {
  if (this.sheetLengthMm && this.sheetWidthMm) {
    return (this.sheetLengthMm * this.sheetWidthMm) / 1_000_000;
  }
  return 0;
});

// Virtual: total area in sqm (includes quantity)
inventoryItemSchema.virtual('totalAreaSqm').get(function() {
  if (this.sheetLengthMm && this.sheetWidthMm && this.currentQuantity) {
    return (this.sheetLengthMm * this.sheetWidthMm * this.currentQuantity) / 1_000_000;
  }
  return 0;
});

// Virtual: display name
inventoryItemSchema.virtual('displayName').get(function() {
  return `${this.brand} - ${this.thicknessMm}mm - ${this.sheetLengthMm}x${this.sheetWidthMm}mm - ${this.type}`;
});

// Virtual: stock valuation (Total Area × Thickness × Rate)
inventoryItemSchema.virtual('stockValuation').get(function() {
  if (this.totalAreaSqm && this.thicknessMm && this.rate) {
    // Formula: total area * thickness * rate
    return this.totalAreaSqm * this.thicknessMm * this.rate;
  }
  return 0;
});

// Pre-save hook: recompute totalSqm
inventoryItemSchema.pre('save', function(next) {
  this.totalSqm = this.areaSqmPerUnit * this.currentQuantity;
  next();
});

export default mongoose.model('InventoryItem', inventoryItemSchema);
