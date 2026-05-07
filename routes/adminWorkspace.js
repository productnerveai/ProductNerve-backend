const express = require('express');
const router = express.Router();
const {
  getAllWorkspaces,
  getWorkspaceById,
  updateWorkspaceStatus,
  deleteWorkspace,
  getAllProjects,
  getProjectById,
  updateProjectStatus,
  deleteProject,
  getProjectStats
} = require('../controllers/adminWorkspaceController');
const { protect } = require('../middleware/auth');
const { requireAdmin, requirePermission } = require('../middleware/adminAuth');

// All workspace management routes require authentication and admin access
router.use(protect);
router.use(requireAdmin);

/**
 * Workspace Management
 */

// Get all workspaces
router.get('/workspaces', requirePermission('can_manage_workspaces'), getAllWorkspaces);

// Get specific workspace
router.get('/workspaces/:id', requirePermission('can_manage_workspaces'), getWorkspaceById);

// Update workspace status
router.put('/workspaces/:id/status', requirePermission('can_manage_workspaces'), updateWorkspaceStatus);

// Delete workspace
router.delete('/workspaces/:id', requirePermission('can_manage_workspaces'), deleteWorkspace);

/**
 * Project Management
 */

// Get all projects
router.get('/projects', requirePermission('can_manage_workspaces'), getAllProjects);

// Get project statistics
router.get('/projects/stats', requirePermission('can_view_analytics'), getProjectStats);

// Get specific project
router.get('/projects/:id', requirePermission('can_view_analytics'), getProjectById);

// Update project status
router.put('/projects/:id/status', requirePermission('can_manage_workspaces'), updateProjectStatus);

// Delete project
router.delete('/projects/:id', requirePermission('can_manage_workspaces'), deleteProject);

module.exports = router;
