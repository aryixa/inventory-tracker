import express from 'express';
import {
  exportInventory,
  exportTransactions,
  exportComplete
} from '../controllers/exportController.js';
import { protect, authorize } from '../middleware/auth.js';
import { accountLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, accountLimiter);
router.use(authorize('Admin'));

router.get('/inventory', exportInventory);
router.get('/transactions', exportTransactions);
router.get('/complete', exportComplete);

export default router;