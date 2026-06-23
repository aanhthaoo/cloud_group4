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
// Mở rộng danh sách từ khóa rác để lọc bỏ triệt để các dòng về phí
const CONTENT_SKIP_KEYWORDS = /(phí chuyển tiền|phi chuyen tien|phí giao dịch|phi giao dich|phí dịch vụ|phi dich vu|người chuyển trả|nguoi chuyen tra|mã giao dịch|ma giao dich|phi chuyen|loại phí|loai phi)/i;

function extractContent(text) {
  // 1. CHIẾN THUẬT ƯU TIÊN TUYỆT ĐỐI: Quét toàn văn tìm mã DH (tránh bị lệch dòng)
  // Tìm mã dạng DH95 hoặc DH 95 ở bất cứ đâu
  const dhMatch = text.match(/DH\s*(\d+)/i);
  if (dhMatch) {
    return `LOTUSGLOW DH${dhMatch[1]}`;
  }

  // 2. CHIẾN THUẬT DỰ PHÒNG: Tìm theo nhãn và lọc nhiễu
  const lines = getLines(text);
  for (let i = 0; i < lines.length; i++) {
    if (CONTENT_KEYWORDS.test(lines[i])) {
      let parts = lines[i].split(/[:：]/);
      let candidate = parts.length > 1 ? parts.slice(1).join(':').trim() : "";

      if (!candidate && lines[i + 1]) {
        candidate = lines[i + 1];
      }

      if (candidate) {
        const cleaned = cleanValue(candidate);
        if (cleaned) {
          const normalized = removeAccents(cleaned).toLowerCase();
          // Chỉ trả về nếu không phải là dòng về Phí
          if (!CONTENT_SKIP_KEYWORDS.test(normalized) && normalized.length >= 3) {
            return cleaned;
          }
        }
      }
    }
  }

  // 3. Fallback: Tìm từ khóa LotusGlow
  if (/LOTUS\s*GLOW/i.test(text)) return "LOTUSGLOW";

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
      if (detectedDate) break;
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
