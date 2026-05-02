const express = require('express');
const router = express.Router();
const {
  getUserStories,
  getUserStory,
  createUserStory,
  updateUserStory,
  deleteUserStory,
  generateReport,
  getWorkspaceProjects
} = require('../controllers/userStoryController');
const { protect } = require('../middleware/auth');
const { validateUserStory, validateUpdateUserStory } = require('../middleware/validator');

// User Story CRUD routes
router.route('/')
  .get(protect, getUserStories)
  .post(protect, validateUserStory, createUserStory);

router.route('/:id')
  .get(protect, getUserStory)
  .put(protect, validateUpdateUserStory, updateUserStory)
  .delete(protect, deleteUserStory);

// Report generation
router.post('/:id/generate-report', protect, generateReport);

// Get projects for linking
router.get('/projects/:workspace_id', protect, getWorkspaceProjects);

module.exports = router;
