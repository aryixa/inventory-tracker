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
import {
  validateInventoryItem,
  validateTransaction,
  validateMongoIdParam
} from '../middleware/validation.js';

const router = express.Router();

// All inventory routes require authentication
router.use(protect);

router.route('/')
  .get(authorize('Admin', 'User', 'Viewer'), getInventoryItems)
  .post(authorize('Admin'), validateInventoryItem, createInventoryItem);

router.route('/:id')
  .get(authorize('Admin', 'User', 'Viewer'), validateMongoIdParam, getInventoryItem)
  .delete(authorize('Admin'), validateMongoIdParam, deleteInventoryItem);

router.put(
  '/:id/quantity',
  authorize('Admin', 'User'),
  validateMongoIdParam,
  validateTransaction,
  updateInventoryQuantity
);

export default router;
