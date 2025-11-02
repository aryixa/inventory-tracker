// server/routes/transactions.js
import express from 'express';
import {
  getTransactions,
  getTransaction,
  getTransactionStats
} from '../controllers/transactionController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateMongoIdParam } from '../middleware/validation.js';
import { accountLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// All transaction routes require authentication
router.use(protect, accountLimiter);
// List all transactions — adjust roles as needed
router.get(
  '/',
  authorize('Admin', 'User', 'Viewer'),
  getTransactions
);

// Stats endpoint — typically admin‑only
router.get(
  '/stats',
  authorize('Admin'),
  getTransactionStats
);

// Single transaction by ID
router.get(
  '/:id',
  authorize('Admin', 'User', 'Viewer'),
  validateMongoIdParam,
  getTransaction
);

export default router;
