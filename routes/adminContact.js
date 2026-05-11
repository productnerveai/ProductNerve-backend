const express = require('express');
const router = express.Router();
const {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
  replyToTicket,
  deleteTicket,
  getTicketStats
} = require('../controllers/adminContactController');
const {
  getAllBroadcasts,
  getAllNotifications,
  createBroadcast,
  resendNotification,
  archiveNotification,
  unarchiveNotification,
  deleteNotification
} = require('../controllers/adminCommunicationController');
const { protect } = require('../middleware/auth');
const { requireAdmin, requirePermission } = require('../middleware/adminAuth');

// All contact center routes require authentication and admin access
router.use(protect);
router.use(requireAdmin);

/**
 * Support Ticket Management
 */

// Get all support tickets
router.get('/contacts/tickets', requirePermission('can_view_contacts'), getAllTickets);

// Get ticket statistics
router.get('/contacts/tickets/stats', requirePermission('can_view_contacts'), getTicketStats);

// Get specific ticket with replies
router.get('/contacts/tickets/:id', requirePermission('can_view_contacts'), getTicketById);

// Create new support ticket
router.post('/contacts/tickets', requirePermission('can_view_contacts'), createTicket);

// Update ticket status
router.put('/contacts/tickets/:id/status', requirePermission('can_view_contacts'), updateTicketStatus);

// Reply to ticket
router.post('/contacts/tickets/:id/reply', requirePermission('can_view_contacts'), replyToTicket);

// Delete ticket
router.delete('/contacts/tickets/:id', requirePermission('can_view_contacts'), deleteTicket);

// Get ticket statistics
router.get('/contacts/tickets/stats', requirePermission('can_view_contacts'), getTicketStats);

/**
 * Communication Management Routes
 */

// Get all broadcasts
router.get('/communications/broadcasts', requirePermission('can_view_contacts'), getAllBroadcasts);

// Get all notifications
router.get('/communications/notifications', requirePermission('can_view_contacts'), getAllNotifications);

// Create new broadcast
router.post('/communications/broadcasts', requirePermission('can_view_contacts'), createBroadcast);

// Resend notification
router.post('/communications/notifications/:id/resend', requirePermission('can_view_contacts'), resendNotification);

// Archive notification
router.put('/communications/notifications/:id/archive', requirePermission('can_view_contacts'), archiveNotification);

// Delete notification
router.delete('/communications/notifications/:id', requirePermission('can_view_contacts'), deleteNotification);

module.exports = router;
