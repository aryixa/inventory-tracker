// server\middleware\validation.js
import { body, validationResult } from 'express-validator';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// User validation rules
export const validateUserRegistration = [
  body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long')
    .isLength({ max: 30 })
    .withMessage('Username cannot exceed 30 characters'),
  
  // Update this section to only check for a minimum length of 5.
  body('password')
    .isLength({ min: 5 })
    .withMessage('Password must be at least 5 characters long'),
  
  handleValidationErrors,
];

// Existing validation for password changes
export const validatePasswordChange = [
  body('newPassword')
    .isLength({ min: 5 })
    .withMessage('New password must be at least 5 characters long'),
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

  handleValidationErrors
];

// Inventory item validation rules
export const validateInventoryItem = [
  body('thickness')
    .trim()
    .notEmpty()
    .withMessage('Thickness is required')
    .isLength({ max: 50 })
    .withMessage('Thickness cannot exceed 50 characters'),

  body('sheetSize')
    .trim()
    .notEmpty()
    .withMessage('Sheet size is required')
    .isLength({ max: 50 })
    .withMessage('Sheet size cannot exceed 50 characters'),

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

  handleValidationErrors
];

// Transaction validation rules
export const validateTransaction = [
  // body('itemId')
  //   .isMongoId()
  //   .withMessage('Valid item ID is required'),

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
// Add this new validator for admin's create-user endpoint
export const validateAdminUserCreation = [
  body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long')
    .isLength({ max: 30 })
    .withMessage('Username cannot exceed 30 characters'),

  body('password')
    .isLength({ min: 5 })
    .withMessage('Password must be at least 5 characters long'),

  body('role')
    .optional()
    .isIn(['User', 'Viewer']) // Admin can only create standard or viewer accounts
    .withMessage("Role must be either 'User' or 'Viewer'"),

  handleValidationErrors,
];
