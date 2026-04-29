// server/routes/bookings.js
import express from 'express';
import {
  createBooking,
  getBookings,
  approveBooking,
  rejectBooking,
  cancelBooking,
  getBookingStats,
  deleteBooking,
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  validateBooking,
  validateMongoIdParam,
  validateBookingRejection,
} from '../middleware/validation.js';
import { accountLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// All booking routes require authentication
router.use(protect, accountLimiter);

router.route('/')
  .get(authorize('Admin', 'User', 'Viewer'), getBookings)
  .post(authorize('Admin', 'User'), validateBooking, createBooking);

router.get(
  '/stats',
  authorize('Admin'),
  getBookingStats
);

router.patch(
  '/:id/approve',
  authorize('Admin'),
  validateMongoIdParam,
  approveBooking
);

router.patch(
  '/:id/reject',
  authorize('Admin'),
  validateMongoIdParam,
  validateBookingRejection,
  rejectBooking
);

router.patch(
  '/:id/cancel',
  authorize('Admin'),
  validateMongoIdParam,
  cancelBooking
);

router.delete(
  '/:id',
  authorize('Admin'),
  validateMongoIdParam,
  deleteBooking
);

export default router;
