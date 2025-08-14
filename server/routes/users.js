// server/routes/users.js
import express from 'express';
import {
  getUsers,
  createUser,
  changeUserPassword,
  deactivateUser
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  validateAdminUserCreation,
  validatePasswordChange,
   validateMongoIdParam
} from '../middleware/validation.js';

const router = express.Router();

router.use(protect);
router.use(authorize('Admin'));


router.route('/')
  .get(getUsers)
  .post(validateAdminUserCreation, createUser);


router.route('/:id')
  .delete(validateMongoIdParam, deactivateUser);
router.put('/:id/password',   validateMongoIdParam,  validatePasswordChange, changeUserPassword);

export default router;
