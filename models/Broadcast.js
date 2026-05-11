const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Broadcast title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Broadcast message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  channel: {
    type: String,
    required: [true, 'Channel is required'],
    enum: ['email', 'in_app', 'sms'],
    default: 'in_app'
  },
  target_group: {
    type: String,
    required: [true, 'Target group is required'],
    enum: ['all_users', 'active_users', 'pro_users', 'free_users', 'beta_users'],
    default: 'all_users'
  },
  sent_count: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sent', 'failed'],
    default: 'draft'
  },
  scheduled_at: {
    type: Date
  },
  sent_at: {
    type: Date
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  }
}, {
  timestamps: true
});

// Index for better query performance
broadcastSchema.index({ created_at: -1 });
broadcastSchema.index({ status: 1 });
broadcastSchema.index({ channel: 1 });

module.exports = mongoose.model('Broadcast', broadcastSchema);
