// server/routes/inventory.js
import express from 'express';
import {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryQuantity,
  deleteInventoryItem,
  updateInventoryItem,
  getInventoryCategories,
  getItemsByCategory,
} from '../controllers/inventoryController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  validateInventoryItem,
  validateTransaction,
  validateMongoIdParam,
  validateInventoryUpdate, 
} from '../middleware/validation.js';
import { accountLimiter } from '../middleware/rateLimiters.js';


const router = express.Router();

// All inventory routes require authentication
router.use(protect, accountLimiter);

router.route('/')
  .get(authorize('Admin', 'User', 'Viewer'), getInventoryItems)
  .post(authorize('Admin'), validateInventoryItem, createInventoryItem);

router.get(
  '/categories',
  authorize('Admin'),
  getInventoryCategories
);

router.get(
  '/by-category',
  authorize('Admin'),
  getItemsByCategory
);

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
router.put(
  '/:id',
  authorize('Admin'),           
  validateMongoIdParam,  
  validateInventoryUpdate,       
  updateInventoryItem         
);

export default router;
