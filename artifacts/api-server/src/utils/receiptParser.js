/**
 * Bóc tách "số tiền", "nội dung chuyển khoản", "người thụ hưởng" và "thời gian
 * chuyển khoản" từ chuỗi text do Google Cloud Vision OCR trả về cho ảnh biên
 * lai chuyển khoản (ngân hàng VN: Techcombank, Agribank, MB Bank, Vietcombank,
 * Momo, ZaloPay...).
 *
 * Đây là parser theo HEURISTIC (dò theo từ khoá + regex), không phải lúc nào
 * cũng đúng 100% vì format biên lai khác nhau giữa các app ngân hàng — một số
 * app dùng nhãn tiếng Anh (Techcombank: "Message", "To NAME", "VND 50,000"
 * với đơn vị tiền tệ đứng TRƯỚC số tiền), một số dùng nhãn tiếng Việt
 * (Agribank: "Tên người thụ hưởng", "4,500,000 VND" với đơn vị đứng SAU).
 * Parser dưới đây xử lý cả hai kiểu.
 */

// ---- Helpers -------------------------------------------------------------

function normalizeAmount(rawNumber) {
  if (!rawNumber) return null;
  // Bỏ mọi ký tự không phải số/dấu phân cách
  const cleaned = rawNumber.replace(/[^\d.,]/g, '');
  // Tiền VND không có phần thập phân -> bỏ hết dấu . và , (chúng chỉ là phân cách nghìn)
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

// ---- Amount ---------------------------------------------------------------

// Số tiền kiểu VN, đơn vị đứng SAU: 135.000 / 135,000 / 1.350.000đ / 135000 VND
const AMOUNT_SUFFIX_PATTERN = /(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*(?:đ|d|vnd|vnđ)?\b/i;
// Đơn vị đứng TRƯỚC số tiền (kiểu Techcombank): "VND 50,000"
const AMOUNT_PREFIX_PATTERN = /(?:vnd|vnđ)\s*[:\-]?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})/i;
// Chỉ chấp nhận làm "amount" khi có đơn vị tiền tệ đi kèm (suffix hoặc prefix),
// để không nhầm với số tài khoản / mã giao dịch (vốn không có ".", "," phân cách).
const AMOUNT_WITH_CURRENCY_SUFFIX = /(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|d|vnd|vnđ)\b/gi;
const AMOUNT_WITH_CURRENCY_PREFIX = /(?:vnd|vnđ)\s*[:\-]?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})/gi;

const AMOUNT_KEYWORDS =
  /(số tiền|so tien|amount|tổng tiền|tong tien|thành tiền|thanh tien|paid|total)/i;

function extractAmount(text) {
  const lines = getLines(text);

  // 1. Ưu tiên dòng có từ khoá rõ ràng kiểu "Số tiền: ..."
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

  // 2. Fallback: số có đơn vị tiền tệ đi kèm (trước hoặc sau), lấy số LỚN NHẤT
  //    xuất hiện (số tiền giao dịch thường lớn hơn các số khác như mã GD/STK).
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
      // Nếu nhãn và nội dung nằm trên 2 dòng khác nhau (vd Techcombank: dòng
      // "Message" rồi xuống dòng "DO PHAM HOANG ANH transfers")
      if (lines[i + 1]) return cleanValue(lines[i + 1]);
    }
  }

  return null;
}

// ---- Recipient (beneficiary) ----------------------------------------------

// Nhãn rõ ràng kiểu Việt: "Tên người thụ hưởng", "Người nhận"...
// (Cố tình KHÔNG match "beneficiary" trơ trọi vì "Beneficiary account" trên
// biên lai Techcombank là tên NGÂN HÀNG thụ hưởng, không phải tên người.)
const RECIPIENT_KEYWORDS =
  /(người thụ hưởng|nguoi thu huong|tên người nhận|ten nguoi nhan|beneficiary name|người nhận|nguoi nhan|receiver name|recipient name)/i;

// Kiểu headline Techcombank: "Successfully transferred / To PHAM MINH QUAN / VND 50,000"
// -> tên người nhận thường nằm trên 1 dòng riêng, viết HOA, ngay sau "To "
const RECIPIENT_HEADLINE_PATTERN = /^to\s+([A-ZÀ-ỸĐ][A-ZÀ-ỸĐ\s]{2,60})$/i;

function extractRecipient(text) {
  const lines = getLines(text);

  // 1. Nhãn rõ ràng "Tên người thụ hưởng: ..."
  for (let i = 0; i < lines.length; i++) {
    if (RECIPIENT_KEYWORDS.test(lines[i])) {
      const afterColon = lines[i].split(/[:：]/).slice(1).join(':').trim();
      if (afterColon) return cleanValue(afterColon);
      if (lines[i + 1]) return cleanValue(lines[i + 1]);
    }
  }

  // 2. Headline "To NAME" (Techcombank-style)
  for (const line of lines) {
    const match = line.match(RECIPIENT_HEADLINE_PATTERN);
    if (match) return cleanValue(match[1]);
  }

  return null;
}

// ---- Transfer date/time -----------------------------------------------------

const DATE_KEYWORDS =
  /(transfer date|ngày giao dịch|ngay giao dich|thời gian giao dịch|thoi gian giao dich|ngày chuyển khoản|ngay chuyen khoan|transaction date|ngày tạo|ngay tao|thời gian|thoi gian)/i;

// Bắt cả 2 kiểu: "13 Jun 2026 at 1:06 PM" và "13/06/2026 13:29:05"
const DATE_PATTERN =
  /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}(?:\s*(?:at|lúc)?\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}(?:[,\s]+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?/i;

function extractTransferDate(text) {
  const lines = getLines(text);

  // 1. Dòng có từ khoá ngày/giờ rõ ràng
  for (let i = 0; i < lines.length; i++) {
    if (DATE_KEYWORDS.test(lines[i])) {
      const sameLine = lines[i].match(DATE_PATTERN);
      if (sameLine) return cleanValue(sameLine[0]);
      if (lines[i + 1]) {
        const nextLine = lines[i + 1].match(DATE_PATTERN);
        if (nextLine) return cleanValue(nextLine[0]);
      }
    }
  }

  // 2. Fallback: lấy chuỗi ngày/giờ đầu tiên xuất hiện trong toàn bộ text
  const fallback = text.match(DATE_PATTERN);
  if (fallback) return cleanValue(fallback[0]);

  return null;
}

// ---- Public API -------------------------------------------------------------

function parseReceiptText(rawText) {
  if (!rawText) {
    return {
      detectedAmount: null,
      detectedContent: null,
      detectedRecipient: null,
      detectedTransferDate: null,
    };
  }

  return {
    detectedAmount: extractAmount(rawText),
    detectedContent: extractContent(rawText),
    detectedRecipient: extractRecipient(rawText),
    detectedTransferDate: extractTransferDate(rawText),
  };
}

module.exports = { parseReceiptText };
