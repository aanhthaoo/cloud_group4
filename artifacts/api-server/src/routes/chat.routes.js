const express = require('express');
const { sendMessageToDialogflow, HANDOFF_INTENT } = require('../services/dialogflow.service');
const { saveTranscriptToHubSpot } = require('../services/hubspot.service');

const router = express.Router();
const sessionStates = new Map();

const LOW_CONFIDENCE_THRESHOLD = Number(process.env.CHAT_LOW_CONFIDENCE_THRESHOLD || 0.35);
const FALLBACK_LIMIT = Number(process.env.CHAT_FALLBACK_LIMIT || 2);
const BOOKING_AVAILABILITY_INTENT = 'DatLich - KiemTraLichTrong';

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

function normalizeServiceType(value, message = '') {
  const raw = String(value || '').trim().toLowerCase();
  const normalizedMessage = String(message || '').toLowerCase();

  if (raw) {
    return raw;
  }

  if (/chăm sóc da|cham soc da|da mặt|da mat|facial|mụn|mun|da khô|da kho|xỉn màu|xin mau/.test(normalizedMessage)) {
    return 'facial';
  }

  if (/massage|body|vai|lưng|lung|thư giãn|thu gian/.test(normalizedMessage)) {
    return 'massage';
  }

  if (/nail|móng|mong|pedicure|manicure/.test(normalizedMessage)) {
    return 'nails';
  }

  if (/wax|tẩy lông|tay long|triệt lông|triet long/.test(normalizedMessage)) {
    return 'waxing';
  }

  if (/cô dâu|co dau|gói cưới|goi cuoi|gói cô dâu|goi co dau|bridal|wedding|sự kiện đặc biệt|su kien dac biet/.test(normalizedMessage)) {
    return 'bridal';
  }

  return '';
}

function serviceLabel(serviceType, languageCode) {
  const viLabels = {
    facial: 'chăm sóc da mặt',
    massage: 'massage',
    nails: 'nails/pedicure',
    waxing: 'waxing',
    bridal: 'gói cô dâu',
  };

  const enLabels = {
    facial: 'facial care',
    massage: 'massage',
    nails: 'nails/pedicure',
    waxing: 'waxing',
    bridal: 'bridal package',
  };

  const labels = languageCode === 'en' ? enLabels : viLabels;
  return labels[serviceType] || serviceType || (languageCode === 'en' ? 'the selected service' : 'dịch vụ bạn chọn');
}

function parseDateFromMessage(message) {
  const text = String(message || '').toLowerCase();
  const dateMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);

  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    const currentYear = new Date().getFullYear();
    const year = dateMatch[3]
      ? dateMatch[3].length === 2
        ? `20${dateMatch[3]}`
        : dateMatch[3]
      : String(currentYear);

    return `${year}-${month}-${day}`;
  }

  if (/\bhôm nay\b|\btoday\b/.test(text)) {
    return new Date().toISOString().slice(0, 10);
  }

  if (/\bngày mai\b|\btomorrow\b/.test(text)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }

  return '';
}

function normalizeDate(value, message = '') {
  const raw = String(value || '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  return parseDateFromMessage(message);
}

function hasBookingDetails(message, parameters = {}) {
  return Boolean(normalizeServiceType(parameters.service_type, message) && normalizeDate(parameters.date, message));
}

function bookingReply({ serviceType, date, languageCode }) {
  if (languageCode === 'en') {
    return `I received your request for ${serviceLabel(serviceType, languageCode)} on ${date}. I will check available slots through the booking availability API.`;
  }

  return `Mình đã nhận yêu cầu kiểm tra lịch trống cho dịch vụ ${serviceLabel(serviceType, languageCode)} vào ngày ${date}. Mình sẽ kiểm tra qua API lịch trống và báo lại slot phù hợp cho bạn.`;
}

function bookingMissingInfoReply(languageCode) {
  if (languageCode === 'en') {
    return 'Sure. Please tell me both the service and preferred date so I can check available slots.';
  }

  return 'Được rồi. Bạn vui lòng cho mình biết cả dịch vụ và ngày mong muốn, mình sẽ kiểm tra lịch trống cho bạn.';
}

function applyBookingFlow(result, message) {
  const shouldHandleBooking = result.intent === BOOKING_AVAILABILITY_INTENT || hasBookingDetails(message, result.parameters);

  if (!shouldHandleBooking) {
    return result;
  }

  const serviceType = normalizeServiceType(result.parameters?.service_type, message);
  const date = normalizeDate(result.parameters?.date, message);

  return {
    ...result,
    intent: BOOKING_AVAILABILITY_INTENT,
    handoffRequired: false,
    isFallback: false,
    reply: serviceType && date
      ? bookingReply({ serviceType, date, languageCode: result.languageCode })
      : bookingMissingInfoReply(result.languageCode),
    parameters: {
      ...result.parameters,
      service_type: serviceType,
      date,
    },
  };
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

    const dialogflowResult = await sendMessageToDialogflow({
      sessionId,
      message: message.trim(),
      user,
    });
    const result = applyBookingFlow(dialogflowResult, message.trim());

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
