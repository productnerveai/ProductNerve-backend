const ICP = require('../models/ICP');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const geminiService = require('../services/geminiService');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all ICPs for a workspace
// @route   GET /api/icp
// @access  Private
exports.getICPs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Get user's workspaces
  const userWorkspaces = await Workspace.find({ user_id: req.user.id }).select('_id');
  const workspaceIds = userWorkspaces.map(w => w._id);

  let query = { user_id: req.user.id };

  // Filter by workspace if specified
  if (req.query.workspace_id) {
    if (!workspaceIds.some(id => id.toString() === req.query.workspace_id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this workspace'
      });
    }
    query.workspace_id = req.query.workspace_id;
  } else {
    query.workspace_id = { $in: workspaceIds };
  }

  const total = await ICP.countDocuments(query);
  const icps = await ICP.find(query)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  res.status(200).json({
    success: true,
    data: {
      icps,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Get single ICP
// @route   GET /api/icp/:id
// @access  Private
exports.getICP = asyncHandler(async (req, res) => {
  const icp = await ICP.findById(req.params.id)
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  if (!icp) {
    return res.status(404).json({
      success: false,
      error: 'ICP not found'
    });
  }

  // Verify user owns this ICP
  if (icp.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  res.status(200).json({
    success: true,
    data: icp
  });
});

// @desc    Create new ICP
// @route   POST /api/icp
// @access  Private
exports.createICP = asyncHandler(async (req, res) => {
  const { title, product_context, workspace_id, project_id } = req.body;

  // Validate required fields for saving (flexible for progressive creation)
  if (!product_context) {
    return res.status(400).json({
      success: false,
      error: 'Product context is required'
    });
  }

  // Validate essential product context fields
  if (!product_context.product_name || !product_context.product_name.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Product name is required'
    });
  }

  if (!workspace_id) {
    return res.status(400).json({
      success: false,
      error: 'Workspace ID is required'
    });
  }

  // Verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: workspace_id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Workspace not found'
    });
  }

  // If project_id is provided, verify it belongs to the workspace
  if (project_id) {
    const project = await Project.findOne({
      _id: project_id,
      workspace_id: workspace_id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found in this workspace'
      });
    }
  }

  const icp = await ICP.create({
    user_id: req.user.id,
    workspace_id,
    project_id: project_id || null,
    title,
    product_context,
    segments: [] // Start with empty segments
  });

  const populatedICP = await ICP.findById(icp._id)
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  res.status(201).json({
    success: true,
    data: populatedICP
  });
});

// @desc    Update ICP
// @route   PUT /api/icp/:id
// @access  Private
exports.updateICP = asyncHandler(async (req, res) => {
  console.log('updateICP body:', req.body); // ← add this
  const { title, product_context, segments, project_id } = req.body;

  let icp = await ICP.findById(req.params.id);

  if (!icp) {
    return res.status(404).json({
      success: false,
      error: 'ICP not found'
    });
  }

  // Verify user owns this ICP
  if (icp.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  // If project_id is being updated, verify it belongs to the workspace
  if (project_id && project_id !== icp.project_id?.toString()) {
    const project = await Project.findOne({
      _id: project_id,
      workspace_id: icp.workspace_id?._id || icp.workspace_id  // ← unwrap populated object
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found in this workspace'
      });
    }
  }

  // Update fields
  if (title) icp.title = title;
  if (product_context) icp.product_context = product_context;
  if (segments) icp.segments = segments;
  if (project_id !== undefined) {
    icp.project_id = project_id?._id || project_id || null;
  }

  // Update status based on completion
  if (segments !== undefined) {
    if (segments.length > 0 &&
      (product_context || icp.product_context) &&
      (product_context?.product || icp.product_context?.product) &&
      (product_context?.core_problem || icp.product_context?.core_problem)) {
      icp.status = 'complete';
    } else {
      icp.status = 'draft';
    }
  }

  await icp.save();

  const populatedICP = await ICP.findById(icp._id)
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  res.status(200).json({
    success: true,
    data: populatedICP
  });
});

// @desc    Delete ICP
// @route   DELETE /api/icp/:id
// @access  Private
exports.deleteICP = asyncHandler(async (req, res) => {
  const icp = await ICP.findById(req.params.id);

  if (!icp) {
    return res.status(404).json({
      success: false,
      error: 'ICP not found'
    });
  }

  // Verify user owns this ICP
  if (icp.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  await icp.deleteOne();

  res.status(200).json({
    success: true,
    data: {
      message: 'ICP deleted successfully'
    }
  });
});

// @desc    Generate AI report for ICP
// @route   POST /api/icp/:id/generate-report
// @access  Private
exports.generateReport = asyncHandler(async (req, res) => {
  const icp = await ICP.findById(req.params.id);

  if (!icp) {
    return res.status(404).json({
      success: false,
      error: 'ICP not found'
    });
  }

  // Verify user owns this ICP
  if (icp.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  // Check if ICP has required data for report generation
  if (!icp.product_context || !icp.segments || icp.segments.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'ICP must have product context and at least one segment to generate report'
    });
  }

  try {
    // Generate report using Gemini AI
    const report = await geminiService.generateICPReport({
      product_context: icp.product_context,
      segments: icp.segments
    });

    // Save report to ICP
    icp.report = report;
    icp.status = 'complete';
    await icp.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Report generated successfully',
        report: icp.report
      }
    });
  } catch (error) {
    console.error('Report generation error:', error);
    
    // Check if it's a service availability error
    if (error.message.includes('temporarily unavailable') || error.message.includes('503')) {
      res.status(503).json({
        success: false,
        error: 'AI service is temporarily experiencing high demand. Please try again in a few minutes.',
        retry_suggested: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate report. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// @desc    Get projects for ICP linking
// @route   GET /api/icp/projects/:workspace_id
// @access  Private
exports.getWorkspaceProjects = asyncHandler(async (req, res) => {
  const { workspace_id } = req.params;

  // Verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: workspace_id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Workspace not found'
    });
  }

  const projects = await Project.find({
    workspace_id,
    status: 'active'
  }).select('id name status stage');

  res.status(200).json({
    success: true,
    data: projects
  });
});
