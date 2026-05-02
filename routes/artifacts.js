const express = require('express');
const router = express.Router();
const {
  getAllArtifacts,
  getArtifactsByType,
  deleteArtifact,
  getArtifactStats,
  getRecentArtifacts
} = require('../controllers/artifactsController');
const { protect } = require('../middleware/auth');

// Get all artifacts (aggregated from all tools)
router.get('/', protect, getAllArtifacts);

// Get artifact statistics
router.get('/stats', protect, getArtifactStats);

// Get recent artifacts
router.get('/recent', protect, getRecentArtifacts);

// Get artifacts by type
router.get('/:type', protect, getArtifactsByType);

// Delete artifact by type and ID
router.delete('/:type/:id', protect, deleteArtifact);

module.exports = router;
