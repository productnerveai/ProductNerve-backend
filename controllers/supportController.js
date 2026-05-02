const SupportTicket = require('../models/SupportTicket');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Create a new support ticket
// @route   POST /api/support/tickets
// @access  Private
exports.createTicket = asyncHandler(async (req, res) => {
  const { title, description, feedback_type } = req.body;

  const ticket = await SupportTicket.create({
    user_id: req.user.id,
    title,
    description,
    feedback_type
  });

  res.status(201).json({
    success: true,
    data: ticket
  });
});

// @desc    Get user's support tickets
// @route   GET /api/support/tickets
// @access  Private
exports.getUserTickets = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status;
  const type = req.query.type;

  // Build query
  const query = { user_id: req.user.id };
  if (status) query.status = status;
  if (type) query.feedback_type = type;

  const tickets = await SupportTicket.find(query)
    .sort({ created_at: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .populate('admin_id', 'first_name last_name email');

  const total = await SupportTicket.countDocuments(query);

  res.status(200).json({
    success: true,
    data: tickets,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get single ticket details
// @route   GET /api/support/tickets/:id
// @access  Private
exports.getTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({
    _id: req.params.id,
    user_id: req.user.id
  }).populate('admin_id', 'first_name last_name email');

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: 'Ticket not found'
    });
  }

  res.status(200).json({
    success: true,
    data: ticket
  });
});

// @desc    Update ticket (add response, change status)
// @route   PUT /api/support/tickets/:id
// @access  Private
exports.updateTicket = asyncHandler(async (req, res) => {
  const { description, feedback_type } = req.body;

  const ticket = await SupportTicket.findOne({
    _id: req.params.id,
    user_id: req.user.id
  });

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: 'Ticket not found'
    });
  }

  // Only allow updating description and feedback_type for user
  if (description) ticket.description = description;
  if (feedback_type) ticket.feedback_type = feedback_type;

  await ticket.save();

  res.status(200).json({
    success: true,
    data: ticket
  });
});

// @desc    Close ticket
// @route   POST /api/support/tickets/:id/close
// @access  Private
exports.closeTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({
    _id: req.params.id,
    user_id: req.user.id
  });

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: 'Ticket not found'
    });
  }

  if (ticket.status === 'closed') {
    return res.status(400).json({
      success: false,
      error: 'Ticket is already closed'
    });
  }

  ticket.status = 'closed';
  ticket.closed_date = new Date();
  await ticket.save();

  res.status(200).json({
    success: true,
    data: ticket
  });
});

// Admin endpoints

// @desc    Get all tickets (admin)
// @route   GET /api/support/admin/tickets
// @access  Private (Admin only)
exports.getAllTickets = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const status = req.query.status;
  const type = req.query.type;
  const priority = req.query.priority;

  // Build query
  const query = {};
  if (status) query.status = status;
  if (type) query.feedback_type = type;
  if (priority) query.priority = priority;

  const tickets = await SupportTicket.find(query)
    .sort({ created_at: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .populate('user_id', 'first_name last_name email')
    .populate('admin_id', 'first_name last_name email');

  const total = await SupportTicket.countDocuments(query);

  res.status(200).json({
    success: true,
    data: tickets,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Update ticket status and add response (admin)
// @route   PUT /api/support/admin/tickets/:id
// @access  Private (Admin only)
exports.updateTicketAdmin = asyncHandler(async (req, res) => {
  const { status, priority, admin_response } = req.body;

  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: 'Ticket not found'
    });
  }

  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;
  if (admin_response) {
    ticket.admin_response = admin_response;
    ticket.admin_id = req.user.id;
    ticket.response_date = new Date();
  }

  // Set resolved date when status changes to resolved
  if (status === 'resolved' && ticket.status !== 'resolved') {
    ticket.resolved_date = new Date();
  }

  await ticket.save();

  res.status(200).json({
    success: true,
    data: ticket
  });
});
