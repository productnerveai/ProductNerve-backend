const SupportTicket = require('../models/SupportTicket');
const TicketReply = require('../models/TicketReply');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get all support tickets
 * @route   GET /api/admin/contacts/tickets
 * @access  Admin (can_view_contacts)
 */
exports.getAllTickets = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 25;
  const status = req.query.status || '';
  const priority = req.query.priority || '';
  const type = req.query.type || '';
  const search = req.query.search || '';
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  // Build query
  const query = {};
  
  if (status) {
    query.status = status;
  }

  if (priority) {
    query.priority = priority;
  }

  if (type) {
    query.feedback_type = type;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count
  const total = await SupportTicket.countDocuments(query);

  // Get tickets with user data
  const tickets = await SupportTicket.find(query)
    .populate('user_id', 'email first_name last_name company_name')
    .populate('admin_id', 'first_name last_name')
    .sort({ [sortBy]: sortOrder })
    .skip(page * limit)
    .limit(limit);

  // Get reply counts for each ticket
  const ticketsWithReplies = await Promise.all(tickets.map(async (ticket) => {
    const replyCount = await TicketReply.countDocuments({ ticket_id: ticket._id });
    const lastReply = await TicketReply.findOne({ ticket_id: ticket._id })
      .sort({ createdAt: -1 });

    return {
      id: ticket._id,
      title: ticket.title,
      description: ticket.description,
      feedback_type: ticket.feedback_type,
      status: ticket.status,
      priority: ticket.priority,
      user: ticket.user_id,
      admin: ticket.admin_id,
      admin_response: ticket.admin_response,
      response_date: ticket.response_date,
      resolved_date: ticket.resolved_date,
      closed_date: ticket.closed_date,
      reply_count: replyCount,
      last_reply: lastReply,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt
    };
  }));

  res.status(200).json({
    success: true,
    data: {
      tickets: ticketsWithReplies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * @desc    Get specific ticket details with replies
 * @route   GET /api/admin/contacts/tickets/:id
 * @access  Admin (can_view_contacts)
 */
exports.getTicketById = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('user_id', 'email first_name last_name company_name')
    .populate('admin_id', 'first_name last_name');

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: 'Ticket not found'
    });
  }

  // Get all replies for this ticket
  const replies = await TicketReply.find({ ticket_id: ticket._id })
    .populate('admin_id', 'first_name last_name')
    .populate('user_id', 'first_name last_name')
    .sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    data: {
      ticket: {
        id: ticket._id,
        title: ticket.title,
        description: ticket.description,
        feedback_type: ticket.feedback_type,
        status: ticket.status,
        priority: ticket.priority,
        user: ticket.user_id,
        admin: ticket.admin_id,
        admin_response: ticket.admin_response,
        response_date: ticket.response_date,
        resolved_date: ticket.resolved_date,
        closed_date: ticket.closed_date,
        created_at: ticket.createdAt,
        updated_at: ticket.updatedAt
      },
      replies: replies.map(reply => ({
        id: reply._id,
        message: reply.message,
        is_admin_reply: reply.is_admin_reply,
        admin: reply.admin_id,
        user: reply.user_id,
        created_at: reply.createdAt
      }))
    }
  });
});

/**
 * @desc    Create new support ticket (admin can create on behalf of users)
 * @route   POST /api/admin/contacts/tickets
 * @access  Admin (can_view_contacts)
 */
exports.createTicket = asyncHandler(async (req, res) => {
  const { title, description, feedback_type, priority, user_email } = req.body;

  // Find user by email if creating on behalf of user
  let userId = req.user.id; // Default to admin creating for themselves
  if (user_email) {
    const user = await User.findOne({ email: user_email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    userId = user._id;
  }

  const ticket = await SupportTicket.create({
    user_id: userId,
    title,
    description,
    feedback_type: feedback_type || 'support',
    priority: priority || 'medium'
  });

  const populatedTicket = await SupportTicket.findById(ticket._id)
    .populate('user_id', 'email first_name last_name company_name');

  // Create notification for ticket creation
  await NotificationService.createNotification({
    user_id: userId,
    type: 'ticket_created',
    title: 'Support Ticket Created',
    message: `Your support ticket "${title}" has been created successfully. We'll respond as soon as possible.`,
    metadata: {
      ticket_id: ticket._id,
      ticket_title: title,
      priority: priority || 'medium',
      feedback_type: feedback_type || 'support'
    },
    sendEmail: true
  });

  res.status(201).json({
    success: true,
    data: populatedTicket,
    message: 'Support ticket created successfully'
  });
});

/**
 * @desc    Update ticket status
 * @route   PUT /api/admin/contacts/tickets/:id/status
 * @access  Admin (can_view_contacts)
 */
exports.updateTicketStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status'
    });
  }

  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: 'Ticket not found'
    });
  }

  ticket.status = status;
  ticket.admin_id = req.user.id;

  // Set appropriate timestamps
  if (status === 'resolved') {
    ticket.resolved_date = new Date();
  } else if (status === 'closed') {
    ticket.closed_date = new Date();
  }

  await ticket.save();

  // Create notification for ticket status update
  await NotificationService.createNotification({
    user_id: ticket.user_id,
    type: 'ticket_updated',
    title: `Support Ticket ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your support ticket "${ticket.title}" status has been updated to ${status}.`,
    metadata: {
      ticket_id: ticket._id,
      ticket_title: ticket.title,
      old_status: 'open',
      new_status: status,
      updated_by: req.user.id
    },
    sendEmail: true
  });

  res.status(200).json({
    success: true,
    data: {
      id: ticket._id,
      status: ticket.status,
      admin_id: ticket.admin_id,
      resolved_date: ticket.resolved_date,
      closed_date: ticket.closed_date
    },
    message: `Ticket status updated to ${status}`
  });
});

/**
 * @desc    Reply to ticket
 * @route   POST /api/admin/contacts/tickets/:id/reply
 * @access  Admin (can_view_contacts)
 */
exports.replyToTicket = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Reply message is required'
    });
  }

  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: 'Ticket not found'
    });
  }

  // Create reply
  const reply = await TicketReply.create({
    ticket_id: ticket._id,
    message,
    is_admin_reply: true,
    admin_id: req.user.id
  });

  // Update ticket with admin response
  ticket.admin_response = message;
  ticket.admin_id = req.user.id;
  ticket.response_date = new Date();
  
  // Update status if still open
  if (ticket.status === 'open') {
    ticket.status = 'in_progress';
  }

  await ticket.save();

  // Create notification for admin reply
  await NotificationService.createNotification({
    user_id: ticket.user_id,
    type: 'ticket_responded',
    title: 'Support Ticket Response',
    message: `An admin has responded to your support ticket "${ticket.title}". Check your ticket for details.`,
    metadata: {
      ticket_id: ticket._id,
      ticket_title: ticket.title,
      admin_reply: message,
      responded_by: req.user.id,
      response_date: new Date()
    },
    sendEmail: true
  });

  const populatedReply = await TicketReply.findById(reply._id)
    .populate('admin_id', 'first_name last_name');

  res.status(201).json({
    success: true,
    data: populatedReply,
    message: 'Reply sent successfully'
  });
});

/**
 * @desc    Delete ticket
 * @route   DELETE /api/admin/contacts/tickets/:id
 * @access  Admin (can_view_contacts)
 */
exports.deleteTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: 'Ticket not found'
    });
  }

  // Delete all replies first
  await TicketReply.deleteMany({ ticket_id: ticket._id });

  // Delete ticket
  await SupportTicket.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Ticket deleted successfully'
  });
});

/**
 * @desc    Get ticket statistics
 * @route   GET /api/admin/contacts/tickets/stats
 * @access  Admin (can_view_contacts)
 */
exports.getTicketStats = asyncHandler(async (req, res) => {
  const totalTickets = await SupportTicket.countDocuments();
  const openTickets = await SupportTicket.countDocuments({ status: 'open' });
  const inProgressTickets = await SupportTicket.countDocuments({ status: 'in_progress' });
  const resolvedTickets = await SupportTicket.countDocuments({ status: 'resolved' });
  const closedTickets = await SupportTicket.countDocuments({ status: 'closed' });

  // Priority distribution
  const urgentTickets = await SupportTicket.countDocuments({ priority: 'urgent' });
  const highTickets = await SupportTicket.countDocuments({ priority: 'high' });
  const mediumTickets = await SupportTicket.countDocuments({ priority: 'medium' });
  const lowTickets = await SupportTicket.countDocuments({ priority: 'low' });

  // Type distribution
  const supportTickets = await SupportTicket.countDocuments({ feedback_type: 'support' });
  const bugTickets = await SupportTicket.countDocuments({ feedback_type: 'bug' });
  const featureTickets = await SupportTicket.countDocuments({ feedback_type: 'feature' });
  const feedbackTickets = await SupportTicket.countDocuments({ feedback_type: 'feedback' });

  // Response time stats (average time to first response)
  const responseTimeStats = await SupportTicket.aggregate([
    {
      $match: {
        response_date: { $exists: true },
        createdAt: { $exists: true }
      }
    },
    {
      $addFields: {
        responseTimeHours: {
          $divide: [
            { $subtract: ['$response_date', '$createdAt'] },
            1000 * 60 * 60 // Convert to hours
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: '$responseTimeHours' },
        minResponseTime: { $min: '$responseTimeHours' },
        maxResponseTime: { $max: '$responseTimeHours' }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      total: totalTickets,
      by_status: {
        open: openTickets,
        in_progress: inProgressTickets,
        resolved: resolvedTickets,
        closed: closedTickets
      },
      by_priority: {
        urgent: urgentTickets,
        high: highTickets,
        medium: mediumTickets,
        low: lowTickets
      },
      by_type: {
        support: supportTickets,
        bug: bugTickets,
        feature: featureTickets,
        feedback: feedbackTickets
      },
      response_time: responseTimeStats[0] || {
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0
      }
    }
  });
});
