const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ragController = require('../controllers/ragController');

// Protect all routes
router.use(protect);

// Upload file to RAG folder
router.post('/:projectId/rag/upload', ragController.uploadRAGFile);

// Get RAG folder contents
router.get('/:projectId/rag', ragController.getRAGFolder);

// Delete file from RAG folder
router.delete('/:projectId/rag/:fileId', ragController.deleteRAGFile);

// Get RAG folder content for AI context (internal use)
router.get('/:projectId/rag/context', ragController.getRAGContext);

module.exports = router;
