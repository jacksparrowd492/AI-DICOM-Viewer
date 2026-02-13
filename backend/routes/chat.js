const express = require('express');
const { auth } = require('../middleware/auth');
const Study = require('../models/Study');

const router = express.Router();

router.use(auth);

// Mock AI chatbot response (replace with actual AI model like OpenAI)
const generateChatResponse = async (message, context) => {
  // Simulate AI processing
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const lowerMessage = message.toLowerCase();
  
  // Medical knowledge base responses
  if (lowerMessage.includes('tumor') || lowerMessage.includes('mass')) {
    return {
      message: "Based on the imaging study, I can help you understand tumor characteristics. Tumors can be benign or malignant. Key factors to consider include size, location, growth rate, and tissue characteristics. Would you like me to analyze specific findings from this study?",
      suggestions: [
        "What type of tumor is this?",
        "Is this tumor malignant?",
        "What are the treatment options?",
        "What are the next steps?"
      ]
    };
  }
  
  if (lowerMessage.includes('ct') || lowerMessage.includes('mri')) {
    return {
      message: "CT and MRI are both advanced imaging modalities. CT uses X-rays and is excellent for bone imaging and quick scans. MRI uses magnetic fields and provides superior soft tissue contrast. The choice depends on what we're looking for.",
      suggestions: [
        "What's the difference between CT and MRI?",
        "Which scan is better for brain imaging?",
        "Are there any risks?",
        "How should I prepare?"
      ]
    };
  }
  
  if (lowerMessage.includes('treatment') || lowerMessage.includes('therapy')) {
    return {
      message: "Treatment options depend on the specific diagnosis. Common approaches include surgery, radiation therapy, chemotherapy, or a combination. The radiologist's report and your physician's assessment will guide the treatment plan. Would you like information about any specific treatment?",
      suggestions: [
        "What is radiation therapy?",
        "Tell me about surgical options",
        "What are the side effects?",
        "How long does treatment take?"
      ]
    };
  }
  
  if (lowerMessage.includes('prediction') || lowerMessage.includes('ai result')) {
    if (context.hasPrediction) {
      return {
        message: `The AI analysis shows ${context.hasTumor ? 'a potential abnormality' : 'no significant abnormalities'} with ${context.confidence}% confidence. ${context.hasTumor ? `The detected mass appears to be a ${context.tumorType} with ${context.severity} severity.` : ''} Please note that AI predictions should be confirmed by a qualified radiologist.`,
        suggestions: [
          "What does this mean?",
          "How accurate is AI?",
          "Should I be concerned?",
          "What are the next steps?"
        ]
      };
    }
  }
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return {
      message: "Hello! I'm your medical imaging assistant. I can help you understand your imaging studies, explain medical terms, and provide general information about diagnostic procedures. How can I assist you today?",
      suggestions: [
        "Explain my CT scan results",
        "What do I need to know about this study?",
        "Tell me about the findings",
        "What are the next steps?"
      ]
    };
  }
  
  if (lowerMessage.includes('brain') || lowerMessage.includes('head')) {
    return {
      message: "Brain imaging is crucial for diagnosing neurological conditions. Common findings include tumors, strokes, bleeding, or structural abnormalities. The imaging helps identify the location, size, and nature of any abnormalities. Would you like specific information about your brain scan?",
      suggestions: [
        "What are common brain tumors?",
        "Explain the brain anatomy",
        "What is a glioblastoma?",
        "Tell me about meningioma"
      ]
    };
  }

  // Default response
  return {
    message: "I'm here to help you understand your medical imaging studies. You can ask me about specific findings, imaging modalities, medical terminology, or general questions about diagnostic procedures. What would you like to know?",
    suggestions: [
      "Explain my scan results",
      "What is a CT scan?",
      "Tell me about tumors",
      "What do the findings mean?"
    ]
  };
};

// Chat endpoint
router.post('/message', async (req, res) => {
  try {
    const { message, studyId, context } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    let studyContext = {};
    
    // If studyId provided, get study context
    if (studyId) {
      const study = await Study.findById(studyId).populate('patient');
      if (study) {
        studyContext = {
          modality: study.modality,
          bodyPart: study.bodyPart,
          description: study.description,
          findings: study.findings,
          hasPrediction: study.aiPredictions.length > 0,
          latestPrediction: study.aiPredictions[study.aiPredictions.length - 1]
        };

        if (studyContext.hasPrediction) {
          const pred = studyContext.latestPrediction.result;
          studyContext.hasTumor = pred.hasTumor;
          studyContext.confidence = Math.round(pred.confidence * 100);
          studyContext.tumorType = pred.tumorType;
          studyContext.severity = pred.severity;
        }
      }
    }

    // Generate response
    const response = await generateChatResponse(message, { ...studyContext, ...context });

    res.json({
      success: true,
      response: response.message,
      suggestions: response.suggestions || [],
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing chat message',
      error: error.message
    });
  }
});

// Get chat history (if implemented with database storage)
router.get('/history/:studyId', async (req, res) => {
  try {
    // This would retrieve chat history from database
    // For now, return empty array
    res.json({
      success: true,
      history: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching chat history',
      error: error.message
    });
  }
});

module.exports = router;