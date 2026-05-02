const PRD = require('../models/PRD');
const UserStory = require('../models/UserStory');
const ICP = require('../models/ICP');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all artifacts for a workspace
// @route   GET /api/artifacts
// @access  Private
exports.getAllArtifacts = asyncHandler(async (req, res) => {
  const { workspace_id, project_id } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const startIndex = (page - 1) * limit;

  // Get user's workspaces
  const userWorkspaces = await Workspace.find({ user_id: req.user.id }).select('_id');
  const workspaceIds = userWorkspaces.map(w => w._id.toString());

  let query = { user_id: req.user.id };
  
  // Filter by workspace if specified
  if (workspace_id) {
    if (!workspaceIds.includes(workspace_id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this workspace'
      });
    }
    query.workspace_id = workspace_id;
  } else {
    query.workspace_id = { $in: workspaceIds };
  }

  // Filter by project if specified
  if (project_id) {
    query.project_id = project_id;
  }

  // Get PRDs
  const prdQuery = { ...query };
  const prds = await PRD.find(prdQuery)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .select('id title status project_id workspace_id createdAt updatedAt')
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  // Get User Stories
  const storyQuery = { ...query };
  const userStories = await UserStory.find(storyQuery)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .select('id title status project_id workspace_id createdAt updatedAt')
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  // Get ICPs
  const icpQuery = { ...query };
  const icps = await ICP.find(icpQuery)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .select('id title status project_id workspace_id createdAt updatedAt')
    .populate('project_id', 'name')
    .populate('workspace_id', 'name');

  // Get counts for pagination
  const prdTotal = await PRD.countDocuments(prdQuery);
  const storyTotal = await UserStory.countDocuments(storyQuery);
  const icpTotal = await ICP.countDocuments(icpQuery);

  res.status(200).json({
    success: true,
    data: {
      prd: {
        artifacts: prds,
        total: prdTotal,
        pagination: {
          page,
          limit,
          total: prdTotal,
          pages: Math.ceil(prdTotal / limit)
        }
      },
      stories: {
        artifacts: userStories,
        total: storyTotal,
        pagination: {
          page,
          limit,
          total: storyTotal,
          pages: Math.ceil(storyTotal / limit)
        }
      },
      icp: {
        artifacts: icps,
        total: icpTotal,
        pagination: {
          page,
          limit,
          total: icpTotal,
          pages: Math.ceil(icpTotal / limit)
        }
      },
      experiments: {
        artifacts: [], // Future: Experiment model
        total: 0,
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      },
      growth: {
        artifacts: [], // Future: Growth model
        total: 0,
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      },
      roadmaps: {
        artifacts: [], // Future: Roadmap model
        total: 0,
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      }
    }
  });
});

// @desc    Get artifacts by type
// @route   GET /api/artifacts/:type
// @access  Private
exports.getArtifactsByType = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { workspace_id, project_id } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  // Validate type
  const validTypes = ['prd', 'stories', 'icp', 'experiments', 'growth', 'roadmaps'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid artifact type'
    });
  }

  // Get user's workspaces
  const userWorkspaces = await Workspace.find({ user_id: req.user.id }).select('_id');
  const workspaceIds = userWorkspaces.map(w => w._id.toString());

  let query = { user_id: req.user.id };
  
  // Filter by workspace if specified
  if (workspace_id) {
    if (!workspaceIds.includes(workspace_id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this workspace'
      });
    }
    query.workspace_id = workspace_id;
  } else {
    query.workspace_id = { $in: workspaceIds };
  }

  // Filter by project if specified
  if (project_id) {
    query.project_id = project_id;
  }

  let artifacts = [];
  let total = 0;

  switch (type) {
    case 'prd':
      artifacts = await PRD.find(query)
        .sort({ createdAt: -1 })
        .skip(startIndex)
        .limit(limit)
        .select('id title status project_id workspace_id createdAt updatedAt')
        .populate('project_id', 'name')
        .populate('workspace_id', 'name');
      total = await PRD.countDocuments(query);
      break;
    
    case 'stories':
      artifacts = await UserStory.find(query)
        .sort({ createdAt: -1 })
        .skip(startIndex)
        .limit(limit)
        .select('id title status project_id workspace_id createdAt updatedAt')
        .populate('project_id', 'name')
        .populate('workspace_id', 'name');
      total = await UserStory.countDocuments(query);
      break;
    
    case 'icp':
      artifacts = await ICP.find(query)
        .sort({ createdAt: -1 })
        .skip(startIndex)
        .limit(limit)
        .select('id title status project_id workspace_id createdAt updatedAt')
        .populate('project_id', 'name')
        .populate('workspace_id', 'name');
      total = await ICP.countDocuments(query);
      break;
    
    case 'experiments':
    case 'growth':
    case 'roadmaps':
      // Future implementations
      artifacts = [];
      total = 0;
      break;
  }

  res.status(200).json({
    success: true,
    data: {
      artifacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Delete artifact by type and ID
// @route   DELETE /api/artifacts/:type/:id
// @access  Private
exports.deleteArtifact = asyncHandler(async (req, res) => {
  const { type, id } = req.params;

  // Validate type
  const validTypes = ['prd', 'stories', 'icp'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid artifact type or deletion not supported'
    });
  }

  let artifact;
  let modelName;

  switch (type) {
    case 'prd':
      artifact = await PRD.findById(id);
      modelName = 'PRD';
      break;
    
    case 'stories':
      artifact = await UserStory.findById(id);
      modelName = 'User Story';
      break;
    
    case 'icp':
      artifact = await ICP.findById(id);
      modelName = 'ICP';
      break;
  }

  if (!artifact) {
    return res.status(404).json({
      success: false,
      error: `${modelName} not found`
    });
  }

  // Verify user owns this artifact
  if (artifact.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  await artifact.deleteOne();

  res.status(200).json({
    success: true,
    data: {
      message: `${modelName} deleted successfully`
    }
  });
});

// @desc    Get artifact statistics
// @route   GET /api/artifacts/stats
// @access  Private
exports.getArtifactStats = asyncHandler(async (req, res) => {
  const { workspace_id, project_id } = req.query;

  // Get user's workspaces
  const userWorkspaces = await Workspace.find({ user_id: req.user.id }).select('_id');
  const workspaceIds = userWorkspaces.map(w => w._id.toString());

  let query = { user_id: mongoose.Types.ObjectId.createFromHexString(req.user.id) };
  
  // Filter by workspace if specified
  if (workspace_id) {
    if (!workspaceIds.includes(workspace_id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this workspace'
      });
    }
    query.workspace_id = workspace_id;
  } else {
    query.workspace_id = { $in: workspaceIds };
  }

  // Filter by project if specified
  if (project_id) {
    query.project_id = project_id;
  }

  // Debug: Check if documents exist and their structure
  const [prdSample, storySample, icpSample] = await Promise.all([
    PRD.find(query).select('status title').limit(3),
    UserStory.find(query).select('status title').limit(3),
    ICP.find(query).select('status title').limit(3)
  ]);

  console.log('PRD Sample:', prdSample);
  console.log('Story Sample:', storySample);
  console.log('ICP Sample:', icpSample);

  // Get counts by status using regular queries instead of aggregation
  console.log('Stats query:', query);
  
  const [prdDocs, storyDocs, icpDocs] = await Promise.all([
    PRD.find(query).select('status'),
    UserStory.find(query).select('status'),
    ICP.find(query).select('status')
  ]);

  // Count statuses manually
  const countStatuses = (docs) => {
    const result = { draft: 0, complete: 0 };
    docs.forEach(doc => {
      if (doc.status === 'draft') result.draft++;
      else if (doc.status === 'complete') result.complete++;
    });
    return result;
  };

  const prdStats = countStatuses(prdDocs);
  const storyStats = countStatuses(storyDocs);
  const icpStats = countStatuses(icpDocs);

  console.log('PRD Docs:', prdDocs.length, 'Stats:', prdStats);
  console.log('Story Docs:', storyDocs.length, 'Stats:', storyStats);
  console.log('ICP Docs:', icpDocs.length, 'Stats:', icpStats);

  // Get total counts
  const [prdTotal, storyTotal, icpTotal] = await Promise.all([
    PRD.countDocuments(query),
    UserStory.countDocuments(query),
    ICP.countDocuments(query)
  ]);

  // Format stats (already in correct format from manual counting)
  const formatStats = (stats) => {
    return {
      ...stats,
      total: stats.draft + stats.complete
    };
  };

  res.status(200).json({
    success: true,
    data: {
      prd: formatStats(prdStats),
      stories: formatStats(storyStats),
      icp: formatStats(icpStats),
      experiments: { draft: 0, complete: 0, total: 0 },
      growth: { draft: 0, complete: 0, total: 0 },
      roadmaps: { draft: 0, complete: 0, total: 0 },
      overall: {
        total: prdTotal + storyTotal + icpTotal,
        draft: prdStats.draft + storyStats.draft + icpStats.draft,
        complete: prdStats.complete + storyStats.complete + icpStats.complete
      }
    }
  });
});

// @desc    Get recent artifacts
// @route   GET /api/artifacts/recent
// @access  Private
exports.getRecentArtifacts = asyncHandler(async (req, res) => {
  const { workspace_id, limit = 10 } = req.query;
  const limitNum = parseInt(limit, 10);

  // Get user's workspaces
  const userWorkspaces = await Workspace.find({ user_id: req.user.id }).select('_id');
  const workspaceIds = userWorkspaces.map(w => w._id.toString());

  let query = { user_id: req.user.id };
  
  // Filter by workspace if specified
  if (workspace_id) {
    if (!workspaceIds.includes(workspace_id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this workspace'
      });
    }
    query.workspace_id = workspace_id;
  } else {
    query.workspace_id = { $in: workspaceIds };
  }

  // Get recent artifacts from all models
  const [recentPRDs, recentStories, recentICPs] = await Promise.all([
    PRD.find(query)
      .sort({ updatedAt: -1 })
      .limit(limitNum)
      .select('id title status project_id workspace_id createdAt updatedAt')
      .populate('project_id', 'name')
      .populate('workspace_id', 'name'),
    UserStory.find(query)
      .sort({ updatedAt: -1 })
      .limit(limitNum)
      .select('id title status project_id workspace_id createdAt updatedAt')
      .populate('project_id', 'name')
      .populate('workspace_id', 'name'),
    ICP.find(query)
      .sort({ updatedAt: -1 })
      .limit(limitNum)
      .select('id title status project_id workspace_id createdAt updatedAt')
      .populate('project_id', 'name')
      .populate('workspace_id', 'name')
  ]);

  // Combine and sort by updated date
  const allArtifacts = [
    ...recentPRDs.map(a => ({ ...a.toObject(), type: 'prd' })),
    ...recentStories.map(a => ({ ...a.toObject(), type: 'stories' })),
    ...recentICPs.map(a => ({ ...a.toObject(), type: 'icp' }))
  ];

  allArtifacts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.status(200).json({
    success: true,
    data: allArtifacts.slice(0, limitNum)
  });
});
