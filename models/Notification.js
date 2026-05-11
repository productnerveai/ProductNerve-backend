const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please add a user ID']
  },
  type: {
    type: String,
    required: [true, 'Please add a notification type'],
    enum: ['account_suspended', 'account_activated', 'account_deactivated', 'admin_promotion', 'admin_demotion', 'access_granted', 'payment_received', 'project_unlocked', 'profile_completion_reminder', 'kyc_approved', 'kyc_rejected', 'ticket_created', 'ticket_updated', 'ticket_responded', 'system_update'],
    default: 'system_update'
  },
  title: {
    type: String,
    required: [true, 'Please add a notification title'],
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Please add a notification message'],
    maxlength: [1000, 'Message cannot be more than 1000 characters']
  },
  read: {
    type: Boolean,
    default: false
  },
  archived: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ user_id: 1, read: 1, created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
