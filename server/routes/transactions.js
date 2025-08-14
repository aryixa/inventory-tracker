import express from 'express';
import {
  getTransactions,
  getTransaction,
  getTransactionStats
} from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';
import { validateMongoIdParam } from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/', getTransactions);
router.get('/stats', getTransactionStats);
router.get('/:id', validateMongoIdParam, getTransaction);
export default router;