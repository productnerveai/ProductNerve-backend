const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      company_name: user.company_name,
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
      user_status: user.user_status,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }
  });
});

// @desc    Get user limits and usage
// @route   GET /api/users/limits
// @access  Private
exports.getUserLimits = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  // Count current workspaces and projects
  const Workspace = require('../models/Workspace');
  const Project = require('../models/Project');
  
  const currentWorkspaces = await Workspace.countDocuments({ 
    user_id: req.user.id,
    status: 'active'
  });
  
  const userWorkspaces = await Workspace.find({ user_id: req.user.id }).select('_id');
  const workspaceIds = userWorkspaces.map(w => w._id);
  const currentProjects = await Project.countDocuments({ 
    workspace_id: { $in: workspaceIds },
    status: 'active'
  });

  const limits = {
    plan_type: user.plan_type,
    subscription_status: user.subscription_status,
    limits: {
      workspaces: user.max_workspaces || 1,
      projects_per_workspace: user.max_projects_per_workspace || 3,
      total_projects: user.project_limit || 10
    },
    usage: {
      current_workspaces: currentWorkspaces,
      current_projects: currentProjects,
      available_workspaces: (user.max_workspaces || 1) - currentWorkspaces,
      available_projects: (user.project_limit || 10) - currentProjects
    },
    features: {
      report_access: user.report_access,
      tool_access: user.tool_access
    }
  };

  res.status(200).json({
    success: true,
    data: limits
  });
});

// @desc    Get specific user (Admin only)
// @route   GET /api/users/:id
// @access  Private (Admin only)
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
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
      plan_type: user.plan_type,
      subscription_status: user.subscription_status,
      user_status: user.user_status,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    }
  });
});

// @desc    Update user status (Admin only)
// @route   PUT /api/users/:id/status
// @access  Private (Admin only)
exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { user_status } = req.body;

  if (!user_status || !['active', 'inactive'].includes(user_status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid user status. Must be active or inactive'
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  user.user_status = user_status;
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      message: `User status updated to ${user_status}`,
      user: {
        id: user._id,
        email: user.email,
        user_status: user.user_status
      }
    }
  });
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin only)
exports.getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const total = await User.countDocuments();
  const users = await User.find()
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});
