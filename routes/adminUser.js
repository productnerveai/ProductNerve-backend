const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  getUserProjects,
  updateUserStatus,
  updateUserSubscription,
  grantTemporaryAccess,
  promoteToAdmin,
  deleteUser
} = require('../controllers/adminUserController');
const { protect } = require('../middleware/auth');
const { requireAdmin, requirePermission } = require('../middleware/adminAuth');

// All user management routes require authentication and admin access
router.use(protect);
router.use(requireAdmin);

/**
 * User CRUD Operations
 */

// Get all users with pagination and filtering
router.get('/', requirePermission('can_manage_users'), getAllUsers);

// Get user's projects
router.get('/:id/projects', requirePermission('can_manage_users'), getUserProjects);

// Get specific user details (must come after specific routes)
router.get('/:id', requirePermission('can_manage_users'), getUserById);

// Get multiple users by IDs
router.post('/bulk', requirePermission('can_manage_users'), require('../controllers/adminUserController').getUsersByIds);

/**
 * User Status Management
 */

// Update user status
router.put('/:id/status', requirePermission('can_manage_users'), updateUserStatus);

/**
 * User Subscription Management
 */

// Update user subscription
router.put('/:id/subscription', requirePermission('can_manage_billing'), updateUserSubscription);

// Grant temporary access
router.post('/:id/grant-access', requirePermission('can_manage_users'), grantTemporaryAccess);

/**
 * User Deletion
 */

// Delete user (Super Admin only)
router.delete('/:id', requirePermission('can_promote_to_admin'), deleteUser);

module.exports = router;
