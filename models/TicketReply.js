const mongoose = require('mongoose');

const ticketReplySchema = new mongoose.Schema({
  ticket_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportTicket',
    required: [true, 'Ticket ID is required']
  },
  message: {
    type: String,
    required: [true, 'Reply message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  is_admin_reply: {
    type: Boolean,
    default: false
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
ticketReplySchema.index({ ticket_id: 1, created_at: 1 });

module.exports = mongoose.model('TicketReply', ticketReplySchema);
