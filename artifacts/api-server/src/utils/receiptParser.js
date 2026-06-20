/**
 * Bóc tách "số tiền" và "nội dung chuyển khoản" từ chuỗi text do Google Cloud
 * Vision OCR trả về cho ảnh biên lai chuyển khoản (ngân hàng VN).
 *
 * Đây là parser theo HEURISTIC (dò theo từ khoá + regex số tiền kiểu VND),
 * không phải lúc nào cũng đúng 100% vì format biên lai khác nhau giữa các app
 * ngân hàng (MB Bank, Vietcombank, Momo, ZaloPay...). Nếu cần độ chính xác cao
 * hơn cho từng ngân hàng cụ thể, có thể viết thêm rule riêng theo logo/layout.
 */

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

// Số tiền kiểu VN: 135.000 / 135,000 / 1.350.000đ / 135000 VND
const AMOUNT_PATTERN = /(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*(?:đ|d|vnd|vnđ)?/i;
const AMOUNT_KEYWORDS = /(số tiền|so tien|amount|tổng tiền|tong tien|thành tiền|thanh tien)/i;
const CONTENT_KEYWORDS = /(nội dung|noi dung|memo|content|diễn giải|dien giai|lời nhắn|loi nhan)/i;

function extractAmount(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Ưu tiên dòng có từ khoá rõ ràng kiểu "Số tiền: ..."
  for (const line of lines) {
    if (AMOUNT_KEYWORDS.test(line)) {
      const match = line.match(AMOUNT_PATTERN);
      if (match) {
        const value = normalizeAmount(match[0]);
        if (value) return value;
      }
    }
  }

  // 2. Fallback: lấy số có đơn vị đ/VND lớn nhất xuất hiện trong toàn bộ text
  const candidates = [...text.matchAll(/(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|d|vnd|vnđ)/gi)]
    .map((m) => normalizeAmount(m[1]))
    .filter((v) => v !== null);

  if (candidates.length > 0) return Math.max(...candidates);

  return null;
}

function extractContent(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    if (CONTENT_KEYWORDS.test(lines[i])) {
      const afterColon = lines[i].split(/[:：]/).slice(1).join(':').trim();
      if (afterColon) return afterColon;
      // Nếu nhãn và nội dung nằm trên 2 dòng khác nhau
      if (lines[i + 1]) return lines[i + 1];
    }
  }

  return null;
}

function parseReceiptText(rawText) {
  if (!rawText) {
    return { detectedAmount: null, detectedContent: null };
  }

  return {
    detectedAmount: extractAmount(rawText),
    detectedContent: extractContent(rawText),
  };
}

module.exports = { parseReceiptText };
