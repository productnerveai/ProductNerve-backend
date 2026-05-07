const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// All notification routes require authentication
router.use(protect);

/**
 * Notification Management
 */

// Get user notifications with pagination
router.get('/', getUserNotifications);

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Mark all notifications as read
router.put('/mark-all-read', markAllAsRead);

// Mark specific notification as read
router.put('/:id/read', markAsRead);

// Delete specific notification
router.delete('/:id', deleteNotification);

module.exports = router;
