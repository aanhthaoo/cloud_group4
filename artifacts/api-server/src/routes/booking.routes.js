const express = require('express');
const {
  getUnavailableSlots,
  createBookingWithCheck,
} = require('../controllers/booking.controller');

const router = express.Router();

/**
 * GET /api/bookings/unavailable-slots
 * Trả về danh sách các timeSlot đã bị đặt cho một ngày + nhân viên cụ thể.
 * Query params: date (VD: "2026-06-25"), resourceId (ID nhân viên)
 */
router.get('/unavailable-slots', getUnavailableSlots);

/**
 * POST /api/bookings/create
 * Tạo booking mới sau khi kiểm tra xem slot có còn trống không (tránh double-booking).
 * Body: { date, timeSlot, resourceId, customerData }
 */
router.post('/create', createBookingWithCheck);

module.exports = router;
