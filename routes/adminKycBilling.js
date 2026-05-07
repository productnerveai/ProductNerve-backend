const express = require('express');
const router = express.Router();
const {
  getAllKycSubmissions,
  getKycById,
  approveKyc,
  rejectKyc,
  getBillingOverview,
  getBillingTransactions,
  grantSubscriptionAccess
} = require('../controllers/adminKycBillingController');
const { protect } = require('../middleware/auth');
const { requireAdmin, requirePermission } = require('../middleware/adminAuth');

// All KYC and billing routes require authentication and admin access
router.use(protect);
router.use(requireAdmin);

/**
 * KYC Management Routes
 */

// Get all KYC submissions
router.get('/kyc', requirePermission('can_view_kyc'), getAllKycSubmissions);

// Get specific KYC submission
router.get('/kyc/:id', requirePermission('can_view_kyc'), getKycById);

// Approve KYC submission
router.put('/kyc/:id/approve', requirePermission('can_view_kyc'), approveKyc);

// Reject KYC submission
router.put('/kyc/:id/reject', requirePermission('can_view_kyc'), rejectKyc);

/**
 * Billing Management Routes
 */

// Get billing overview
router.get('/billing/overview', requirePermission('can_manage_billing'), getBillingOverview);

// Get billing transactions
router.get('/billing/transactions', requirePermission('can_manage_billing'), getBillingTransactions);

// Grant subscription access
router.post('/billing/grant-access', requirePermission('can_manage_billing'), grantSubscriptionAccess);

module.exports = router;
