const geminiService = require('../services/geminiService');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Generate Phase 1 intake chat response
// @route   POST /api/ai/intake-chat
// @access  Private
exports.generateIntakeChat = asyncHandler(async (req, res) => {
  const { conversation, message_count, project_id } = req.body;

  if (!conversation || message_count === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Conversation and message count are required'
    });
  }

  try {
    const chatResponse = await geminiService.generateIntakeChat({
      conversation,
      message_count,
      project_id
    });

    if (!chatResponse || !chatResponse.response) {
      return res.status(500).json({
        success: false,
        error: 'Empty response from AI service'
      });
    }

    res.status(200).json({
      success: true,
      data: chatResponse
    });
  } catch (error) {
    console.error('Intake chat error:', error.message);
    res.status(503).json({
      success: false,
      error: error.message || 'AI service temporarily unavailable'
    });
  }
});
