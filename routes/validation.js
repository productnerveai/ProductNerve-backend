const express = require('express');
const router = express.Router();
const {
  generatePhase1Score,
  getPhase1Results,
  updatePhase1Data,
  lockPhase1,
  generatePhase2Score,
  getPhase2Results,
  updatePhase2Data,
  lockPhase2,
  generatePhase2IntakeResponse,
  generatePhase3Score,
  getPhase3Results,
  updatePhase3Data,
  lockPhase3,
  generatePhase3IntakeResponse
} = require('../controllers/validationController');
const { protect } = require('../middleware/auth');
const {
  validatePhase1Intake,
  validatePhase1Update
} = require('../middleware/validator');

// Phase 1 routes
router.post('/phase1-score', protect, validatePhase1Intake, generatePhase1Score);
router.get('/phase1/:projectId', protect, getPhase1Results);
router.put('/phase1/:projectId', protect, validatePhase1Update, updatePhase1Data);
router.post('/phase1/:projectId/lock', protect, lockPhase1);

// Phase 2 routes
router.post('/phase2-intake', protect, generatePhase2IntakeResponse);
router.post('/phase2-score', protect, generatePhase2Score);
router.get('/phase2/:projectId', protect, getPhase2Results);
router.put('/phase2/:projectId', protect, updatePhase2Data);
router.post('/phase2/:projectId/lock', protect, lockPhase2);

// Phase 3 routes
router.post('/phase3-intake', protect, generatePhase3IntakeResponse);
router.post('/phase3-score', protect, generatePhase3Score);
router.get('/phase3/:projectId', protect, getPhase3Results);
router.put('/phase3/:projectId', protect, updatePhase3Data);
router.post('/phase3/:projectId/lock', protect, lockPhase3);

module.exports = router;
