import express from 'express';
import {
  getTransactions,
  getTransaction,
  getTransactionStats
} from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/', getTransactions);
router.get('/stats', getTransactionStats);
router.get('/:id', getTransaction);

export default router;