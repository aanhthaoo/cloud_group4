/**
 * Bóc tách "số tiền", "nội dung chuyển khoản", "người thụ hưởng" và "thời gian
 * chuyển khoản" từ chuỗi text do Google Cloud Vision OCR trả về cho ảnh biên
 * lai chuyển khoản.
 */

// ---- Helpers -------------------------------------------------------------

function normalizeAmount(rawNumber) {
  if (!rawNumber) return null;
  const cleaned = rawNumber.replace(/[^\d.,]/g, '');
  const digitsOnly = cleaned.replace(/[.,]/g, '');
  if (!digitsOnly) return null;
  const value = parseInt(digitsOnly, 10);
  return Number.isNaN(value) ? null : value;
}

function cleanValue(value) {
  if (!value) return null;
  const trimmed = value
    .trim()
    .replace(/^[:：]+\s*/, '')
    .replace(/\s{2,}/g, ' ');
  return trimmed || null;
}

function getLines(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

/**
 * Loại bỏ dấu tiếng Việt để đối soát chính xác hơn (ví dụ: MẠNH -> MANH)
 */
function removeAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// ---- Amount ---------------------------------------------------------------

const AMOUNT_SUFFIX_PATTERN = /(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*(?:đ|d|vnd|vnđ)?\b/i;
const AMOUNT_PREFIX_PATTERN = /(?:vnd|vnđ)\s*[:\-]?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})/i;
const AMOUNT_WITH_CURRENCY_SUFFIX = /(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|d|vnd|vnđ)\b/gi;
const AMOUNT_WITH_CURRENCY_PREFIX = /(?:vnd|vnđ)\s*[:\-]?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})/gi;

const AMOUNT_KEYWORDS =
  /(số tiền|so tien|amount|tổng tiền|tong tien|thành tiền|thanh tien|paid|total)/i;

function extractAmount(text) {
  const lines = getLines(text);
  for (const line of lines) {
    if (AMOUNT_KEYWORDS.test(line)) {
      const prefixMatch = line.match(AMOUNT_PREFIX_PATTERN);
      if (prefixMatch) {
        const value = normalizeAmount(prefixMatch[1]);
        if (value) return value;
      }
      const suffixMatch = line.match(AMOUNT_SUFFIX_PATTERN);
      if (suffixMatch) {
        const value = normalizeAmount(suffixMatch[0]);
        if (value) return value;
      }
    }
  }
  const candidates = [];
  for (const m of text.matchAll(AMOUNT_WITH_CURRENCY_SUFFIX)) {
    const v = normalizeAmount(m[1]);
    if (v !== null) candidates.push(v);
  }
  for (const m of text.matchAll(AMOUNT_WITH_CURRENCY_PREFIX)) {
    const v = normalizeAmount(m[1]);
    if (v !== null) candidates.push(v);
  }
  if (candidates.length > 0) return Math.max(...candidates);
  return null;
}

// ---- Content / Message -----------------------------------------------------

const CONTENT_KEYWORDS =
  /(nội dung|noi dung|memo|content|message|diễn giải|dien giai|lời nhắn|loi nhan|tin nhắn|tin nhan)/i;

function extractContent(text) {
  const lines = getLines(text);
  for (let i = 0; i < lines.length; i++) {
    if (CONTENT_KEYWORDS.test(lines[i])) {
      const afterColon = lines[i].split(/[:：]/).slice(1).join(':').trim();
      if (afterColon) return cleanValue(afterColon);
      if (lines[i + 1]) return cleanValue(lines[i + 1]);
    }
  }
  return null;
}

// ---- Recipient (beneficiary) ----------------------------------------------

const RECIPIENT_KEYWORDS =
  /(người thụ hưởng|nguoi thu huong|tên người nhận|ten nguoi nhan|beneficiary name|người nhận|nguoi nhan|receiver name|recipient name|tên tài khoản|ten tai khoan)/i;
const RECIPIENT_HEADLINE_PATTERN = /^to\s+([A-ZÀ-ỸĐ][A-ZÀ-ỸĐ\s]{2,60})$/i;

function extractRecipient(text) {
  const lines = getLines(text);
  let recipient = null;
  for (let i = 0; i < lines.length; i++) {
    if (RECIPIENT_KEYWORDS.test(lines[i])) {
      const afterColon = lines[i].split(/[:：]/).slice(1).join(':').trim();
      if (afterColon) {
        recipient = cleanValue(afterColon);
        break;
      }
      if (lines[i + 1]) {
        recipient = cleanValue(lines[i + 1]);
        break;
      }
    }
  }
  if (!recipient) {
    for (const line of lines) {
      const match = line.match(RECIPIENT_HEADLINE_PATTERN);
      if (match) {
        recipient = cleanValue(match[1]);
        break;
      }
    }
  }

  // Luôn khử dấu để khớp yêu cầu DINH VAN MANH và tránh lỗi OCR đọc MẠNH
  return recipient ? removeAccents(recipient).toUpperCase() : null;
}

// ---- Transfer date/time -----------------------------------------------------

const DATE_KEYWORDS =
  /(transfer date|ngày giao dịch|ngay giao dich|thời gian giao dịch|thoi gian giao dich|ngày chuyển khoản|ngay chuyen khoan|transaction date|ngày tạo|ngay tao|thời gian|thoi gian|ngày|ngay)/i;

const DATE_REGEX = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
// TIME_REGEX linh hoạt hơn để bắt được các kiểu HH:mm:ss, HH:mm hoặc có AM/PM
const TIME_REGEX = /(\d{1,2}:\d{2}(?::\d{2})?(\s*(?:AM|PM|Sáng|Chiều))?)/i;

function extractTransferDate(text) {
  const lines = getLines(text);
  let detectedDate = null;
  let detectedTime = null;

  // 1. Tìm trong các dòng có từ khóa thời gian
  for (let i = 0; i < lines.length; i++) {
    if (DATE_KEYWORDS.test(lines[i])) {
      const dateMatch = lines[i].match(DATE_REGEX);
      if (dateMatch) detectedDate = dateMatch[1];

      const timeMatch = lines[i].match(TIME_REGEX);
      if (timeMatch) detectedTime = timeMatch[1];

      // Nếu không thấy giờ trên cùng dòng, quét lân cận mạnh mẽ hơn
      if (!detectedTime) {
        for (let j = -3; j <= 3; j++) {
          if (lines[i+j] && j !== 0) {
            const nearTimeMatch = lines[i+j].match(TIME_REGEX);
            if (nearTimeMatch) {
              detectedTime = nearTimeMatch[1];
              break;
            }
          }
        }
      }
      if (detectedDate && detectedTime) break;
    }
  }

  // 2. Fallback: Quét toàn văn
  if (!detectedDate || !detectedTime) {
    const fullText = text.replace(/\n/g, ' ');
    if (!detectedDate) {
      const dMatch = fullText.match(DATE_REGEX);
      if (dMatch) detectedDate = dMatch[1];
    }
    if (!detectedTime) {
      const tMatch = fullText.match(TIME_REGEX);
      if (tMatch) detectedTime = tMatch[1];
    }
  }

  if (detectedDate) {
    return detectedTime ? `${detectedDate} ${detectedTime}` : detectedDate;
  }
  return null;
}

// ---- Public API -------------------------------------------------------------

function parseReceiptText(rawText) {
  if (!rawText) return { detectedAmount: null, detectedContent: null, detectedRecipient: null, detectedTransferDate: null };

  return {
    detectedAmount: extractAmount(rawText),
    detectedContent: extractContent(rawText),
    detectedRecipient: extractRecipient(rawText),
    detectedTransferDate: extractTransferDate(rawText),
  };
}

module.exports = { parseReceiptText, removeAccents };
