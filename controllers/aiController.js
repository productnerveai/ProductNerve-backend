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
    // Fetch RAG context if available
    let ragContext = null;
    try {
      const ragResponse = await fetch(`${req.protocol}://${req.get('host')}/api/projects/${project_id}/rag/context`, {
        headers: {
          'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`
        }
      });
      
      if (ragResponse.ok) {
        const ragData = await ragResponse.json();
        if (ragData.success && ragData.data.files.length > 0) {
          ragContext = ragData.data.context;
        }
      }
    } catch (error) {
      console.error('Failed to fetch RAG context:', error);
    }

    const chatResponse = await geminiService.generateIntakeChat({
      conversation,
      message_count,
      project_id,
      ragContext
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

// @desc    Generate Phase 2 intake chat response
// @route   POST /api/ai/phase2-intake-chat
// @access  Private
exports.generatePhase2IntakeResponse = asyncHandler(async (req, res) => {
  const { conversation, message_count, project_id } = req.body;

  if (!conversation || message_count === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Conversation and message count are required'
    });
  }

  try {
    // Fetch RAG context if available
    let ragContext = null;
    try {
      const ragResponse = await fetch(`${req.protocol}://${req.get('host')}/api/projects/${project_id}/rag/context`, {
        headers: {
          'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`
        }
      });
      
      if (ragResponse.ok) {
        const ragData = await ragResponse.json();
        if (ragData.success && ragData.data.files.length > 0) {
          ragContext = ragData.data.context;
        }
      }
    } catch (error) {
      console.error('Failed to fetch RAG context:', error);
    }

    const chatResponse = await geminiService.generatePhase2IntakeResponse({
      conversation,
      message_count,
      project_id,
      ragContext
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
    console.error('Phase 2 intake chat error:', error.message);
    res.status(503).json({
      success: false,
      error: error.message || 'AI service temporarily unavailable'
    });
  }
});

// @desc    Generate Phase 3 intake chat response
// @route   POST /api/ai/phase3-intake-chat
// @access  Private
exports.generatePhase3IntakeResponse = asyncHandler(async (req, res) => {
  const { conversation, message_count, project_id } = req.body;

  if (!conversation || message_count === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Conversation and message count are required'
    });
  }

  try {
    // Fetch RAG context if available
    let ragContext = null;
    try {
      const ragResponse = await fetch(`${req.protocol}://${req.get('host')}/api/projects/${project_id}/rag/context`, {
        headers: {
          'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`
        }
      });
      
      if (ragResponse.ok) {
        const ragData = await ragResponse.json();
        if (ragData.success && ragData.data.files.length > 0) {
          ragContext = ragData.data.context;
        }
      }
    } catch (error) {
      console.error('Failed to fetch RAG context:', error);
    }

    const chatResponse = await geminiService.generatePhase3IntakeResponse({
      conversation,
      message_count,
      project_id,
      ragContext
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
    console.error('Phase 3 intake chat error:', error.message);
    res.status(503).json({
      success: false,
      error: error.message || 'AI service temporarily unavailable'
    });
  }
});
