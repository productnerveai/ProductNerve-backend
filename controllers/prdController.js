const PRD = require('../models/PRD');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const geminiService = require('../services/geminiService');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all PRDs for a workspace
// @route   GET /api/prd
// @access  Private
exports.getPRDs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Get user's workspaces
  const userWorkspaces = await Workspace.find({ user_id: req.user.id }).select('_id');
  const workspaceIds = userWorkspaces.map(w => w._id.toString());

  let query = { user_id: req.user.id };
  
  // Filter by workspace if specified
  if (req.query.workspace_id) {
    if (!workspaceIds.includes(req.query.workspace_id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this workspace'
      });
    }
    query.workspace_id = req.query.workspace_id;
  } else {
    query.workspace_id = { $in: workspaceIds };
  }

  // Filter by PRD type if specified
  if (req.query.prd_type) {
    query.prd_type = req.query.prd_type;
  }

  const total = await PRD.countDocuments(query);
  const prds = await PRD.find(query)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  res.status(200).json({
    success: true,
    data: {
      prds,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Get single PRD
// @route   GET /api/prd/:id
// @access  Private
exports.getPRD = asyncHandler(async (req, res) => {
  const prd = await PRD.findById(req.params.id)
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  if (!prd) {
    return res.status(404).json({
      success: false,
      error: 'PRD not found'
    });
  }

  // Verify user owns this PRD
  if (prd.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  res.status(200).json({
    success: true,
    data: prd
  });
});

// @desc    Create new PRD
// @route   POST /api/prd
// @access  Private
exports.createPRD = asyncHandler(async (req, res) => {
  const { 
    title, 
    prd_type,
    product_context,
    strategic_context,
    product_definition,
    execution_context,
    workspace_id, 
    project_id 
  } = req.body;

  // Validate required fields for saving (flexible for progressive creation)
  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Title is required'
    });
  }

  if (!workspace_id) {
    return res.status(400).json({
      success: false,
      error: 'Workspace ID is required'
    });
  }

  // Product context is optional for initial save (user can add it later)
  if (product_context && product_context.product_name && !product_context.product_name.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Product name cannot be empty if provided'
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

  const prd = await PRD.create({
    user_id: req.user.id,
    workspace_id,
    project_id: project_id || null,
    title: title.trim(),
    prd_type: prd_type || 'simple',
    product_context,
    // Use data from request body or initialize empty objects if not provided
    strategic_context: strategic_context || {
      market_opportunity: '',
      key_assumptions: '',
      constraints: '',
      risks: ''
    },
    product_definition: product_definition || {
      core_features: '',
      user_flows: '',
      value_prop: ''
    },
    execution_context: execution_context || {
      timeline: '',
      team_size: '',
      technical_complexity: ''
    }
  });

  const populatedPRD = await PRD.findById(prd._id)
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  res.status(201).json({
    success: true,
    data: populatedPRD
  });
});

// @desc    Update PRD
// @route   PUT /api/prd/:id
// @access  Private
exports.updatePRD = asyncHandler(async (req, res) => {
  const { 
    title, 
    prd_type,
    product_context, 
    strategic_context, 
    product_definition, 
    execution_context,
    project_id 
  } = req.body;

  let prd = await PRD.findById(req.params.id);

  if (!prd) {
    return res.status(404).json({
      success: false,
      error: 'PRD not found'
    });
  }

  // Verify user owns this PRD
  if (prd.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  // If project_id is being updated, verify it belongs to the workspace
  if (project_id && project_id !== prd.project_id?.toString()) {
    const project = await Project.findOne({
      _id: project_id,
      workspace_id: prd.workspace_id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found in this workspace'
      });
    }
  }

  // Update fields
  if (title) prd.title = title.trim();
  if (prd_type) prd.prd_type = prd_type;
  if (product_context) prd.product_context = product_context;
  if (strategic_context) prd.strategic_context = strategic_context;
  if (product_definition) prd.product_definition = product_definition;
  if (execution_context) prd.execution_context = execution_context;
  if (project_id !== undefined) prd.project_id = project_id;

  // Update status based on completion
  const isComplete = 
    product_context && product_context.product_name && 
    strategic_context && strategic_context.market_opportunity &&
    product_definition && product_definition.core_features &&
    execution_context && execution_context.timeline &&
    prd.report && Object.keys(prd.report).length > 0;
  
  prd.status = isComplete ? 'complete' : 'draft';

  await prd.save();

  const populatedPRD = await PRD.findById(prd._id)
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  res.status(200).json({
    success: true,
    data: populatedPRD
  });
});

// @desc    Delete PRD
// @route   DELETE /api/prd/:id
// @access  Private
exports.deletePRD = asyncHandler(async (req, res) => {
  const prd = await PRD.findById(req.params.id);

  if (!prd) {
    return res.status(404).json({
      success: false,
      error: 'PRD not found'
    });
  }

  // Verify user owns this PRD
  if (prd.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  await prd.deleteOne();

  res.status(200).json({
    success: true,
    data: {
      message: 'PRD deleted successfully'
    }
  });
});

// @desc    Generate AI report for PRD
// @route   POST /api/prd/:id/generate-report
// @access  Private
exports.generateReport = asyncHandler(async (req, res) => {
  const prd = await PRD.findById(req.params.id);

  if (!prd) {
    return res.status(404).json({
      success: false,
      error: 'PRD not found'
    });
  }

  // Verify user owns this PRD
  if (prd.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  // Check if PRD has required data for report generation
  const missingFields = [];
  
  if (!prd.product_context?.product_name) missingFields.push('product name');
  if (!prd.product_context?.product_description) missingFields.push('product description');
  if (!prd.product_context?.problem_solved) missingFields.push('problem solved');
  if (!prd.product_context?.target_users) missingFields.push('target users');
  if (!prd.product_context?.business_goal) missingFields.push('business goal');
  
  if (!prd.strategic_context?.market_opportunity) missingFields.push('market opportunity');
  if (!prd.strategic_context?.key_assumptions) missingFields.push('key assumptions');
  if (!prd.strategic_context?.constraints) missingFields.push('constraints');
  if (!prd.strategic_context?.risks) missingFields.push('risks');
  
  if (!prd.product_definition?.core_features) missingFields.push('core features');
  if (!prd.product_definition?.user_flows) missingFields.push('user flows');
  if (!prd.product_definition?.value_prop) missingFields.push('value proposition');
  
  if (!prd.execution_context?.timeline) missingFields.push('timeline');
  if (!prd.execution_context?.team_size) missingFields.push('team size');
  if (!prd.execution_context?.technical_complexity) missingFields.push('technical complexity');

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Please complete the required fields before generating a report',
      required_fields: missingFields,
      message: `Missing required information: ${missingFields.join(', ')}. Complete all sections for better PRD generation.`
    });
  }

  try {
    // Generate report using Gemini AI
    const report = await geminiService.generatePRD({
      prd_type: prd.prd_type,
      product_context: prd.product_context,
      strategic_context: prd.strategic_context,
      product_definition: prd.product_definition,
      execution_context: prd.execution_context
    });

    // Save report to PRD
    prd.report = report;
    prd.status = 'complete';
    await prd.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'PRD generated successfully',
        report: prd.report
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

// @desc    Get projects for PRD linking
// @route   GET /api/prd/projects/:workspace_id
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
