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

module.exports = router;
