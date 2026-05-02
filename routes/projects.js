const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  updatePhase1,
  getPhase1,
  updatePhase2,
  getPhase2,
  updatePhase3,
  getPhase3,
  updateProjectStatus
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { validateProject, validateUpdateProject } = require('../middleware/validator');

// Project CRUD routes
router.route('/')
  .get(protect, getProjects)
  .post(protect, validateProject, createProject);

router.route('/:id')
  .get(protect, getProject)
  .put(protect, validateUpdateProject, updateProject)
  .delete(protect, deleteProject);

// Phase-specific routes
router.route('/:id/phase1')
  .get(protect, getPhase1)
  .put(protect, updatePhase1);

router.route('/:id/phase2')
  .get(protect, getPhase2)
  .put(protect, updatePhase2);

router.route('/:id/phase3')
  .get(protect, getPhase3)
  .put(protect, updatePhase3);

// Status update route
router.patch('/:id/status', protect, updateProjectStatus);

module.exports = router;
