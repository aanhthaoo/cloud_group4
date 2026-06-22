const express = require('express');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client } = require('../config/r2');
const authRoutes = require('./auth.routes');
const giaoDichRoutes = require('./giaoDich.route');

const router = express.Router();

router.use('/api/auth', authRoutes);

// Tích hợp phân hệ Giao dịch Lõi (Giữ chỗ & VietQR)
router.use('/api', giaoDichRoutes);

router.get('/api/availability', (req, res) => {
  // TODO: Tích hợp logic lấy dữ liệu availability thực tế
  res.status(200).json({
    message: 'Availability data',
    data: []
  });
});

router.post('/api/bookings', (req, res) => {
  // TODO: Tích hợp logic tạo booking thực tế
  res.status(501).json({
    message: 'Chức năng tạo booking chưa được implement'
  });
});

// Route lấy Presigned URL để upload file lên R2
router.get('/api/upload-url/receipt', async (req, res) => {
  try {
    // Tạo một tên file ngẫu nhiên để không bị trùng
    const fileName = `receipt_${Date.now()}.jpg`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_RECEIPTS,
      Key: fileName,
      ContentType: 'image/jpeg',
    });

    // Tạo link URL có thời hạn 5 phút (300 giây)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    res.status(200).json({
      status: 'success',
      uploadUrl: presignedUrl,
      fileName: fileName,
      message: 'Hãy dùng uploadUrl để PUT file trực tiếp bằng Frontend'
    });
  } catch (error) {
    console.error("Lỗi tạo Presigned URL:", error);
    res.status(500).json({ status: 'error', message: 'Không thể kết nối R2', detail: error.message });
  }
});

module.exports = router;
