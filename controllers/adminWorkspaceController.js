const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get all workspaces with pagination and filtering
 * @route   GET /api/admin/workspaces
 * @access  Admin (can_manage_workspaces)
 */
exports.getAllWorkspaces = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 25;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  // Build query
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (status) {
    query.status = status;
  }

  // Get total count
  const total = await Workspace.countDocuments(query);

  // Get workspaces with pagination and user data
  const workspaces = await Workspace.find(query)
    .populate('user_id', 'email first_name last_name company_name')
    .sort({ [sortBy]: sortOrder })
    .skip(page * limit)
    .limit(limit);

  // Get project counts for each workspace
  // Get project counts for each workspace
  const workspacesWithProjects = await Promise.all(workspaces.map(async (workspace) => {
    const workspaceId = workspace._id; // ObjectId

    const projectCount = await Project.countDocuments({ workspace_id: workspaceId });

    const activeProjects = await Project.countDocuments({
      workspace_id: workspaceId,
      status: { $in: ['active'] }  // ✅ matches your Project schema's actual status enum
      // Your schema uses: 'paused' | 'active' | 'killed' | 'scaled'
      // NOT: 'planning', 'ideation', etc. — those are `stage` field values
    });

    return {
      id: workspace._id,
      name: workspace.name,
      description: workspace.description,
      status: workspace.status,
      user: workspace.user_id,
      projects_count: projectCount,
      active_projects: activeProjects,
      created_at: workspace.createdAt,
      updated_at: workspace.updatedAt
    };
  }));

  res.status(200).json({
    success: true,
    data: {
      workspaces: workspacesWithProjects,
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
 * @desc    Get specific workspace details with projects
 * @route   GET /api/admin/workspaces/:id
 * @access  Admin (can_manage_workspaces)
 */
exports.getWorkspaceById = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.params.id)
    .populate('user_id', 'email first_name last_name company_name user_status plan_type');

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Workspace not found'
    });
  }

  // Get all projects in this workspace
  const projects = await Project.find({ workspace_id: workspace._id })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      id: workspace._id,
      name: workspace.name,
      description: workspace.description,
      status: workspace.status,
      user: workspace.user_id,
      created_at: workspace.createdAt,
      updated_at: workspace.updatedAt,
      projects: projects.map(project => ({
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        phase1_status: project.phase1_status,
        phase2_status: project.phase2_status,
        phase3_status: project.phase3_status,
        overall_score: project.overall_score,
        project_locked: project.project_locked,
        created_at: project.createdAt,
        updated_at: project.updatedAt
      }))
    }
  });
});

/**
 * @desc    Update workspace status
 * @route   PUT /api/admin/workspaces/:id/status
 * @access  Admin (can_manage_workspaces)
 */
exports.updateWorkspaceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['active', 'archived', 'locked', 'suspended'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status. Must be active, archived, locked, or suspended'
    });
  }

  const workspace = await Workspace.findById(req.params.id);

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Workspace not found'
    });
  }

  workspace.status = status;
  await workspace.save();

  res.status(200).json({
    success: true,
    data: {
      id: workspace._id,
      name: workspace.name,
      status: workspace.status
    },
    message: `Workspace status updated to ${status}`
  });
});

/**
 * @desc    Delete workspace
 * @route   DELETE /api/admin/workspaces/:id
 * @access  Admin (can_manage_workspaces)
 */
exports.deleteWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.params.id);

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Workspace not found'
    });
  }

  // Delete all projects in this workspace
  await Project.deleteMany({ workspace_id: workspace._id });

  // Delete the workspace
  await Workspace.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Workspace and all associated projects deleted successfully'
  });
});

/**
 * @desc    Get all projects with pagination and filtering
 * @route   GET /api/admin/projects
 * @access  Admin (can_view_analytics)
 */
exports.getAllProjects = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 25;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const phase = req.query.phase || '';
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  // Build query
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (status) {
    query.status = status;
  }

  if (phase) {
    if (phase === '1') query.phase1_status = 'complete';
    else if (phase === '2') query.phase2_status = 'complete';
    else if (phase === '3') query.phase3_status = 'complete';
  }

  // Get total count
  const total = await Project.countDocuments(query);

  // Get projects with workspace and user data
  const projects = await Project.find(query)
    .populate({
      path: 'workspace_id',
      populate: {
        path: 'user_id',
        select: 'email first_name last_name company_name'
      }
    })
    .sort({ [sortBy]: sortOrder })
    .skip(page * limit)
    .limit(limit);

  const projectsWithDetails = projects.map(project => ({
    id: project._id,
    name: project.name,
    description: project.description,
    status: project.status,
    phase1_status: project.phase1_status,
    phase2_status: project.phase2_status,
    phase3_status: project.phase3_status,
    overall_score: project.overall_score,
    project_locked: project.project_locked,
    workspace: project.workspace_id,
    created_at: project.createdAt,
    updated_at: project.updatedAt
  }));

  res.status(200).json({
    success: true,
    data: {
      projects: projectsWithDetails,
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
 * @desc    Get specific project details
 * @route   GET /api/admin/projects/:id
 * @access  Admin (can_view_analytics)
 */
exports.getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate({
      path: 'workspace_id',
      populate: {
        path: 'user_id',
        select: 'email first_name last_name company_name user_status plan_type'
      }
    });

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      id: project._id,
      name: project.name,
      description: project.description,
      status: project.status,
      phase1_status: project.phase1_status,
      phase2_status: project.phase2_status,
      phase3_status: project.phase3_status,
      overall_score: project.overall_score,
      project_locked: project.project_locked,
      project_unlocked_at: project.project_unlocked_at,
      unlock_type: project.unlock_type,
      workspace: project.workspace_id,
      created_at: project.createdAt,
      updated_at: project.updatedAt
    }
  });
});

/**
 * @desc    Update project status
 * @route   PUT /api/admin/projects/:id/status
 * @access  Admin (can_manage_workspaces)
 */
exports.updateProjectStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['planning', 'ideation', 'validation', 'execution', 'growth', 'paused', 'completed'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status'
    });
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  project.status = status;
  await project.save();

  res.status(200).json({
    success: true,
    data: {
      id: project._id,
      name: project.name,
      status: project.status
    },
    message: `Project status updated to ${status}`
  });
});

/**
 * @desc    Delete project
 * @route   DELETE /api/admin/projects/:id
 * @access  Admin (can_manage_workspaces)
 */
exports.deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  await Project.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Project deleted successfully'
  });
});

/**
 * @desc    Get project statistics summary
 * @route   GET /api/admin/projects/stats
 * @access  Admin (can_view_analytics)
 */
exports.getProjectStats = asyncHandler(async (req, res) => {
  const totalProjects = await Project.countDocuments();
  const activeProjects = await Project.countDocuments({ 
    status: 'active'  // ✅ instead of $in: ['planning', 'ideation', ...]
  });
  const completedProjects = await Project.countDocuments({ status: 'completed' });
  const pausedProjects = await Project.countDocuments({ status: 'paused' });

  // Phase completion stats
  const phase1Completed = await Project.countDocuments({ phase1_status: 'complete' });
  const phase2Completed = await Project.countDocuments({ phase2_status: 'complete' });
  const phase3Completed = await Project.countDocuments({ phase3_status: 'complete' });

  // Score distribution
  const scoreStats = await Project.aggregate([
    {
      $match: {
        overall_score: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: null,
        avgScore: { $avg: "$overall_score" },
        minScore: { $min: "$overall_score" },
        maxScore: { $max: "$overall_score" }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      total: totalProjects,
      active: activeProjects,
      completed: completedProjects,
      paused: pausedProjects,
      phase_completion: {
        phase1: phase1Completed,
        phase2: phase2Completed,
        phase3: phase3Completed
      },
      score_stats: scoreStats[0] || { avgScore: 0, minScore: 0, maxScore: 0 }
    }
  });
});
