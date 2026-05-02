const express = require('express');
const router = express.Router();
const {
  createTicket,
  getUserTickets,
  getTicket,
  updateTicket,
  closeTicket,
  getAllTickets,
  updateTicketAdmin
} = require('../controllers/supportController');
const { protect } = require('../middleware/auth');
const {
  validateCreateTicket,
  validateUpdateTicket,
  validateUpdateTicketAdmin
} = require('../middleware/validator');

// User routes
router.post('/tickets', protect, validateCreateTicket, createTicket);
router.get('/tickets', protect, getUserTickets);
router.get('/tickets/:id', protect, getTicket);
router.put('/tickets/:id', protect, validateUpdateTicket, updateTicket);
router.post('/tickets/:id/close', protect, closeTicket);

// Admin routes
router.get('/admin/tickets', protect, getAllTickets);
router.put('/admin/tickets/:id', protect, validateUpdateTicketAdmin, updateTicketAdmin);

module.exports = router;
