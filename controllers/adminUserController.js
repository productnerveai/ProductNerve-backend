const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const NotificationService = require('../services/notificationService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get all users with pagination and filtering
 * @route   GET /api/admin/users
 * @access  Admin (can_manage_users)
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 25;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const plan = req.query.plan || '';
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  // Build query
  const query = {};
  
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { first_name: { $regex: search, $options: 'i' } },
      { last_name: { $regex: search, $options: 'i' } },
      { company_name: { $regex: search, $options: 'i' } }
    ];
  }

  if (status) {
    query.user_status = status;
  }

  if (plan) {
    query.plan_type = plan;
  }

  // Get total count
  const total = await User.countDocuments(query);

  // Get users with pagination
  const users = await User.find(query)
    .select('-password')
    .sort({ [sortBy]: sortOrder })
    .skip(page * limit)
    .limit(limit);

  // Get additional data for each user
  const usersWithData = await Promise.all(users.map(async (user) => {
    const workspaces = await Workspace.countDocuments({ user_id: user._id });
    const projects = await Project.countDocuments({ 
      workspace_id: { $in: await Workspace.find({ user_id: user._id }).distinct('_id') }
    });

    return {
      id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      company_name: user.company_name,
      user_status: user.user_status,
      plan_type: user.plan_type,
      subscription_plan: user.subscription_plan,
      subscription_status: user.subscription_status,
      subscription_start: user.subscription_start,
      subscription_end: user.subscription_end,
      role: user.role,
      admin_role: user.admin_role,
      email_verified: user.email_verified,
      profile_completion_status: user.profile_completion_status,
      created_at: user.createdAt,
      last_login: user.last_login,
      workspaces_count: workspaces,
      projects_count: projects
    };
  }));

  res.status(200).json({
    success: true,
    data: {
      users: usersWithData,
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
 * @desc    Get user's projects
 * @route   GET /api/admin/users/:id/projects
 * @access  Admin (can_manage_users)
 */
exports.getUserProjects = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Get user's workspaces and their projects
  const workspaces = await Workspace.find({ user_id: user._id });
  const workspaceIds = workspaces.map(w => w._id);
  const projects = await Project.find({ workspace_id: { $in: workspaceIds } });

  res.status(200).json({
    success: true,
    data: {
      projects: projects.map(p => ({
        id: p._id,
        name: p.name,
        phase1_status: p.phase1_status,
        phase2_status: p.phase2_status,
        phase3_status: p.phase3_status,
        overall_score: p.overall_score,
        project_locked: p.project_locked,
        status: p.status,
        created_at: p.createdAt,
        updated_at: p.updatedAt
      }))
    }
  });
});

/**
 * @desc    Get specific user details
 * @route   GET /api/admin/users/:id
 * @access  Admin (can_manage_users)
 */
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Get user's workspaces and projects
  const workspaces = await Workspace.find({ user_id: user._id });
  const workspaceIds = workspaces.map(w => w._id);
  const projects = await Project.find({ workspace_id: { $in: workspaceIds } });

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      company_name: user.company_name,
      user_status: user.user_status,
      plan_type: user.plan_type,
      subscription_plan: user.subscription_plan,
      subscription_status: user.subscription_status,
      subscription_start: user.subscription_start,
      subscription_end: user.subscription_end,
      workspace_limit: user.workspace_limit,
      project_limit: user.project_limit,
      max_workspaces: user.max_workspaces,
      max_projects_per_workspace: user.max_projects_per_workspace,
      report_access: user.report_access,
      tool_access: user.tool_access,
      role: user.role,
      admin_role: user.admin_role,
      admin_permissions: user.admin_permissions,
      email_verified: user.email_verified,
      profile_completion_status: user.profile_completion_status,
      profile_document_url: user.profile_document_url,
      profile_submission_date: user.profile_submission_date,
      profile_review_date: user.profile_review_date,
      profile_review_notes: user.profile_review_notes,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      last_login: user.last_login,
      workspaces: workspaces.map(w => ({
        id: w._id,
        name: w.name,
        description: w.description,
        status: w.status,
        created_at: w.createdAt
      })),
      projects: projects.map(p => ({
        id: p._id,
        name: p.name,
        description: p.description,
        status: p.status,
        phase1_status: p.phase1_status,
        phase2_status: p.phase2_status,
        phase3_status: p.phase3_status,
        overall_score: p.overall_score,
        project_locked: p.project_locked,
        created_at: p.createdAt
      }))
    }
  });
});

/**
 * @desc    Update user status
 * @route   PUT /api/admin/users/:id/status
 * @access  Admin (can_manage_users)
 */
exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['active', 'inactive', 'suspended'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status. Must be active, inactive, or suspended'
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  const oldStatus = user.user_status;
  user.user_status = status;
  await user.save();

  // Send notification based on status change
  let notificationType, title, message;
  
  if (status === 'suspended' && oldStatus !== 'suspended') {
    notificationType = 'account_suspended';
    title = 'Account Suspended';
    message = 'Your account has been temporarily suspended. If you believe this is an error, please contact our support team.';
  } else if (status === 'active' && oldStatus !== 'active') {
    notificationType = 'account_activated';
    title = 'Account Reactivated';
    message = 'Your account has been reactivated. You can now access all platform features.';
  } else if (status === 'deactivated' && oldStatus !== 'deactivated') {
    notificationType = 'account_deactivated';
    title = 'Account Deactivated';
    message = 'Your account has been deactivated. If you wish to reactivate it, please contact our support team.';
  }

  if (notificationType) {
    await NotificationService.createNotification({
      user_id: user._id,
      type: notificationType,
      title,
      message,
      metadata: { old_status: oldStatus, new_status: status, updated_by: req.user.email },
      sendEmail: true
    });
  }

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      user_status: user.user_status
    },
    message: `User status updated to ${status}`
  });
});

/**
 * @desc    Update user subscription
 * @route   PUT /api/admin/users/:id/subscription
 * @access  Admin (can_manage_billing)
 */
exports.updateUserSubscription = asyncHandler(async (req, res) => {
  const { plan_type, subscription_plan, subscription_status, duration_days } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Update subscription details
  if (plan_type) {
    user.plan_type = plan_type;
  }

  if (subscription_plan) {
    user.subscription_plan = subscription_plan;
  }

  if (subscription_status) {
    user.subscription_status = subscription_status;
  }

  // Set subscription dates
  if (subscription_status === 'active') {
    user.subscription_start = new Date();
    if (duration_days) {
      user.subscription_end = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000);
    }
  } else if (subscription_status === 'cancelled') {
    user.subscription_end = new Date();
  }

  // Update limits based on plan
  if (plan_type === 'pro') {
    user.max_workspaces = 2;
    user.max_projects_per_workspace = 3;
    user.report_access = true;
    user.tool_access = true;
  } else if (plan_type === 'enterprise') {
    user.max_workspaces = null; // unlimited
    user.max_projects_per_workspace = null; // unlimited
    user.report_access = true;
    user.tool_access = true;
  } else if (plan_type === 'project_unlock') {
    user.max_projects_per_workspace = 2;
  }

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      plan_type: user.plan_type,
      subscription_plan: user.subscription_plan,
      subscription_status: user.subscription_status,
      subscription_start: user.subscription_start,
      subscription_end: user.subscription_end,
      max_workspaces: user.max_workspaces,
      max_projects_per_workspace: user.max_projects_per_workspace,
      report_access: user.report_access,
      tool_access: user.tool_access
    },
    message: 'User subscription updated successfully'
  });
});

/**
 * @desc    Grant temporary access to user
 * @route   POST /api/admin/users/:id/grant-access
 * @access  Admin (can_manage_users)
 */
exports.grantTemporaryAccess = asyncHandler(async (req, res) => {
  const { access_type, duration_days } = req.body;

  if (!access_type || !duration_days) {
    return res.status(400).json({
      success: false,
      error: 'Access type and duration are required'
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Grant temporary access based on type
  if (access_type === 'pro') {
    user.plan_type = 'pro';
    user.subscription_plan = 'pro';
    user.subscription_status = 'active';
    user.max_workspaces = 2;
    user.max_projects_per_workspace = 3;
    user.report_access = true;
    user.tool_access = true;
  } else if (access_type === 'enterprise') {
    user.plan_type = 'enterprise';
    user.subscription_plan = 'enterprise';
    user.subscription_status = 'active';
    user.max_workspaces = null;
    user.max_projects_per_workspace = null;
    user.report_access = true;
    user.tool_access = true;
  }

  user.subscription_start = new Date();
  user.subscription_end = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000);

  // Add metadata for audit
  user.subscription_granted_by = req.user.id;
  user.subscription_granted_at = new Date();

  await user.save();

  // Send notification about free access grant
  await NotificationService.createNotification({
    user_id: user._id,
    type: 'access_granted',
    title: 'Free Access Granted',
    message: `Great news! You have been granted ${duration_days} days of free ${access_type} access. Enjoy all premium features during this period.`,
    metadata: { 
      access_type, 
      duration_days, 
      granted_by: req.user.email,
      subscription_end: user.subscription_end
    },
    sendEmail: true
  });

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      plan_type: user.plan_type,
      subscription_plan: user.subscription_plan,
      subscription_status: user.subscription_status,
      subscription_end: user.subscription_end,
      granted_by: req.user.email
    },
    message: `${access_type} access granted for ${duration_days} days`
  });
});

/**
 * @desc    Get multiple users by IDs
 * @route   POST /api/admin/users/bulk
 * @access  Admin (can_manage_users)
 */
exports.getUsersByIds = asyncHandler(async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds)) {
    return res.status(400).json({
      success: false,
      error: 'User IDs array is required'
    });
  }

  try {
    const users = await User.find({ _id: { $in: userIds } })
      .select('id email first_name last_name')
      .lean()
      .exec();

    res.status(200).json({
      success: true,
      data: {
        users
      }
    });
  } catch (error) {
    console.error('Error fetching users by IDs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Super Admin only
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Prevent deleting yourself
  if (user._id.toString() === req.user.id) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete yourself'
    });
  }

  // Delete user's workspaces and projects (cascade)
  const workspaces = await Workspace.find({ user_id: user._id });
  const workspaceIds = workspaces.map(w => w._id);
  
  await Project.deleteMany({ workspace_id: { $in: workspaceIds } });
  await Workspace.deleteMany({ user_id: user._id });
  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'User and all associated data deleted successfully'
  });
});
