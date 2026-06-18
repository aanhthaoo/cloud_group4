const express = require('express');
const { sendMessageToDialogflow, HANDOFF_INTENT } = require('../services/dialogflow.service');

const router = express.Router();

router.post('/chat/message', async (req, res) => {
  try {
    const { sessionId, message, user } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'message is required' });
    }

    const result = await sendMessageToDialogflow({
      sessionId,
      message: message.trim(),
      user,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Dialogflow chat error:', error);
    return res.status(500).json({
      message: 'Không thể kết nối Dialogflow lúc này.',
      detail: error.message,
    });
  }
});

router.post('/chat/handoff', (req, res) => {
  const { sessionId, transcript = [], user = null } = req.body || {};

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ message: 'sessionId is required' });
  }

  console.info('HubSpot handoff requested', {
    sessionId,
    userEmail: user?.email,
    messages: Array.isArray(transcript) ? transcript.length : 0,
    targetIntent: HANDOFF_INTENT,
  });

  return res.status(200).json({
    ok: true,
    provider: 'hubspot',
    openWidget: true,
  });
});

module.exports = router;
