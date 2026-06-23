const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');

// POST /api/bookings/create
// Nhận payload từ frontend BookingStep1: { date, timeSlot, resourceId, customerData }
// Map sang format mà createBooking controller mong đợi
router.post('/create', async (req, res) => {
  const { date, timeSlot, resourceId, customerData } = req.body;

  if (!date || !timeSlot || !resourceId || !customerData) {
    return res.status(400).json({
      status: 'error',
      message: 'Thiếu thông tin: date, timeSlot, resourceId, customerData là bắt buộc',
    });
  }

  // Kiểm tra conflict: slot đã bị giữ trong Firestore chưa?
  const { db } = require('../config/firebase');
  try {
    const existing = await db
      .collection('bookings')
      .where('bookingDate', '==', date)
      .where('timeSlot', '==', timeSlot)
      .where('technicianId', '==', String(resourceId))
      .where('status', 'in', ['soft-hold', 'pending_payment', 'confirmed'])
      .get();

    if (!existing.empty) {
      // Kiểm tra xem soft-hold có còn hiệu lực không
      const now = new Date();
      const activeConflict = existing.docs.some(doc => {
        const data = doc.data();
        if (data.status === 'soft-hold') {
          const expires = data.softHoldExpiresAt
            ? new Date(data.softHoldExpiresAt)
            : null;
          return expires && expires > now;
        }
        return true; // confirmed / pending_payment luôn conflict
      });

      if (activeConflict) {
        return res.status(409).json({
          status: 'conflict',
          message: 'Khung giờ này đã có người đặt. Vui lòng chọn giờ khác.',
        });
      }
    }

    // Tạo soft-hold 15 phút
    const softHoldExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const bookingId = `SPA-${Date.now()}`;

    const booking = {
      bookingId,
      uid: customerData.uid || null,
      customerName: customerData.customerName || '',
      customerEmail: customerData.customerEmail || '',
      customerPhone: customerData.customerPhone || '',
      serviceName: customerData.ten_dich_vu || '',
      technicianName: customerData.ten_ktv || '',
      technicianId: String(resourceId),
      appointmentDate: date,
      bookingDate: date,
      timeSlot,
      totalAmount: Number(customerData.gia_tien) || 0,
      depositAmount: Math.round(Number(customerData.gia_tien) * 0.3) || 0,
      status: 'soft-hold',
      softHoldExpiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('bookings').doc(bookingId).set(booking);

    return res.status(201).json({
      status: 'success',
      message: 'Đã giữ chỗ tạm thời 15 phút',
      data: {
        bookingId,
        softHoldExpiresAt,
      },
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /api/bookings/unavailable-slots?date=YYYY-MM-DD&resourceId=xxx
router.get('/unavailable-slots', async (req, res) => {
  const { date, resourceId } = req.query;

  if (!date || !resourceId) {
    return res.status(400).json({
      status: 'error',
      message: 'Thiếu tham số: date và resourceId là bắt buộc',
    });
  }

  const { db } = require('../config/firebase');
  try {
    const now = new Date();

    const snapshot = await db
      .collection('bookings')
      .where('bookingDate', '==', date)
      .where('technicianId', '==', String(resourceId))
      .where('status', 'in', ['soft-hold', 'pending_payment', 'confirmed'])
      .get();

    const unavailableSlots = snapshot.docs
      .filter(doc => {
        const data = doc.data();
        // Loại bỏ soft-hold đã hết hạn
        if (data.status === 'soft-hold') {
          const expires = data.softHoldExpiresAt
            ? new Date(data.softHoldExpiresAt)
            : null;
          return expires && expires > now;
        }
        return true;
      })
      .map(doc => doc.data().timeSlot);

    return res.status(200).json({
      status: 'success',
      data: unavailableSlots,
    });
  } catch (error) {
    console.error('Get unavailable slots error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /api/bookings/:bookingId/confirm-payment
router.post('/:bookingId/confirm-payment', bookingController.confirmPayment);

// GET /api/bookings/user/:uid
router.get('/user/:uid', bookingController.getUserBookings);

// GET /api/bookings/loyalty/:uid
router.get('/loyalty/:uid', bookingController.getUserLoyalty);

module.exports = router;
