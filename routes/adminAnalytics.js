const express = require('express');
const router = express.Router();
const {
  getPlatformAnalytics,
  getProductAnalytics,
  getGrowthAnalytics,
  getStudioAnalytics
} = require('../controllers/adminAnalyticsController');
const { protect } = require('../middleware/auth');
const { requireAdmin, requirePermission } = require('../middleware/adminAuth');

// All analytics routes require authentication and admin access
router.use(protect);
router.use(requireAdmin);
router.use(requirePermission('can_view_analytics'));

/**
 * Platform Analytics
 */
router.get('/platform', getPlatformAnalytics);

/**
 * Product Analytics  
 */
router.get('/product', getProductAnalytics);

/**
 * Growth Analytics
 */
router.get('/growth', getGrowthAnalytics);

/**
 * Studio Analytics
 */
router.get('/studio', getStudioAnalytics);

module.exports = router;
