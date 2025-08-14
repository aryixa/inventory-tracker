// server/routes/inventory.js
import express from 'express';
import {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryQuantity,
  deleteInventoryItem
} from '../controllers/inventoryController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateInventoryItem, validateTransaction } from '../middleware/validation.js';

import { validateMongoIdParam } from '../middleware/validation.js';
const router = express.Router();
router.use(protect);
router.route('/')
  .get(authorize('Admin', 'User', 'Viewer'), getInventoryItems)
  .post(authorize('Admin'), validateInventoryItem, createInventoryItem);

router.route('/:id')
  
  .get(authorize('Admin', 'User', 'Viewer'), getInventoryItem)
  
  .delete(authorize('Admin'), deleteInventoryItem);

router.put(
  '/:id/quantity',
  authorize('Admin', 'User'),  
  validateMongoIdParam,  
  validateTransaction,
  updateInventoryQuantity
);

export default router;
