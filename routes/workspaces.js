const express = require('express');
const router = express.Router();
const {
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceProjects
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/auth');
const { validateWorkspace, validateUpdateWorkspace } = require('../middleware/validator');

router.route('/')
  .get(protect, getWorkspaces)
  .post(protect, validateWorkspace, createWorkspace);

router.route('/:id')
  .get(protect, getWorkspace)
  .put(protect, validateUpdateWorkspace, updateWorkspace)
  .delete(protect, deleteWorkspace);

router.get('/:id/projects', protect, getWorkspaceProjects);

module.exports = router;
