const BITRIX_WEBHOOK_URL = (
  process.env.BITRIX_WEBHOOK_URL ||
  "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/"
).replace(/\/$/, "");

async function bitrixCall(method, payload = {}) {
  if (!BITRIX_WEBHOOK_URL) {
    console.log(`[MOCK BITRIX] Bỏ qua gọi API: ${method}`);
    return null;
  }

  const url = `${BITRIX_WEBHOOK_URL}/${method}.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error) {
    throw new Error(
      data.error_description ||
        data.error ||
        `Bitrix API error: ${method}`
    );
  }

  return data.result;
}

async function findContactByEmail(email) {
  if (!email) return null;

  const result = await bitrixCall("crm.contact.list", {
    filter: {
      EMAIL: email,
    },
    select: [
      "ID",
      "NAME",
      "LAST_NAME",
      "EMAIL",
      process.env.BITRIX_FIELD_POINTS || "UF_CRM_LOYALTY_POINTS",
      process.env.BITRIX_FIELD_TIER || "UF_CRM_LOYALTY_TIER",
      process.env.BITRIX_FIELD_TOTAL_SPENT || "UF_CRM_TOTAL_SPENT",
    ],
  });

  if (!Array.isArray(result) || result.length === 0) return null;

  return result[0];
}

async function createContactForUser(user) {
  const fields = {
    NAME: user.fullName || user.name || user.email || "Khách hàng",
    EMAIL: user.email
      ? [
          {
            VALUE: user.email,
            VALUE_TYPE: "WORK",
          },
        ]
      : [],
    PHONE: user.phoneNumber || user.phone
      ? [
          {
            VALUE: user.phoneNumber || user.phone,
            VALUE_TYPE: "WORK",
          },
        ]
      : [],
  };

  const newContactId = await bitrixCall("crm.contact.add", {
    fields,
  });

  return newContactId;
}

async function updateContactLoyalty(contactId, loyalty) {
  if (!contactId) return null;

  const pointsField = process.env.BITRIX_FIELD_POINTS || "UF_CRM_LOYALTY_POINTS";
  const tierField = process.env.BITRIX_FIELD_TIER || "UF_CRM_LOYALTY_TIER";
  const totalSpentField =
    process.env.BITRIX_FIELD_TOTAL_SPENT || "UF_CRM_TOTAL_SPENT";

  const fields = {
    [pointsField]: loyalty.points,
    [tierField]: loyalty.tier,
    [totalSpentField]: loyalty.totalSpent,
  };

  return bitrixCall("crm.contact.update", {
    id: Number(contactId),
    fields,
  });
}

module.exports = {
  bitrixCall,
  findContactByEmail,
  createContactForUser,
  updateContactLoyalty,
};
