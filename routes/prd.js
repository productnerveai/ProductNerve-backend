const express = require('express');
const router = express.Router();
const {
  getPRDs,
  getPRD,
  createPRD,
  updatePRD,
  deletePRD,
  generateReport,
  getWorkspaceProjects
} = require('../controllers/prdController');
const { protect } = require('../middleware/auth');
const { validatePRD, validateUpdatePRD } = require('../middleware/validator');

// PRD CRUD routes
router.route('/')
  .get(protect, getPRDs)
  .post(protect, validatePRD, createPRD);

router.route('/:id')
  .get(protect, getPRD)
  .put(protect, validateUpdatePRD, updatePRD)
  .delete(protect, deletePRD);

// Report generation
router.post('/:id/generate-report', protect, generateReport);

// Get projects for linking
router.get('/projects/:workspace_id', protect, getWorkspaceProjects);

module.exports = router;
