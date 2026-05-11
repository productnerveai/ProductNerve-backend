const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get all KYC submissions
 * @route   GET /api/admin/kyc
 * @access  Admin (can_view_kyc)
 */
exports.getAllKycSubmissions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 25;
  const status = req.query.status || '';
  const sortBy = req.query.sortBy || 'profile_submission_date';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  // Build query - include users who have submitted or pending KYC
  const query = {
    profile_completion_status: { $in: ['pending', 'submitted', 'approved', 'rejected'] }
  };
  
  if (status) {
    query.profile_completion_status = status;
  }

  // Get total count
  console.log('KYC Query:', query);
  const total = await User.countDocuments(query);
  console.log('KYC Total Count:', total);

  // Get users with KYC submissions
  const users = await User.find(query)
    .select('email first_name last_name company_name official_company_name phone registration_number website custom_email profile_completion_status profile_submission_date profile_review_date profile_review_notes profile_document_url')
    .sort({ [sortBy]: sortOrder })
    .skip(page * limit)
    .limit(limit);

  const kycSubmissions = users.map(user => ({
    id: user._id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    company_name: user.company_name,
    official_company_name: user.official_company_name,
    phone: user.phone,
    registration_number: user.registration_number,
    website: user.website,
    custom_email: user.custom_email,
    profile_completion_status: user.profile_completion_status,
    profile_submission_date: user.profile_submission_date,
    profile_review_date: user.profile_review_date,
    profile_review_notes: user.profile_review_notes,
    profile_document_url: user.profile_document_url,
    created_at: user.profile_submission_date  // Use submission date as created_at
  }));

  console.log('KYC Response Data:', {
    success: true,
    data: {
      submissions: kycSubmissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });

  res.status(200).json({
    success: true,
    data: {
      submissions: kycSubmissions,
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
 * @desc    Get specific KYC submission details
 * @route   GET /api/admin/kyc/:id
 * @access  Admin (can_view_kyc)
 */
exports.getKycById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'email first_name last_name company_name official_company_name registration_number website custom_email phone profile_completion_status profile_document_url profile_submission_date profile_review_date profile_review_notes profile_notification_schedule'
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  if (user.profile_completion_status === 'not_submitted') {
    return res.status(404).json({
      success: false,
      error: 'No KYC submission found for this user'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      company_name: user.company_name,
      official_company_name: user.official_company_name,
      registration_number: user.registration_number,
      website: user.website,
      custom_email: user.custom_email,
      phone: user.phone,
      profile_completion_status: user.profile_completion_status,
      profile_document_url: user.profile_document_url,
      profile_submission_date: user.profile_submission_date,
      profile_review_date: user.profile_review_date,
      profile_review_notes: user.profile_review_notes,
      profile_notification_schedule: user.profile_notification_schedule
    }
  });
});

/**
 * @desc    Approve KYC submission
 * @route   PUT /api/admin/kyc/:id/approve
 * @access  Admin (can_view_kyc)
 */
exports.approveKyc = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  if (user.profile_completion_status === 'not_submitted') {
    return res.status(400).json({
      success: false,
      error: 'No KYC submission found for this user'
    });
  }

  user.profile_completion_status = 'approved';
  user.profile_review_date = new Date();
  user.profile_review_notes = notes || '';
  
  // Clear notification schedule
  user.profile_notification_schedule = {
    last_6h_notification: null,
    last_24h_notification: null,
    last_3d_notification: null,
    last_7d_notification: null,
    last_weekly_notification: null,
    weekly_notification_count: 0
  };

  await user.save();

  // Create notification for KYC approval
  await NotificationService.createNotification({
    user_id: user._id,
    type: 'kyc_approved',
    title: 'KYC Verification Approved',
    message: 'Your KYC verification has been approved. You now have full access to all platform features.',
    metadata: {
      approval_date: new Date(),
      reviewer_notes: notes || '',
      company_name: user.company_name
    },
    sendEmail: true
  });

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      profile_completion_status: user.profile_completion_status,
      profile_review_date: user.profile_review_date
    },
    message: 'KYC submission approved successfully'
  });
});

/**
 * @desc    Reject KYC submission
 * @route   PUT /api/admin/kyc/:id/reject
 * @access  Admin (can_view_kyc)
 */
exports.rejectKyc = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  if (!notes) {
    return res.status(400).json({
      success: false,
      error: 'Rejection notes are required'
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  if (user.profile_completion_status === 'not_submitted') {
    return res.status(400).json({
      success: false,
      error: 'No KYC submission found for this user'
    });
  }

  user.profile_completion_status = 'rejected';
  user.profile_review_date = new Date();
  user.profile_review_notes = notes;
  
  // Reset notification schedule for resubmission
  user.profile_notification_schedule = {
    last_6h_notification: null,
    last_24h_notification: null,
    last_3d_notification: null,
    last_7d_notification: null,
    last_weekly_notification: null,
    weekly_notification_count: 0
  };

  await user.save();

  // Create notification for KYC rejection
  await NotificationService.createNotification({
    user_id: user._id,
    type: 'kyc_rejected',
    title: 'KYC Verification Rejected',
    message: `Your KYC verification has been rejected. Reason: ${notes}`,
    metadata: {
      rejection_date: new Date(),
      rejection_reason: notes,
      company_name: user.company_name,
      can_resubmit: true
    },
    sendEmail: true
  });

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      profile_completion_status: user.profile_completion_status,
      profile_review_date: user.profile_review_date,
      profile_review_notes: user.profile_review_notes
    },
    message: 'KYC submission rejected'
  });
});

/**
 * @desc    Get billing overview
 * @route   GET /api/admin/billing/overview
 * @access  Admin (can_manage_billing)
 */
exports.getBillingOverview = asyncHandler(async (req, res) => {
  const { timeRange = '30d' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let startDate;
  switch (timeRange) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(0);
  }

  // User subscription stats
  const totalUsers = await User.countDocuments();
  const freeUsers = await User.countDocuments({ plan_type: 'free' });
  const proUsers = await User.countDocuments({ plan_type: 'pro' });
  const enterpriseUsers = await User.countDocuments({ plan_type: 'enterprise' });
  const projectUnlockUsers = await User.countDocuments({ plan_type: 'project_unlock' });

  // Active subscriptions
  const activeSubscriptions = await User.countDocuments({
    subscription_status: 'active',
    subscription_end: { $gt: new Date() }
  });

  // Revenue calculation (this would typically come from payment data)
  // For now, estimating based on subscription plans
  const estimatedMRR = (proUsers * 16.99) + (enterpriseUsers * 99.99); // Estimated pricing
  const estimatedARR = estimatedMRR * 12;

  // Recent subscription changes
  const newSubscriptions = await User.countDocuments({
    subscription_start: { $gte: startDate },
    subscription_status: 'active'
  });

  const cancelledSubscriptions = await User.countDocuments({
    subscription_status: 'cancelled',
    subscription_end: { $gte: startDate }
  });

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        free: freeUsers,
        pro: proUsers,
        enterprise: enterpriseUsers,
        project_unlock: projectUnlockUsers
      },
      subscriptions: {
        active: activeSubscriptions,
        new: newSubscriptions,
        cancelled: cancelledSubscriptions
      },
      revenue: {
        estimatedMRR: estimatedMRR.toFixed(2),
        estimatedARR: estimatedARR.toFixed(2)
      }
    }
  });
});

/**
 * @desc    Get billing transactions
 * @route   GET /api/admin/billing/transactions
 * @access  Admin (can_manage_billing)
 */
exports.getBillingTransactions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 25;
  const status = req.query.status || '';
  const type = req.query.type || '';

  // This would typically query a Payment/Transaction collection
  // For now, returning user subscription changes as transactions
  const query = {};
  
  if (status && ['active', 'cancelled', 'inactive', 'past_due'].includes(status)) {
    query.subscription_status = status;
  }

  if (type && ['pro', 'enterprise', 'project_unlock'].includes(type)) {
    query.plan_type = type;
  }

  const total = await User.countDocuments(query);

  const users = await User.find(query)
    .select('email first_name last_name plan_type subscription_plan subscription_status subscription_start subscription_end')
    .sort({ subscription_start: -1 })
    .skip(page * limit)
    .limit(limit);

  const transactions = users.map(user => ({
    id: user._id,
    user_email: user.email,
    user_name: `${user.first_name} ${user.last_name}`,
    type: user.plan_type,
    plan: user.subscription_plan,
    status: user.subscription_status,
    amount: user.plan_type === 'pro' ? 16.99 : user.plan_type === 'enterprise' ? 99.99 : 11.75,
    date: user.subscription_start,
    next_billing: user.subscription_end
  }));

  res.status(200).json({
    success: true,
    data: {
      transactions,
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
 * @desc    Grant subscription access
 * @route   POST /api/admin/billing/grant-access
 * @access  Admin (can_manage_billing)
 */
exports.grantSubscriptionAccess = asyncHandler(async (req, res) => {
  const { userId, plan_type, duration_days, notes } = req.body;

  if (!userId || !plan_type || !duration_days) {
    return res.status(400).json({
      success: false,
      error: 'User ID, plan type, and duration are required'
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Update subscription
  user.plan_type = plan_type;
  user.subscription_plan = plan_type === 'project_unlock' ? null : plan_type;
  user.subscription_status = 'active';
  user.subscription_start = new Date();
  user.subscription_end = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000);

  // Update limits based on plan
  if (plan_type === 'pro') {
    user.max_workspaces = 2;
    user.max_projects_per_workspace = 3;
    user.report_access = true;
    user.tool_access = true;
  } else if (plan_type === 'enterprise') {
    user.max_workspaces = null;
    user.max_projects_per_workspace = null;
    user.report_access = true;
    user.tool_access = true;
  } else if (plan_type === 'project_unlock') {
    user.max_projects_per_workspace = 2;
  }

  // Add audit metadata
  user.subscription_granted_by = req.user.id;
  user.subscription_granted_at = new Date();

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      plan_type: user.plan_type,
      subscription_status: user.subscription_status,
      subscription_end: user.subscription_end
    },
    message: `${plan_type} access granted for ${duration_days} days`
  });
});
