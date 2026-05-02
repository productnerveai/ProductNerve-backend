const Project = require('../models/Project');
const Workspace = require('../models/Workspace');
const geminiService = require('../services/geminiService');
const asyncHandler = require('../middleware/asyncHandler');
const mongoose = require('mongoose');

// @desc    Generate Phase 1 venture score
// @route   POST /api/validation/phase1-score
// @access  Private
exports.generatePhase1Score = asyncHandler(async (req, res) => {
  const { intake_data, project_id } = req.body;

  if (!intake_data || !project_id) {
    return res.status(400).json({
      success: false,
      error: 'Intake data and project ID are required'
    });
  }

  // Verify project ownership
  const project = await Project.findById(project_id);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: project.workspace_id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Generate AI score
  const scoreData = await geminiService.generatePhase1Score(intake_data);
  
  
  // Update project with Phase 1 results
  project.phase1_data = {
    ...project.phase1_data,
    ...intake_data
  };
  project.phase1_score = scoreData.viability_score;
  project.phase1_classification = scoreData.classification;
  project.phase1_analysis = scoreData.phase1_analysis || scoreData;
  project.phase1_status = 'complete';
  project.overall_score = scoreData.viability_score;

  await project.save();

  res.status(200).json({
    success: true,
    data: {
      viability_score: scoreData.viability_score,
      classification: scoreData.classification,
      analysis: scoreData,
      project_id: project._id
    }
  });
});

// @desc    Get Phase 1 results
// @route   GET /api/validation/phase1/:projectId
// @access  Private
exports.getPhase1Results = asyncHandler(async (req, res) => {
  console.log('Getting Phase 1 results for project:', req.params.projectId);
  console.log('User ID:', req.user.id);
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(req.params.projectId)) {
    console.log('Invalid ObjectId format:', req.params.projectId);
    return res.status(400).json({
      success: false,
      error: 'Invalid project ID format'
    });
  }
  
  // First find the project
  const project = await Project.findById(req.params.projectId);

  if (!project) {
    console.log('Project not found for ID:', req.params.projectId);
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Then verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: project.workspace_id,
    user_id: req.user.id
  });

  if (!workspace) {
    console.log('User does not own workspace for project:', req.params.projectId);
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      phase1_data: project.phase1_data,
      phase1_score: project.phase1_score,
      phase1_classification: project.phase1_classification,
      phase1_analysis: project.phase1_analysis,
      phase1_status: project.phase1_status
    }
  });
});

// @desc    Update Phase 1 intake data
// @route   PUT /api/validation/phase1/:projectId
// @access  Private
exports.updatePhase1Data = asyncHandler(async (req, res) => {
  const { intake_data } = req.body;
  
  console.log('Updating Phase 1 data for project:', req.params.projectId);
  console.log('User ID:', req.user.id);
  console.log('Intake data received:', intake_data ? 'Yes' : 'No');

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(req.params.projectId)) {
    console.log('Invalid ObjectId format:', req.params.projectId);
    return res.status(400).json({
      success: false,
      error: 'Invalid project ID format'
    });
  }

  // First find the project
  const project = await Project.findById(req.params.projectId);

  if (!project) {
    console.log('Project not found for ID:', req.params.projectId);
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Then verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: project.workspace_id,
    user_id: req.user.id
  });

  if (!workspace) {
    console.log('User does not own workspace for project:', req.params.projectId);
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Only allow update if phase is not locked
  if (project.phase1_status === 'locked') {
    return res.status(400).json({
      success: false,
      error: 'Phase 1 is locked and cannot be updated'
    });
  }

  project.phase1_data = {
    ...project.phase1_data,
    ...intake_data
  };
  project.phase1_status = 'in_progress';

  await project.save();

  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Lock Phase 1
// @route   POST /api/validation/phase1/:projectId/lock
// @access  Private
exports.lockPhase1 = asyncHandler(async (req, res) => {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(req.params.projectId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid project ID format'
    });
  }

  // First find the project
  const project = await Project.findById(req.params.projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Then verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: project.workspace_id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  if (!project.phase1_score) {
    return res.status(400).json({
      success: false,
      error: 'Phase 1 must be scored before locking'
    });
  }

  project.phase1_status = 'locked';
  await project.save();

  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Generate Phase 2 execution score
// @route   POST /api/validation/phase2-score
// @access  Private
exports.generatePhase2Score = asyncHandler(async (req, res) => {
  const { intake_data, execution_mode, project_id } = req.body;

  if (!intake_data || !execution_mode || !project_id) {
    return res.status(400).json({
      success: false,
      error: 'Intake data, execution mode, and project ID are required'
    });
  }

  // Verify project ownership
  const project = await Project.findById(project_id);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: project.workspace_id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify Phase 1 is complete
  if (project.phase1_status !== 'locked') {
    return res.status(400).json({
      success: false,
      error: 'Phase 1 must be locked before starting Phase 2'
    });
  }

  // Generate AI execution score
  const scoreData = await geminiService.generatePhase2Score(intake_data, execution_mode);
  
  console.log('Phase 2 scoring - scoreData:', scoreData);

  // Update project with Phase 2 results
  project.phase2_execution_data = {
    ...project.phase2_execution_data,
    intake_data: scoreData.intake_data,
    execution_mode: scoreData.execution_mode,
    phase2_analysis: scoreData.phase2_analysis
  };
  project.phase2_status = 'complete';
  project.execution_score = scoreData.execution_score;
  project.execution_classification = scoreData.execution_classification;

  console.log('Phase 2 scoring - After setting project fields:', {
    execution_score: project.execution_score,
    execution_classification: project.execution_classification
  });

  await project.save();

  res.status(200).json({
    success: true,
    data: {
      execution_score: scoreData.execution_score,
      execution_classification: scoreData.execution_classification,
      execution_mode: scoreData.execution_mode,
      phase2_analysis: scoreData.phase2_analysis,
      phase2_execution_data: project.phase2_execution_data
    }
  });
});

// @desc    Get Phase 2 results
// @route   GET /api/validation/phase2/:projectId
// @access  Private
exports.getPhase2Results = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid project ID'
    });
  }

  // Find project and populate workspace
  const project = await Project.findById(projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: project.workspace_id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Check if Phase 2 has started
  if (project.phase2_status === 'not_started') {
    return res.status(200).json({
      success: true,
      data: {
        phase2_status: 'not_started',
        intake_complete: false,
        execution_mode: null,
        execution_score: null,
        execution_classification: null,
        phase2_analysis: null
      }
    });
  }

  // If top-level execution fields are missing but we have phase2_analysis, extract them
  console.log('Checking extraction conditions:', {
    hasExecutionScore: !!project.execution_score,
    hasPhase2Analysis: !!project.phase2_execution_data?.phase2_analysis,
    hasFinalScore: !!project.phase2_execution_data?.phase2_analysis?.scoring_audit?.final_score,
    finalScoreValue: project.phase2_execution_data?.phase2_analysis?.scoring_audit?.final_score
  });
  
  if (!project.execution_score && project.phase2_execution_data?.phase2_analysis?.scoring_audit?.final_score) {
    project.execution_score = project.phase2_execution_data.phase2_analysis.scoring_audit.final_score;
    console.log('Extracted execution_score from phase2_analysis:', project.execution_score);
    
    // Also save the updated project
    await project.save();
  }

  if (!project.execution_classification && project.phase2_execution_data?.phase2_analysis?.scoring_audit?.final_score) {
    const score = project.phase2_execution_data.phase2_analysis.scoring_audit.final_score;
    let classification = "Premature to Build";
    if (score >= 80) classification = "Execution Ready";
    else if (score >= 70) classification = "Structurally Sound but Resource Sensitive";
    else if (score >= 60) classification = "Fragile Execution";
    else if (score >= 50) classification = "High Execution Risk";
    
    project.execution_classification = classification;
    console.log('Set execution_classification from score:', classification);
    
    // Also save the updated project
    await project.save();
  }

  console.log('getPhase2Results - Project data:', {
  execution_score: project.execution_score,
  execution_classification: project.execution_classification,
  phase2_status: project.phase2_status,
  phase2_execution_data: project.phase2_execution_data
});

  // Return Phase 2 results
  res.status(200).json({
    success: true,
    data: {
      phase2_status: project.phase2_status,
      intake_complete: !!project.phase2_execution_data?.intake_data,
      intake_data: project.phase2_execution_data?.intake_data || null,
      execution_mode: project.phase2_execution_data?.execution_mode || null,
      execution_score: project.execution_score || null,
      execution_classification: project.execution_classification || null,
      phase2_analysis: project.phase2_execution_data?.phase2_analysis || null
    }
  });
});

// @desc    Update Phase 2 intake data
// @route   PUT /api/validation/phase2/:projectId
// @access  Private
exports.updatePhase2Data = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { intake_data, execution_mode } = req.body;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid project ID'
    });
  }

  // Find project
  const project = await Project.findById(projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: project.workspace_id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Ensure phase2_execution_data exists with required structure
  if (!project.phase2_execution_data) {
    project.phase2_execution_data = {};
  }

  // Ensure required objects exist to prevent undefined errors
  if (!project.phase2_execution_data.intake_data) {
    project.phase2_execution_data.intake_data = {};
  }

  if (!project.phase2_execution_data.phase2_analysis) {
    project.phase2_execution_data.phase2_analysis = {};
  }

  // Update Phase 2 data only with defined values
  if (intake_data) {
    project.phase2_execution_data.intake_data = intake_data;
    project.phase2_status = 'in_progress';
  }

  if (execution_mode) {
    project.phase2_execution_data.execution_mode = execution_mode;
  }

  await project.save();

  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Lock Phase 2
// @route   POST /api/validation/phase2/:projectId/lock
// @access  Private
exports.lockPhase2 = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid project ID'
    });
  }

  // First find project
  const project = await Project.findById(projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Then verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: project.workspace_id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  console.log('Lock Phase 2 - Project state:', {
  execution_score: project.execution_score,
  phase2_status: project.phase2_status,
  phase2_execution_data: project.phase2_execution_data
});

  // If top-level execution fields are missing but we have phase2_analysis, extract them
  if (!project.execution_score && project.phase2_execution_data?.phase2_analysis?.scoring_audit?.final_score) {
    project.execution_score = project.phase2_execution_data.phase2_analysis.scoring_audit.final_score;
    console.log('Lock Phase 2 - Extracted execution_score from phase2_analysis:', project.execution_score);
    
    // Also save the updated project
    await project.save();
  }

  if (!project.execution_classification && project.phase2_execution_data?.phase2_analysis?.scoring_audit?.final_score) {
    const score = project.phase2_execution_data.phase2_analysis.scoring_audit.final_score;
    let classification = "Premature to Build";
    if (score >= 80) classification = "Execution Ready";
    else if (score >= 70) classification = "Structurally Sound but Resource Sensitive";
    else if (score >= 60) classification = "Fragile Execution";
    else if (score >= 50) classification = "High Execution Risk";
    
    project.execution_classification = classification;
    console.log('Lock Phase 2 - Set execution_classification from score:', classification);
    
    // Also save the updated project
    await project.save();
  }

  if (!project.execution_score) {
    return res.status(400).json({
      success: false,
      error: 'Phase 2 must be scored before locking'
    });
  }

  project.phase2_status = 'locked';
  await project.save();

  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Generate Phase 2 intake chat response
// @route   POST /api/validation/phase2-intake
// @access  Private
exports.generatePhase2IntakeResponse = asyncHandler(async (req, res) => {
  const { messages, project_id } = req.body;

  if (!messages || !project_id) {
    return res.status(400).json({
      success: false,
      error: 'Messages and project ID are required'
    });
  }

  // Verify project ownership
  const project = await Project.findById(project_id);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: project.workspace_id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Verify Phase 1 is complete
  if (project.phase1_status !== 'locked') {
    return res.status(400).json({
      success: false,
      error: 'Phase 1 must be locked before starting Phase 2'
    });
  }

  // Generate AI intake response
  const response = await geminiService.generatePhase2IntakeResponse(messages, project_id);

  res.status(200).json({
    success: true,
    data: response
  });
});

// @desc    Generate Phase 3 growth score
// @route   POST /api/validation/phase3-score
// @access  Private
exports.generatePhase3Score = asyncHandler(async (req, res) => {
  const { intake_data, growth_mode, project_id } = req.body;

  if (!intake_data || !growth_mode || !project_id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Intake data, growth mode, and project ID are required' 
    });
  }

  const project = await Project.findById(project_id);

  if (!project) {
    return res.status(404).json({ 
      success: false, 
      error: 'Project not found' 
    });
  }

  // Ensure Phase 2 is locked
  if (project.phase2_status !== 'locked') {
    return res.status(400).json({
      success: false,
      error: 'Phase 2 must be locked before starting Phase 3'
    });
  }

  // Generate AI growth score
  const scoreData = await geminiService.generatePhase3Score(intake_data, growth_mode);
  
  console.log('Phase 3 scoring - scoreData:', scoreData);

  // Update project with Phase 3 results
  project.phase3_growth_data = {
    ...project.phase3_growth_data,
    intake_data: scoreData.intake_data,
    growth_mode: scoreData.growth_mode,
    phase3_analysis: scoreData.phase3_analysis
  };
  project.phase3_status = 'complete';
  project.growth_score = scoreData.growth_score;
  project.growth_classification = scoreData.growth_classification;

  console.log('Phase 3 scoring - After setting project fields:', {
    growth_score: project.growth_score,
    growth_classification: project.growth_classification
  });

  await project.save();

  res.status(200).json({
    success: true,
    data: {
      growth_score: scoreData.growth_score,
      growth_classification: scoreData.growth_classification,
      growth_mode: scoreData.growth_mode,
      phase3_analysis: scoreData.phase3_analysis,
      phase3_growth_data: project.phase3_growth_data
    }
  });
});

// @desc    Get Phase 3 results
// @route   GET /api/validation/phase3/:projectId
// @access  Private
exports.getPhase3Results = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid project ID' 
    });
  }

  const project = await Project.findById(projectId);

  if (!project) {
    return res.status(404).json({ 
      success: false, 
      error: 'Project not found' 
    });
  }

  // Check if Phase 3 has started
  if (project.phase3_status === 'not_started') {
    return res.status(200).json({
      success: true,
      data: {
        phase3_status: 'not_started',
        intake_complete: false,
        growth_mode: null,
        growth_score: null,
        growth_classification: null,
        phase3_analysis: null
      }
    });
  }

  // If top-level growth fields are missing but we have phase3_analysis, extract them
  console.log('Checking Phase 3 extraction conditions:', {
    hasGrowthScore: !!project.growth_score,
    hasPhase3Analysis: !!project.phase3_growth_data?.phase3_analysis,
    hasFinalScore: !!project.phase3_growth_data?.phase3_analysis?.scoring_audit?.final_score,
    finalScoreValue: project.phase3_growth_data?.phase3_analysis?.scoring_audit?.final_score
  });
  
  if (!project.growth_score && project.phase3_growth_data?.phase3_analysis?.scoring_audit?.final_score) {
    project.growth_score = project.phase3_growth_data.phase3_analysis.scoring_audit.final_score;
    console.log('Extracted growth_score from phase3_analysis:', project.growth_score);
    
    // Also save the updated project
    await project.save();
  }

  if (!project.growth_classification && project.phase3_growth_data?.phase3_analysis?.scoring_audit?.final_score) {
    const score = project.phase3_growth_data.phase3_analysis.scoring_audit.final_score;
    let classification = "High GTM Risk";
    if (score >= 80) classification = "Structured Growth Engine";
    else if (score >= 70) classification = "Early but Sound";
    else if (score >= 60) classification = "Fragile Growth Structure";
    
    project.growth_classification = classification;
    console.log('Set growth_classification from score:', classification);
    
    // Also save the updated project
    await project.save();
  }

  console.log('getPhase3Results - Project data:', {
  growth_score: project.growth_score,
  growth_classification: project.growth_classification,
  phase3_status: project.phase3_status,
  phase3_growth_data: project.phase3_growth_data
});

  // Return Phase 3 results
  res.status(200).json({
    success: true,
    data: {
      phase3_status: project.phase3_status,
      intake_complete: !!project.phase3_growth_data?.intake_data,
      intake_data: project.phase3_growth_data?.intake_data || null,
      growth_mode: project.phase3_growth_data?.growth_mode || null,
      growth_score: project.growth_score || null,
      growth_classification: project.growth_classification || null,
      phase3_analysis: project.phase3_growth_data?.phase3_analysis || null
    }
  });
});

// @desc    Update Phase 3 intake data
// @route   PUT /api/validation/phase3/:projectId
// @access  Private
exports.updatePhase3Data = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { intake_data, growth_mode } = req.body;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid project ID' 
    });
  }

  try {
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        error: 'Project not found' 
      });
    }

    // Ensure phase3_growth_data exists with required structure
    if (!project.phase3_growth_data) {
      project.phase3_growth_data = {};
    }

    // Ensure required objects exist to prevent undefined errors
    if (!project.phase3_growth_data.intake_data) {
      project.phase3_growth_data.intake_data = {};
    }

    if (!project.phase3_growth_data.phase3_analysis) {
      project.phase3_growth_data.phase3_analysis = {};
    }

    // Update Phase 3 data only with defined values
    if (intake_data) {
      project.phase3_growth_data.intake_data = intake_data;
      project.phase3_status = 'in_progress';
    }

    if (growth_mode) {
      project.phase3_growth_data.growth_mode = growth_mode;
    }

    await project.save();

    res.status(200).json({
      success: true,
      data: {
        phase3_status: project.phase3_status,
        intake_complete: !!project.phase3_growth_data?.intake_data,
        growth_mode: project.phase3_growth_data?.growth_mode || null
      }
    });
  } catch (error) {
    console.error('Error updating Phase 3 data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update Phase 3 data' 
    });
  }
});

// @desc    Lock Phase 3
// @route   POST /api/validation/phase3/:projectId/lock
// @access  Private
exports.lockPhase3 = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid project ID' 
    });
  }

  const project = await Project.findById(projectId);

  if (!project) {
    return res.status(404).json({ 
      success: false, 
      error: 'Project not found' 
    });
  }

  // Ensure Phase 2 is locked
  if (project.phase2_status !== 'locked') {
    return res.status(400).json({
      success: false,
      error: 'Phase 2 must be locked before locking Phase 3'
    });
  }

  // Then verify user owns the workspace
  const workspace = await Workspace.findOne({
    _id: project.workspace_id,
    user_id: req.user.id
  });

  if (!workspace) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  console.log('Lock Phase 3 - Project state:', {
  growth_score: project.growth_score,
  phase3_status: project.phase3_status,
  phase3_growth_data: project.phase3_growth_data
});

  // If top-level growth fields are missing but we have phase3_analysis, extract them
  if (!project.growth_score && project.phase3_growth_data?.phase3_analysis?.scoring_audit?.final_score) {
    project.growth_score = project.phase3_growth_data.phase3_analysis.scoring_audit.final_score;
    console.log('Lock Phase 3 - Extracted growth_score from phase3_analysis:', project.growth_score);
    
    // Also save the updated project
    await project.save();
  }

  if (!project.growth_classification && project.phase3_growth_data?.phase3_analysis?.scoring_audit?.final_score) {
    const score = project.phase3_growth_data.phase3_analysis.scoring_audit.final_score;
    let classification = "High GTM Risk";
    if (score >= 80) classification = "Structured Growth Engine";
    else if (score >= 70) classification = "Early but Sound";
    else if (score >= 60) classification = "Fragile Growth Structure";
    
    project.growth_classification = classification;
    console.log('Lock Phase 3 - Set growth_classification from score:', classification);
    
    // Also save the updated project
    await project.save();
  }

  if (!project.growth_score) {
    return res.status(400).json({
      success: false,
      error: 'Phase 3 must be scored before locking'
    });
  }

  project.phase3_status = 'locked';
  await project.save();

  res.status(200).json({
    success: true,
    message: 'Phase 3 locked successfully'
  });
});

// @desc    Generate Phase 3 intake chat response
// @route   POST /api/validation/phase3-intake
// @access  Private
exports.generatePhase3IntakeResponse = asyncHandler(async (req, res) => {
  const { messages, project_id } = req.body;

  if (!messages || !project_id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Messages and project ID are required' 
    });
  }

  try {
    // Generate AI intake response
    const response = await geminiService.generatePhase3IntakeResponse(messages, project_id);

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error generating Phase 3 intake response:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate intake response' 
    });
  }
});