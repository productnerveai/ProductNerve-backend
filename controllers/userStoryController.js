const UserStory = require('../models/UserStory');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const geminiService = require('../services/geminiService');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all user stories for a workspace
// @route   GET /api/user-stories
// @access  Private
exports.getUserStories = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Get user's workspaces
  const userWorkspaces = await Workspace.find({ user_id: req.user.id }).select('_id');
  const workspaceIds = userWorkspaces.map(w => w._id.toString()); // ← FIXED: Convert ObjectId to string

  let query = { user_id: req.user.id };
  
  // Filter by workspace if specified
  if (req.query.workspace_id) {
    if (!workspaceIds.includes(req.query.workspace_id)) { // ← Now compares string to string
      return res.status(403).json({
        success: false,
        error: 'Access denied to this workspace'
      });
    }
    query.workspace_id = req.query.workspace_id;
  } else {
    query.workspace_id = { $in: workspaceIds };
  }

  const total = await UserStory.countDocuments(query);
  const userStories = await UserStory.find(query)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  res.status(200).json({
    success: true,
    data: {
      userStories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});
// @desc    Get single user story
// @route   GET /api/user-stories/:id
// @access  Private
exports.getUserStory = asyncHandler(async (req, res) => {
  const userStory = await UserStory.findById(req.params.id)
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  if (!userStory) {
    return res.status(404).json({
      success: false,
      error: 'User story not found'
    });
  }

  // Verify user owns this user story
  if (userStory.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  res.status(200).json({
    success: true,
    data: userStory
  });
});

// @desc    Create new user story
// @route   POST /api/user-stories
// @access  Private
exports.createUserStory = asyncHandler(async (req, res) => {
  const { 
    title, 
    product_context, 
    module_definition,
    epic_definition,
    story_definition,
    user_flow,
    preconditions,
    postconditions,
    dependencies,
    design_considerations,
    technical_considerations,
    definition_of_done,
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

  const userStory = await UserStory.create({
    user_id: req.user.id,
    workspace_id,
    project_id: project_id || null,
    title,
    product_context,
    // Use data from request body or initialize empty objects if not provided
    module_definition: module_definition || {
      module_name: '',
      module_description: ''
    },
    epic_definition: epic_definition || {
      epic_title: '',
      epic_description: '',
      epic_objective: ''
    },
    story_definition: story_definition || {
      user_persona: '',
      user_need: '',
      user_goal: '',
      business_value: '',
      feature_trigger: ''
    },
    user_flow: user_flow || {
      entry_point: '',
      user_actions: '',
      system_responses: '',
      exit_point: ''
    },
    preconditions: preconditions || [],
    postconditions: postconditions || [],
    dependencies: dependencies || [],
    design_considerations: design_considerations || [],
    technical_considerations: technical_considerations || [],
    definition_of_done: definition_of_done || []
  });

  const populatedUserStory = await UserStory.findById(userStory._id)
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  res.status(201).json({
    success: true,
    data: populatedUserStory
  });
});

// @desc    Update user story
// @route   PUT /api/user-stories/:id
// @access  Private
exports.updateUserStory = asyncHandler(async (req, res) => {
  const { 
    title, 
    product_context, 
    module_definition, 
    epic_definition, 
    story_definition, 
    user_flow, 
    preconditions, 
    postconditions, 
    dependencies, 
    design_considerations, 
    technical_considerations, 
    definition_of_done,
    project_id 
  } = req.body;

  let userStory = await UserStory.findById(req.params.id);

  if (!userStory) {
    return res.status(404).json({
      success: false,
      error: 'User story not found'
    });
  }

  // Verify user owns this user story
  if (userStory.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  // If project_id is being updated, verify it belongs to the workspace
  if (project_id && project_id !== userStory.project_id?.toString()) {
    const project = await Project.findOne({
      _id: project_id,
      workspace_id: userStory.workspace_id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found in this workspace'
      });
    }
  }

  // Update fields
  if (title) userStory.title = title;
  if (product_context) userStory.product_context = product_context;
  if (module_definition) userStory.module_definition = module_definition;
  if (epic_definition) userStory.epic_definition = epic_definition;
  if (story_definition) userStory.story_definition = story_definition;
  if (user_flow) userStory.user_flow = user_flow;
  if (preconditions) userStory.preconditions = preconditions;
  if (postconditions) userStory.postconditions = postconditions;
  if (dependencies) userStory.dependencies = dependencies;
  if (design_considerations) userStory.design_considerations = design_considerations;
  if (technical_considerations) userStory.technical_considerations = technical_considerations;
  if (definition_of_done) userStory.definition_of_done = definition_of_done;
  if (project_id !== undefined) userStory.project_id = project_id;

  // Update status based on completion
  const isComplete = 
    product_context && product_context.product_name && 
    module_definition && module_definition.module_name &&
    epic_definition && epic_definition.epic_title &&
    story_definition && story_definition.user_persona &&
    user_flow && user_flow.entry_point &&
    userStory.report && Object.keys(userStory.report).length > 0;
  
  userStory.status = isComplete ? 'complete' : 'draft';

  await userStory.save();

  const populatedUserStory = await UserStory.findById(userStory._id)
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  res.status(200).json({
    success: true,
    data: populatedUserStory
  });
});

// @desc    Delete user story
// @route   DELETE /api/user-stories/:id
// @access  Private
exports.deleteUserStory = asyncHandler(async (req, res) => {
  const userStory = await UserStory.findById(req.params.id);

  if (!userStory) {
    return res.status(404).json({
      success: false,
      error: 'User story not found'
    });
  }

  // Verify user owns this user story
  if (userStory.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  await userStory.deleteOne();

  res.status(200).json({
    success: true,
    data: {
      message: 'User story deleted successfully'
    }
  });
});

// @desc    Generate AI report for user story
// @route   POST /api/user-stories/:id/generate-report
// @access  Private
exports.generateReport = asyncHandler(async (req, res) => {
  const userStory = await UserStory.findById(req.params.id);

  if (!userStory) {
    return res.status(404).json({
      success: false,
      error: 'User story not found'
    });
  }

  // Verify user owns this user story
  if (userStory.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  // Check if user story has required data for report generation
  const missingFields = [];
  
  if (!userStory.product_context?.product_name) missingFields.push('product name');
  if (!userStory.product_context?.product_description) missingFields.push('product description');
  if (!userStory.product_context?.target_user) missingFields.push('target user');
  if (!userStory.product_context?.business_goal) missingFields.push('business goal');
  if (!userStory.product_context?.feature_name) missingFields.push('feature name');
  if (!userStory.product_context?.feature_description) missingFields.push('feature description');
  
  if (!userStory.module_definition?.module_name) missingFields.push('module name');
  if (!userStory.module_definition?.module_description) missingFields.push('module description');
  
  if (!userStory.epic_definition?.epic_title) missingFields.push('epic title');
  if (!userStory.epic_definition?.epic_description) missingFields.push('epic description');
  if (!userStory.epic_definition?.epic_objective) missingFields.push('epic objective');
  
  if (!userStory.story_definition?.user_persona) missingFields.push('user persona');
  if (!userStory.story_definition?.user_need) missingFields.push('user need');
  if (!userStory.story_definition?.user_goal) missingFields.push('user goal');
  if (!userStory.story_definition?.business_value) missingFields.push('business value');
  if (!userStory.story_definition?.feature_trigger) missingFields.push('feature trigger');
  
  if (!userStory.user_flow?.entry_point) missingFields.push('entry point');
  if (!userStory.user_flow?.user_actions) missingFields.push('user actions');
  if (!userStory.user_flow?.system_responses) missingFields.push('system responses');
  if (!userStory.user_flow?.exit_point) missingFields.push('exit point');
  
  // Optional but recommended fields
  const recommendedFields = [];
  if (!userStory.preconditions?.length) recommendedFields.push('preconditions');
  if (!userStory.postconditions?.length) recommendedFields.push('postconditions');
  if (!userStory.dependencies?.length) recommendedFields.push('dependencies');
  if (!userStory.design_considerations?.length) recommendedFields.push('design considerations');
  if (!userStory.technical_considerations?.length) recommendedFields.push('technical considerations');
  if (!userStory.definition_of_done?.length) recommendedFields.push('definition of done');

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Please complete the required fields before generating a report',
      required_fields: missingFields,
      recommended_fields: recommendedFields,
      message: `Missing required information: ${missingFields.join(', ')}. ${recommendedFields.length > 0 ? `For better results, also consider adding: ${recommendedFields.join(', ')}.` : ''}`
    });
  }

  try {
    // Generate report using Gemini AI
    const report = await geminiService.generateUserStory({
      product_context: userStory.product_context,
      module_definition: userStory.module_definition,
      epic_definition: userStory.epic_definition,
      story_definition: userStory.story_definition,
      user_flow: userStory.user_flow,
      preconditions: userStory.preconditions,
      postconditions: userStory.postconditions,
      dependencies: userStory.dependencies,
      design_considerations: userStory.design_considerations,
      technical_considerations: userStory.technical_considerations,
      definition_of_done: userStory.definition_of_done
    });

    // Save report to user story
    userStory.report = report;
    userStory.status = 'complete';
    await userStory.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'User story report generated successfully',
        report: userStory.report
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

// @desc    Get projects for user story linking
// @route   GET /api/user-stories/projects/:workspace_id
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
