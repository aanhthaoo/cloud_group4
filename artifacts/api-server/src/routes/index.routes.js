const express = require('express');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client } = require('../config/r2');

const router = express.Router();

router.get('/api/availability', (req, res) => {
  res.status(200).json({
    message: 'Availability data',
    data: [
      { date: '2023-12-01', timeSlots: ['09:00', '10:00', '14:00'] },
      { date: '2023-12-02', timeSlots: ['11:00', '15:00'] }
    ]
  });
});

router.post('/api/bookings', (req, res) => {
  res.status(200).json({
    message: 'Booking created successfully (mock)',
    bookingId: 'mock-booking-123'
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
