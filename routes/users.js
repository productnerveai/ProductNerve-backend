const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  getUserLimits,
  getUserById,
  updateUserStatus,
  getAllUsers
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// User profile routes
router.get('/profile', protect, getUserProfile);
router.get('/limits', protect, getUserLimits);

// Admin only routes
router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/:id', protect, authorize('admin'), getUserById);
router.put('/:id/status', protect, authorize('admin'), updateUserStatus);

module.exports = router;
