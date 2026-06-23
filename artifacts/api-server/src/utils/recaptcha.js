/**
 * Xác thực token reCAPTCHA v2 (checkbox "Tôi không phải robot") với Google.
 * Bắt buộc phải verify ở BACKEND — verify ở frontend chỉ là UX, không có giá trị bảo mật
 * vì client luôn có thể giả mạo việc gọi API mà không cần qua checkbox.
 *
 * Cần biến môi trường RECAPTCHA_SECRET_KEY (lấy tại
 * https://www.google.com/recaptcha/admin -> chọn site -> Secret key).
 */
async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    throw new Error('Thiếu RECAPTCHA_SECRET_KEY trong biến môi trường (.env)');
  }

  if (!token) {
    return { success: false, reason: 'missing-token' };
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
  });

  const data = await response.json();

  return {
    success: !!data.success,
    reason: data.success ? null : (data['error-codes'] || []).join(', '),
  };
}

module.exports = { verifyRecaptcha };
