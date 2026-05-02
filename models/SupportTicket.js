const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  title: {
    type: String,
    required: [true, 'Ticket title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Ticket description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  feedback_type: {
    type: String,
    required: [true, 'Feedback type is required'],
    enum: ['support', 'bug', 'feature', 'feedback'],
    default: 'support'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  admin_response: {
    type: String,
    maxlength: [2000, 'Response cannot exceed 2000 characters']
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  response_date: Date,
  resolved_date: Date,
  closed_date: Date
}, {
  timestamps: true
});

// Index for faster queries
supportTicketSchema.index({ user_id: 1, created_at: -1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ feedback_type: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
