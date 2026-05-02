const express = require('express');
const router = express.Router();
const { generateIntakeChat } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const { validateIntakeChat } = require('../middleware/validator');

// AI routes
router.post('/intake-chat', protect, validateIntakeChat, generateIntakeChat);

module.exports = router;
