const express = require('express');
const router = express.Router();
const {
  getAdminProfile,
  promoteToAdmin,
  demoteFromAdmin,
  getAdminUsers
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { requireAdmin, requirePermission, checkRouteAccess } = require('../middleware/adminAuth');

// All admin routes require authentication and admin role
router.use(protect);
router.use(requireAdmin);

/**
 * Admin Profile & Management
 */

// Get current admin profile
router.get('/me', getAdminProfile);

// Get all admin users (Super Admin only)
router.get('/admins', requirePermission('can_promote_to_admin'), getAdminUsers);

/**
 * User Management Routes
 */

// Promote user to admin (Super Admin only)
router.post('/users/:id/promote', requirePermission('can_promote_to_admin'), promoteToAdmin);

// Demote admin to regular user (Super Admin only)
router.post('/users/:id/demote', requirePermission('can_promote_to_admin'), demoteFromAdmin);

/**
 * User Management Routes
 */
router.use('/users', require('./adminUser'));

/**
 * Workspace & Project Management Routes
 */
router.use('/', require('./adminWorkspace'));

/**
 * KYC & Billing Management Routes
 */
router.use('/', require('./adminKycBilling'));

/**
 * Contact & Communication Routes
 */
router.use('/', require('./adminContact'));

/**
 * Content Management Routes
 */
router.use('/', require('./adminContent'));

/**
 * Analytics Routes
 */
router.use('/analytics', require('./adminAnalytics'));

module.exports = router;
