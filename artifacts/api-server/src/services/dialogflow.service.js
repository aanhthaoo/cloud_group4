const path = require('path');
const fs = require('fs');
const dialogflow = require('@google-cloud/dialogflow');

const DEFAULT_PROJECT_ID = 'salon-499416';
const DEFAULT_LANGUAGE = 'vi';
const HANDOFF_INTENT = 'YeuCau - GapNhanVien';
const FALLBACK_INTENT = 'Default Fallback Intent';

let sessionsClient;

function resolveCredentialPath() {
  const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_CREDENTIALS_PATH;
  const candidates = [];

  if (configuredPath) {
    candidates.push(path.isAbsolute(configuredPath) ? configuredPath : path.resolve(process.cwd(), configuredPath));
    candidates.push(path.resolve(__dirname, '../../', configuredPath));
    candidates.push(path.resolve(__dirname, '../../../../', configuredPath));
  }

  candidates.push(path.resolve(process.cwd(), 'service-account.json'));
  candidates.push(path.resolve(__dirname, '../../service-account.json'));
  candidates.push(path.resolve(__dirname, '../../../../service-account.json'));

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function getProjectId() {
  if (process.env.DIALOGFLOW_PROJECT_ID) {
    return process.env.DIALOGFLOW_PROJECT_ID;
  }

  const credentialPath = resolveCredentialPath();
  if (credentialPath) {
    try {
      const credential = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
      return credential.project_id || DEFAULT_PROJECT_ID;
    } catch (error) {
      console.warn('Could not read Dialogflow project id from service account:', error.message);
    }
  }

  return DEFAULT_PROJECT_ID;
}

function getSessionsClient() {
  if (sessionsClient) {
    return sessionsClient;
  }

  const credentialPath = resolveCredentialPath();
  const options = credentialPath ? { keyFilename: credentialPath } : {};
  sessionsClient = new dialogflow.SessionsClient(options);
  return sessionsClient;
}

function detectLanguage(text) {
  const normalized = String(text || '').trim();

  if (/[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(normalized)) {
    return 'vi';
  }

  if (/\b(hello|hi|what|when|where|how|can|could|please|price|open|close|book|booking|appointment|available|slot|staff|human|service|massage|facial|skin|nail|waxing)\b/i.test(normalized)) {
    return 'en';
  }

  return process.env.DIALOGFLOW_AGENT_LANGUAGE_DEFAULT || DEFAULT_LANGUAGE;
}

function fallbackReply(languageCode) {
  if (languageCode === 'en') {
    return 'I am sorry, I could not understand that yet. Would you like to talk to a consultant?';
  }

  return 'Mình xin lỗi, hiện tại mình chưa hiểu rõ yêu cầu này. Bạn có muốn gặp nhân viên tư vấn không?';
}

async function sendMessageToDialogflow({ sessionId, message, user }) {
  const projectId = getProjectId();
  const languageCode = detectLanguage(message);
  const client = getSessionsClient();
  const sessionPath = client.projectAgentSessionPath(projectId, sessionId);

  const [response] = await client.detectIntent({
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
        languageCode,
      },
    },
    queryParams: {
      payload: {
        fields: {
          userName: { stringValue: user?.name || '' },
          userEmail: { stringValue: user?.email || '' },
          userPhone: { stringValue: user?.phone || '' },
        },
      },
    },
  });

  const queryResult = response.queryResult || {};
  const intent = queryResult.intent?.displayName || FALLBACK_INTENT;
  const reply = queryResult.fulfillmentText || fallbackReply(languageCode);
  const confidence = queryResult.intentDetectionConfidence || 0;
  const isFallback = intent === FALLBACK_INTENT;
  const handoffRequired = intent === HANDOFF_INTENT;

  return {
    reply,
    intent,
    languageCode,
    handoffRequired,
    handoffReason: handoffRequired ? 'user_requested' : undefined,
    confidence,
    isFallback,
  };
}

module.exports = {
  FALLBACK_INTENT,
  HANDOFF_INTENT,
  detectLanguage,
  sendMessageToDialogflow,
};
