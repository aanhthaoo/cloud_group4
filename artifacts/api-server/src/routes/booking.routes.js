const express = require('express');
const {
  getUnavailableSlots,
  createBookingWithCheck,
  createBooking,
  confirmPayment,
  getUserBookings,
  getUserLoyalty
} = require('../controllers/booking.controller');

const router = express.Router();

// --- CÁC ENDPOINT CHỐNG DOUBLE-BOOKING ---
router.get('/unavailable-slots', getUnavailableSlots);
router.post('/create', createBookingWithCheck);

// --- CÁC ENDPOINT ĐẶT LỊCH VÀ THANH TOÁN CŨ ---
router.post('/create-old', createBooking); // API cũ (nếu frontend còn gọi)
router.post('/confirm-payment', confirmPayment);

// --- CÁC ENDPOINT LẤY THÔNG TIN USER ---
router.get('/user/:uid', getUserBookings);
router.get('/loyalty/:uid', getUserLoyalty);

module.exports = router;
