const geminiService = require('../services/geminiService');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Generate Phase 1 intake chat response
// @route   POST /api/ai/intake-chat
// @access  Private
exports.generateIntakeChat = asyncHandler(async (req, res) => {
  const { conversation, message_count, project_id } = req.body;

  if (!conversation || !message_count) {
    return res.status(400).json({
      success: false,
      error: 'Conversation and message count are required'
    });
  }

  // Generate AI response
  const chatResponse = await geminiService.generateIntakeChat({
    conversation,
    message_count,
    project_id
  });

  res.status(200).json({
    success: true,
    data: chatResponse
  });
});
