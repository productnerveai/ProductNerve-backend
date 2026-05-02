const Project = require('../models/Project');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all projects for a workspace
// @route   GET /api/projects
// @route   GET /api/workspaces/:id/projects
// @access  Private
exports.getProjects = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  let query = {};
  
  // If workspace_id is in params, filter by workspace
  if (req.params.workspace_id) {
    // Verify user owns the workspace
    const workspace = await Workspace.findOne({
      _id: req.params.workspace_id,
      user_id: req.user.id
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    query.workspace_id = req.params.workspace_id;
  } else {
    // Get all projects from all user's workspaces
    const userWorkspaces = await Workspace.find({ user_id: req.user.id }).select('_id');
    const workspaceIds = userWorkspaces.map(w => w._id);
    query.workspace_id = { $in: workspaceIds };
  }

  const total = await Project.countDocuments(query);
  const projects = await Project.find(query)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: {
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = asyncHandler(async (req, res) => {
  // Get project and verify user owns the workspace
  const project = await Project.findById(req.params.id).populate('workspace_id');

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  if (project.workspace_id.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Create new project
// @route   POST /api/projects
// @route   POST /api/workspaces/:id/projects
// @access  Private
exports.createProject = asyncHandler(async (req, res) => {
  const { name, description, workspace_id } = req.body;

  // Determine workspace_id
  let targetWorkspaceId = workspace_id || req.params.workspace_id;

  if (!targetWorkspaceId) {
    return res.status(400).json({
      success: false,
      error: 'Workspace ID is required'
    });
  }

  // Verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: targetWorkspaceId,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Workspace not found'
    });
  }

  // Check user's project limit
  const user = await User.findById(req.user.id);
  const currentProjectCount = await Project.countDocuments({ 
    workspace_id: targetWorkspaceId,
    status: 'active'
  });

  if (currentProjectCount >= (user.max_projects_per_workspace || 3)) {
    return res.status(400).json({
      success: false,
      error: 'Project limit reached for this workspace. Upgrade your plan to create more projects.'
    });
  }

  const project = await Project.create({
    workspace_id: targetWorkspaceId,
    name,
    description
  });

  res.status(201).json({
    success: true,
    data: project
  });
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = asyncHandler(async (req, res) => {
  const { name, description, status, stage, overall_score } = req.body;

  let project = await Project.findById(req.params.id).populate('workspace_id');

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  if (project.workspace_id.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  project = await Project.findByIdAndUpdate(
    req.params.id,
    { name, description, status, stage, overall_score },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('workspace_id');

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  if (project.workspace_id.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  await project.deleteOne();

  res.status(200).json({
    success: true,
    data: {
      message: 'Project deleted successfully'
    }
  });
});

// @desc    Update project phase 1 (Product Context)
// @route   PUT /api/projects/:id/phase1
// @access  Private
exports.updatePhase1 = asyncHandler(async (req, res) => {
  const { product, core_problem, who_experiences, industries_affected } = req.body;

  let project = await Project.findById(req.params.id).populate('workspace_id');

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  if (project.workspace_id.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  project.phase1_data = {
    product,
    core_problem,
    who_experiences,
    industries_affected
  };
  project.phase1_status = 'complete';
  
  await project.save();

  res.status(200).json({
    success: true,
    data: {
      message: 'Phase 1 completed successfully',
      phase1_data: project.phase1_data
    }
  });
});

// @desc    Get project phase 1 data
// @route   GET /api/projects/:id/phase1
// @access  Private
exports.getPhase1 = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('workspace_id');

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  if (project.workspace_id.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      phase1_status: project.phase1_status,
      phase1_data: project.phase1_data
    }
  });
});

// @desc    Update project phase 2 (Segment Identification)
// @route   PUT /api/projects/:id/phase2
// @access  Private
exports.updatePhase2 = asyncHandler(async (req, res) => {
  const { 
    segment_name, job_role, industry, company_size, geography, income_level,
    pain_profile, buying_behavior, channel_discovery 
  } = req.body;

  let project = await Project.findById(req.params.id).populate('workspace_id');

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  if (project.workspace_id.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  project.phase2_data = {
    segment_name,
    job_role,
    industry,
    company_size,
    geography,
    income_level,
    pain_profile,
    buying_behavior,
    channel_discovery
  };
  project.phase2_status = 'complete';
  
  await project.save();

  res.status(200).json({
    success: true,
    data: {
      message: 'Phase 2 completed successfully',
      phase2_data: project.phase2_data
    }
  });
});

// @desc    Get project phase 2 data
// @route   GET /api/projects/:id/phase2
// @access  Private
exports.getPhase2 = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('workspace_id');

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  if (project.workspace_id.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      phase2_status: project.phase2_status,
      phase2_data: project.phase2_data
    }
  });
});

// @desc    Update project phase 3 (Pain Profile)
// @route   PUT /api/projects/:id/phase3
// @access  Private
exports.updatePhase3 = asyncHandler(async (req, res) => {
  const { pain_points, solution_gaps, market_insights } = req.body;

  let project = await Project.findById(req.params.id).populate('workspace_id');

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  if (project.workspace_id.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  project.phase3_data = {
    pain_points,
    solution_gaps,
    market_insights
  };
  project.phase3_status = 'complete';
  
  await project.save();

  res.status(200).json({
    success: true,
    data: {
      message: 'Phase 3 completed successfully',
      phase3_data: project.phase3_data
    }
  });
});

// @desc    Get project phase 3 data
// @route   GET /api/projects/:id/phase3
// @access  Private
exports.getPhase3 = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('workspace_id');

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  if (project.workspace_id.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      phase3_status: project.phase3_status,
      phase3_data: project.phase3_data
    }
  });
});

// @desc    Update project status only
// @route   PATCH /api/projects/:id/status
// @access  Private
exports.updateProjectStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      error: 'Status is required'
    });
  }

  if (!['paused', 'active', 'killed', 'scaled'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status. Must be one of: paused, active, killed, scaled'
    });
  }

  let project = await Project.findById(req.params.id).populate('workspace_id');

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  if (project.workspace_id.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  project.status = status;
  await project.save();

  res.status(200).json({
    success: true,
    data: {
      message: `Project ${status}`,
      project: {
        id: project._id,
        name: project.name,
        status: project.status,
        stage: project.stage,
        overall_score: project.overall_score
      }
    }
  });
});
