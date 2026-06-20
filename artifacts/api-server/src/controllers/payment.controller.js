const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../config/r2');
const { visionClient } = require('../config/vision');
const { verifyRecaptcha } = require('../utils/recaptcha');
const { parseReceiptText } = require('../utils/receiptParser');
const { db } = require('../config/firebase');
const Transaction = require('../models/transaction.model');

// Đọc toàn bộ nội dung file từ R2 (qua S3 SDK) thành 1 Buffer duy nhất,
// để truyền trực tiếp vào Vision API (không cần biên lai phải public).
async function downloadFromR2(fileName) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_RECEIPTS,
    Key: fileName,
  });

  const response = await s3Client.send(command);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * POST /api/payments/verify-receipt
 * Body: { fileName, recaptchaToken, bookingId?, userId?, amountPaid? }
 *
 * Luồng:
 *  1. Verify reCAPTCHA token với Google (chống bot spam upload biên lai giả).
 *  2. Tải file biên lai vừa được FE upload (qua presigned URL) từ Cloudflare R2.
 *  3. Gọi Google Cloud Vision (textDetection) để OCR ảnh -> text thô.
 *  4. Bóc tách "số tiền" + "nội dung chuyển khoản" từ text thô.
 *  5. Lưu lại 1 bản ghi Transaction (Firestore) để các phân hệ khác (Booking,
 *     đối soát thanh toán) tham chiếu, kèm trạng thái ocrStatus.
 *  6. Trả kết quả OCR về cho FE để người dùng xem & xác nhận trước khi chốt lịch.
 */
async function verifyReceipt(req, res) {
  const { fileName, recaptchaToken, bookingId, userId, amountPaid } = req.body;

  if (!fileName) {
    return res.status(400).json({ status: 'error', message: 'Thiếu fileName (tên file đã upload lên R2)' });
  }

  try {
    // 1. Verify reCAPTCHA
    const captcha = await verifyRecaptcha(recaptchaToken);
    if (!captcha.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Xác thực reCAPTCHA không hợp lệ. Vui lòng thử lại.',
        detail: captcha.reason,
      });
    }

    // 2. Lấy ảnh biên lai từ R2
    let imageBuffer;
    try {
      imageBuffer = await downloadFromR2(fileName);
    } catch (err) {
      console.error('Lỗi tải file từ R2:', err);
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy file biên lai trên R2. Hãy upload lại.',
      });
    }

    // 3. OCR bằng Cloud Vision
    let detectedText = '';
    let ocrStatus = 'processing';
    try {
      const [result] = await visionClient.textDetection({ image: { content: imageBuffer } });
      detectedText = result.fullTextAnnotation ? result.fullTextAnnotation.text : '';
      ocrStatus = detectedText ? 'verified' : 'failed';
    } catch (err) {
      console.error('Lỗi gọi Cloud Vision API:', err);
      ocrStatus = 'failed';
    }

    // 4. Bóc tách số tiền + nội dung
    const { detectedAmount, detectedContent } = parseReceiptText(detectedText);

    // 5. Lưu lại Transaction để đối soát
    const transaction = new Transaction({
      transactionId: `txn_${Date.now()}`,
      bookingId,
      userId,
      amountPaid,
      receiptImageUrl: fileName,
      ocrStatus,
      ocrData: { detectedAmount, detectedContent },
    });

    await db.collection('transactions').doc(transaction.transactionId).set(transaction.toFirestore());

    // 6. Trả kết quả cho FE để hiển thị + người dùng xác nhận
    res.status(200).json({
      status: 'success',
      message: 'Đã xử lý OCR biên lai',
      data: {
        transactionId: transaction.transactionId,
        ocrStatus,
        detectedAmount,
        detectedContent,
        rawText: detectedText,
        // Cờ tiện cho FE: số tiền OCR đọc được có khớp với số tiền cần thanh toán không
        amountMatches:
          typeof amountPaid === 'number' && detectedAmount !== null
            ? detectedAmount === amountPaid
            : null,
      },
    });
  } catch (error) {
    console.error('Lỗi xác thực biên lai:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi server khi xử lý biên lai', detail: error.message });
  }
}

module.exports = { verifyReceipt };
