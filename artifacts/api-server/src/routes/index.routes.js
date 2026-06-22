const express = require("express");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { s3Client } = require("../config/r2");
const authRoutes = require("./auth.routes");

const {
  createBooking,
  confirmPayment,
  getUserBookings,
  getUserLoyalty,
} = require("../controllers/booking.controller");

const router = express.Router();

router.use("/api/auth", authRoutes);

router.get("/api/availability", (req, res) => {
  res.status(200).json({
    message: "Availability data",
    data: [],
  });
});

router.post("/api/bookings", createBooking);
router.post("/api/bookings/:bookingId/confirm-payment", confirmPayment);
router.get("/api/users/:uid/bookings", getUserBookings);
router.get("/api/users/:uid/loyalty", getUserLoyalty);

router.get("/api/upload-url/receipt", async (req, res) => {
  try {
    const fileName = `receipt_${Date.now()}.jpg`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_RECEIPTS,
      Key: fileName,
      ContentType: "image/jpeg",
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    res.status(200).json({
      status: "success",
      uploadUrl: presignedUrl,
      fileName,
      message: "Hãy dùng uploadUrl để PUT file trực tiếp bằng Frontend",
    });
  } catch (error) {
    console.error("Lỗi tạo Presigned URL:", error);

    res.status(500).json({
      status: "error",
      message: "Không thể kết nối R2",
      detail: error.message,
    });
  }
});

module.exports = router;