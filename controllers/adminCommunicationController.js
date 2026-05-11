const asyncHandler = require('../middleware/asyncHandler');
const Broadcast = require('../models/Broadcast');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('../config/email');

// @desc    Get all broadcasts
// @route   GET /api/admin/communications/broadcasts
// @access  Admin (can_view_contacts)
exports.getAllBroadcasts = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    console.log('getAllBroadcasts - page:', page, 'limit:', limit, 'status:', status);

    // Build query
    const query = {};
    if (status) query.status = status;

    console.log('Broadcast query:', query);

    const broadcasts = await Broadcast.find(query)
      .populate('created_by', 'first_name last_name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    console.log('Broadcasts found:', broadcasts.length);

    const total = await Broadcast.countDocuments(query);
    console.log('Total broadcasts:', total);

    res.status(200).json({
      success: true,
      data: {
        broadcasts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load broadcasts'
    });
  }
});

// @desc    Get all notifications
// @route   GET /api/admin/communications/notifications
// @access  Admin (can_view_contacts)
exports.getAllNotifications = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type;
    const read = req.query.read;
    const includeArchived = req.query.include_archived === 'true';

    console.log('getAllNotifications - page:', page, 'limit:', limit, 'type:', type, 'read:', read, 'includeArchived:', includeArchived);

    // Build query
    const query = {};
    if (type) query.type = type;
    if (read !== undefined) query.read = read === 'true';
    if (!includeArchived) query.archived = { $ne: true }; // Only exclude explicitly archived notifications

    console.log('Notification query:', query);

    const notifications = await Notification.find(query)
      .populate('user_id', 'first_name last_name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    console.log('Notifications found:', notifications.length);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ ...query, read: false, archived: { $ne: true } });

    console.log('Total notifications:', total, 'unread:', unreadCount);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          unread: unreadCount,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load notifications'
    });
  }
});

// @desc    Create new broadcast
// @route   POST /api/admin/communications/broadcasts
// @access  Admin (can_view_contacts)
exports.createBroadcast = asyncHandler(async (req, res) => {
  try {
    const { title, message, channel, target_group } = req.body;

    // Create broadcast in database
    const broadcast = await Broadcast.create({
      title,
      message,
      channel,
      target_group,
      created_by: req.user.id,
      status: 'draft'
    });

    // Populate created_by field
    await broadcast.populate('created_by', 'first_name last_name email');

    res.status(201).json({
      success: true,
      data: broadcast,
      message: 'Broadcast created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create broadcast'
    });
  }
});

// @desc    Resend notification
// @route   POST /api/admin/communications/notifications/:id/resend
// @access  Admin (can_view_contacts)
exports.resendNotification = asyncHandler(async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id).populate('user_id');
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    if (!notification.user_id) {
      return res.status(400).json({
        success: false,
        error: 'Notification has no associated user'
      });
    }

    // Send email
    const emailResult = await sendEmail({
      to: notification.user_id.email,
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${notification.title}</h2>
          <p style="color: #666; line-height: 1.6;">${notification.message}</p>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            This is an automated notification from ProductNerve.
          </p>
        </div>
      `
    });

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send email'
      });
    }

    // Create a new notification with the same details
    const newNotification = await Notification.create({
      user_id: notification.user_id._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
      read: false
    });

    // Populate user_id
    await newNotification.populate('user_id', 'first_name last_name email');

    res.status(200).json({
      success: true,
      data: newNotification,
      message: 'Notification resent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resend notification'
    });
  }
});

// @desc    Archive notification
// @route   PUT /api/admin/communications/notifications/:id/archive
// @access  Admin (can_view_contacts)
exports.archiveNotification = asyncHandler(async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { archived: true },
      { new: true, runValidators: true }
    ).populate('user_id', 'first_name last_name email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification archived successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to archive notification'
    });
  }
});

// @desc    Unarchive notification
// @route   PUT /api/admin/communications/notifications/:id/unarchive
// @access  Admin (can_view_contacts)
exports.unarchiveNotification = asyncHandler(async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { archived: false },
      { new: true, runValidators: true }
    ).populate('user_id', 'first_name last_name email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification unarchived successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to unarchive notification'
    });
  }
});

// @desc    Delete notification
// @route   DELETE /api/admin/communications/notifications/:id
// @access  Admin (can_view_contacts)
exports.deleteNotification = asyncHandler(async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});
