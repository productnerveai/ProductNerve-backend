const express = require('express');
const router = express.Router();
const {
  getICPs,
  getICP,
  createICP,
  updateICP,
  deleteICP,
  generateReport,
  getWorkspaceProjects
} = require('../controllers/icpController');
const { protect } = require('../middleware/auth');
const { validateICP, validateUpdateICP } = require('../middleware/validator');

// ICP CRUD routes
router.route('/')
  .get(protect, getICPs)
  .post(protect, validateICP, createICP);

router.route('/:id')
  .get(protect, getICP)
  .put(protect, validateUpdateICP, updateICP)
  .delete(protect, deleteICP);

// Report generation
router.post('/:id/generate-report', protect, generateReport);

// Get projects for linking
router.get('/projects/:workspace_id', protect, getWorkspaceProjects);

module.exports = router;
