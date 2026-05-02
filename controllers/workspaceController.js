const Workspace = require('../models/Workspace');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all workspaces for user
// @route   GET /api/workspaces
// @access  Private
exports.getWorkspaces = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const total = await Workspace.countDocuments({ user_id: req.user.id });
  const workspaces = await Workspace.find({ user_id: req.user.id })
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: {
      workspaces,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Get single workspace
// @route   GET /api/workspaces/:id
// @access  Private
exports.getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findOne({
    _id: req.params.id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Workspace not found'
    });
  }

  res.status(200).json({
    success: true,
    data: workspace
  });
});

// @desc    Create new workspace
// @route   POST /api/workspaces
// @access  Private
exports.createWorkspace = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // Check user's workspace limit
  const user = await User.findById(req.user.id);
  const currentWorkspaceCount = await Workspace.countDocuments({ 
    user_id: req.user.id,
    status: 'active'
  });

  if (currentWorkspaceCount >= (user.max_workspaces || 1)) {
    return res.status(400).json({
      success: false,
      error: 'Workspace limit reached. Upgrade your plan to create more workspaces.'
    });
  }

  const workspace = await Workspace.create({
    user_id: req.user.id,
    name,
    description
  });

  res.status(201).json({
    success: true,
    data: workspace
  });
});

// @desc    Update workspace
// @route   PUT /api/workspaces/:id
// @access  Private
exports.updateWorkspace = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  let workspace = await Workspace.findOne({
    _id: req.params.id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Workspace not found'
    });
  }

  workspace = await Workspace.findByIdAndUpdate(
    req.params.id,
    { name, description },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: workspace
  });
});

// @desc    Delete workspace
// @route   DELETE /api/workspaces/:id
// @access  Private
exports.deleteWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findOne({
    _id: req.params.id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Workspace not found'
    });
  }

  await workspace.deleteOne();

  res.status(200).json({
    success: true,
    data: {
      message: 'Workspace deleted successfully'
    }
  });
});

// @desc    Get projects in workspace
// @route   GET /api/workspaces/:id/projects
// @access  Private
exports.getWorkspaceProjects = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findOne({
    _id: req.params.id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Workspace not found'
    });
  }

  // Get projects for this workspace
  const Project = require('../models/Project');
  const projects = await Project.find({ workspace_id: req.params.id })
    .select('id name status stage overall_score')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      workspace: {
        id: workspace._id,
        name: workspace.name,
        description: workspace.description
      },
      projects
    }
  });
});
