const HUBSPOT_BASE_URL = 'https://api.hubapi.com';
const NOTE_TO_CONTACT_ASSOCIATION_TYPE_ID = 202;

function getHubSpotToken() {
  return process.env.HUBSPOT_PRIVATE_APP_TOKEN;
}

function requireHubSpotToken() {
  const token = getHubSpotToken();
  if (!token) {
    throw new Error('Missing HUBSPOT_PRIVATE_APP_TOKEN');
  }
  return token;
}

async function hubSpotRequest(path, options = {}) {
  const token = requireHubSpotToken();
  const response = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || response.statusText || 'HubSpot request failed';
    throw new Error(`HubSpot ${response.status}: ${message}`);
  }

  return data;
}

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return {};
  }

  if (parts.length === 1) {
    return { firstname: parts[0] };
  }

  return {
    firstname: parts.slice(0, -1).join(' '),
    lastname: parts.at(-1),
  };
}

async function findContactByEmail(email) {
  const result = await hubSpotRequest('/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            },
          ],
        },
      ],
      properties: ['email', 'firstname', 'lastname', 'phone'],
      limit: 1,
    }),
  });

  return result?.results?.[0] || null;
}

async function createContact(user) {
  const properties = {
    email: user.email,
    ...splitName(user.name || user.fullName),
  };

  if (user.phone || user.phoneNumber) {
    properties.phone = user.phone || user.phoneNumber;
  }

  return hubSpotRequest('/crm/v3/objects/contacts', {
    method: 'POST',
    body: JSON.stringify({ properties }),
  });
}

async function updateContact(contactId, user) {
  const properties = {
    ...splitName(user.name || user.fullName),
  };

  if (user.phone || user.phoneNumber) {
    properties.phone = user.phone || user.phoneNumber;
  }

  if (!Object.keys(properties).length) {
    return null;
  }

  return hubSpotRequest(`/crm/v3/objects/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

async function upsertContact(user) {
  if (!user?.email) {
    throw new Error('User email is required to save transcript to HubSpot');
  }

  const existingContact = await findContactByEmail(user.email);
  if (existingContact) {
    await updateContact(existingContact.id, user);
    return existingContact;
  }

  return createContact(user);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTranscript(transcript = []) {
  if (!Array.isArray(transcript) || !transcript.length) {
    return '<p><em>Không có transcript được gửi kèm.</em></p>';
  }

  return transcript
    .map((message, index) => {
      const sender = message?.from === 'user' ? 'Khách' : message?.from === 'bot' ? 'AI' : 'Hệ thống';
      return `<p><strong>${index + 1}. ${sender}:</strong> ${escapeHtml(message?.text)}</p>`;
    })
    .join('');
}

function getHandoffReasonLabel(reason) {
  const labels = {
    user_requested: 'Khách yêu cầu gặp nhân viên',
    fallback_limit: 'Bot không hiểu sau nhiều lần',
    low_confidence: 'Bot có độ tin cậy thấp',
  };

  return labels[reason] || reason || 'Không rõ';
}

function buildNoteBody({ sessionId, transcript, user, metadata }) {
  return [
    '<h3>LotusGlow AI Chat Handoff</h3>',
    `<p><strong>Session:</strong> ${escapeHtml(sessionId)}</p>`,
    `<p><strong>Khách:</strong> ${escapeHtml(user?.name || user?.fullName || 'Không rõ')}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(user?.email || 'Không có')}</p>`,
    `<p><strong>Số điện thoại:</strong> ${escapeHtml(user?.phone || user?.phoneNumber || 'Không có')}</p>`,
    `<p><strong>Lý do handoff:</strong> ${escapeHtml(getHandoffReasonLabel(metadata?.handoffReason))}</p>`,
    `<p><strong>Intent cuối:</strong> ${escapeHtml(metadata?.lastIntent || 'Không rõ')}</p>`,
    `<p><strong>Confidence cuối:</strong> ${escapeHtml(metadata?.lastConfidence ?? 'Không rõ')}</p>`,
    '<hr>',
    '<h4>Transcript</h4>',
    formatTranscript(transcript),
  ].join('');
}

async function createTranscriptNote({ contactId, sessionId, transcript, user, metadata }) {
  const timestamp = new Date().toISOString();
  return hubSpotRequest('/crm/v3/objects/notes', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        hs_timestamp: timestamp,
        hs_note_body: buildNoteBody({ sessionId, transcript, user, metadata }),
      },
      associations: [
        {
          to: { id: contactId },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: NOTE_TO_CONTACT_ASSOCIATION_TYPE_ID,
            },
          ],
        },
      ],
    }),
  });
}

async function saveTranscriptToHubSpot({ sessionId, transcript, user, metadata }) {
  const contact = await upsertContact(user);
  const note = await createTranscriptNote({
    contactId: contact.id,
    sessionId,
    transcript,
    user,
    metadata,
  });

  return {
    contactId: contact.id,
    noteId: note.id,
  };
}

module.exports = {
  saveTranscriptToHubSpot,
};
