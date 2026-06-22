const express = require('express');
const { sendMessageToDialogflow, HANDOFF_INTENT } = require('../services/dialogflow.service');
const { saveTranscriptToHubSpot } = require('../services/hubspot.service');

const router = express.Router();
const sessionStates = new Map();

const LOW_CONFIDENCE_THRESHOLD = Number(process.env.CHAT_LOW_CONFIDENCE_THRESHOLD || 0.35);
const FALLBACK_LIMIT = Number(process.env.CHAT_FALLBACK_LIMIT || 2);

function getSessionState(sessionId) {
  const current = sessionStates.get(sessionId) || { fallbackCount: 0 };
  sessionStates.set(sessionId, current);
  return current;
}

function autoHandoffReply(languageCode) {
  if (languageCode === 'en') {
    return 'I am not fully confident I can solve this request, so I will transfer you to a consultant.';
  }

  return 'Mình chưa xử lý chắc chắn yêu cầu này, nên mình sẽ chuyển bạn sang nhân viên tư vấn.';
}

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

    if (result.handoffRequired) {
      sessionStates.delete(sessionId);
      return res.status(200).json(result);
    }

    const state = getSessionState(sessionId);
    const lowConfidence = result.confidence > 0 && result.confidence < LOW_CONFIDENCE_THRESHOLD;

    if (result.isFallback || lowConfidence) {
      state.fallbackCount += 1;
    } else {
      state.fallbackCount = 0;
    }

    if (state.fallbackCount >= FALLBACK_LIMIT) {
      sessionStates.delete(sessionId);
      return res.status(200).json({
        ...result,
        reply: autoHandoffReply(result.languageCode),
        handoffRequired: true,
        handoffReason: result.isFallback ? 'fallback_limit' : 'low_confidence',
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Dialogflow chat error:', error);
    return res.status(500).json({
      message: 'Không thể kết nối Dialogflow lúc này.',
      detail: error.message,
    });
  }
});

router.post('/chat/handoff', async (req, res) => {
  const { sessionId, transcript = [], user = null, metadata = {} } = req.body || {};

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ message: 'sessionId is required' });
  }

  console.info('HubSpot handoff requested', {
    sessionId,
    userEmail: user?.email,
    messages: Array.isArray(transcript) ? transcript.length : 0,
    targetIntent: HANDOFF_INTENT,
    reason: metadata?.handoffReason,
  });

  let hubspotResult = null;
  let hubspotError = null;

  try {
    hubspotResult = await saveTranscriptToHubSpot({
      sessionId,
      transcript,
      user,
      metadata,
    });
  } catch (error) {
    hubspotError = error.message;
    console.warn('HubSpot transcript save skipped/failed:', error.message);
  }

  return res.status(200).json({
    ok: true,
    provider: 'hubspot',
    openWidget: true,
    hubspotSaved: Boolean(hubspotResult),
    contactId: hubspotResult?.contactId,
    noteId: hubspotResult?.noteId,
    hubspotError,
  });
});

module.exports = router;
