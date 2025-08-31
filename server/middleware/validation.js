//server\middleware\validation.js
import { body, validationResult, param } from 'express-validator';

// Handles validation errors and sends a consistent, structured response
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// Reusable rules for a secure password policy
const passwordComplexityRules = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Reusable validator for ID parameters in the URL
export const validateMongoIdParam = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  handleValidationErrors,
];

// User validation rules
export const validateUserRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters long'),
  ...passwordComplexityRules,
  handleValidationErrors,
];

export const validateUserLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

// Password change validation
export const validatePasswordChange = [
  body('newPassword')
    .isLength({ min: 5 })
    .withMessage('New password must be at least 5 characters long'),
  handleValidationErrors,
];

// Inventory item validation rules — canonical schema
export const validateInventoryItem = [
  body('thicknessMm')
    .isFloat({ gt: 0 })
    .withMessage('thicknessMm must be a positive number (mm)')
    .matches(/^\d+(\.\d{1,2})?$/)
    .withMessage('thicknessMm can have at most 2 decimal places'),
  body('sheetLengthMm')
    .isFloat({ gt: 0 })
    .withMessage('sheetLengthMm must be a positive number (mm)'),
  body('sheetWidthMm')
    .isFloat({ gt: 0 })
    .withMessage('sheetWidthMm must be a positive number (mm)'),
  body('brand')
    .trim()
    .notEmpty()
    .withMessage('Brand is required')
    .isLength({ max: 100 })
    .withMessage('Brand cannot exceed 100 characters'),
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Type is required')
    .isLength({ max: 100 })
    .withMessage('Type cannot exceed 100 characters'),
  body('initialQuantity')
    .isInt({ min: 0 })
    .withMessage('Initial quantity must be a non-negative integer'),
  handleValidationErrors,
];


// Transaction validation rules
export const validateTransaction = [
  body('transactionType')
    .isIn(['addition', 'reduction'])
    .withMessage('Transaction type must be either addition or reduction'),
  body('quantityChanged')
    .isInt({ min: 1 })
    .withMessage('Quantity changed must be a positive integer'),
  body('reductionReason')
    .if(body('transactionType').equals('reduction'))
    .isIn(['usage', 'breakage'])
    .withMessage('Reduction reason must be either usage or breakage'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors
];

// Admin user creation validation rules
export const validateAdminUserCreation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters long'),
  ...passwordComplexityRules,
  body('role')
    .optional()
    .isIn(['User', 'Viewer'])
    .withMessage("Role must be either 'User' or 'Viewer'"),
  handleValidationErrors,
];
