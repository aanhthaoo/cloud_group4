const { db } = require("../config/firebase");
const { applyLoyaltyAfterPayment } = require("../services/loyalty.service");
const {
  sendAppointmentConfirmation,
  sendPaymentInvoice,
  sendTierUpgradeEmail,
} = require("../services/hubspotEmail.service");

function normalizeMoney(value) {
  if (typeof value === "number") return value;

  return Number(
    String(value || "0")
      .replace(/[^\d]/g, "")
  );
}

async function createBooking(req, res) {
  try {
    const {
      uid,
      customerName,
      customerEmail,
      customerPhone,
      serviceName,
      technicianName,
      appointmentDate,
      appointmentTime,
      totalAmount,
    } = req.body;

    if (!uid || !customerEmail || !serviceName || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        status: "error",
        message: "Thiếu thông tin đặt lịch",
      });
    }

    const amount = normalizeMoney(totalAmount);
    const depositAmount = Math.round(amount * 0.3);
    const bookingId = `SPA-${Date.now()}`;

    const booking = {
      bookingId,
      uid,
      customerName,
      customerEmail,
      customerPhone: customerPhone || "",
      serviceName,
      technicianName: technicianName || "Chưa chọn",
      appointmentDate,
      appointmentTime,
      totalAmount: amount,
      depositAmount,
      status: "pending_payment",
      paymentStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("bookings").doc(bookingId).set(booking);

    return res.status(201).json({
      status: "success",
      message: "Đã tạo lịch hẹn tạm thời",
      data: booking,
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

async function confirmPayment(req, res) {
  try {
    const { bookingId } = req.params;
    const { receiptFileName } = req.body;

    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy lịch hẹn",
      });
    }

    const booking = bookingDoc.data();

    if (booking.status === "confirmed") {
      return res.status(200).json({
        status: "success",
        message: "Lịch hẹn đã được xác nhận trước đó",
        data: booking,
      });
    }

    const userRef = db.collection("users").doc(booking.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("Không tìm thấy thông tin khách hàng");
    }

    const user = {
      uid: booking.uid,
      ...userDoc.data(),
    };

    await bookingRef.update({
      status: "confirmed",
      paymentStatus: "deposit_paid",
      receiptFileName: receiptFileName || null,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    });

    const confirmedBooking = {
      ...booking,
      status: "confirmed",
      paymentStatus: "deposit_paid",
      receiptFileName: receiptFileName || null,
    };

    const loyaltyResult = await applyLoyaltyAfterPayment(
      booking.uid,
      booking.depositAmount
    );

    await sendAppointmentConfirmation(user, confirmedBooking);
    await sendPaymentInvoice(user, confirmedBooking);

    if (loyaltyResult.isTierUpgraded) {
      await sendTierUpgradeEmail(
        user,
        loyaltyResult.oldTier,
        loyaltyResult.newTier,
        loyaltyResult.loyalty
      );
    }

    // ------------------------------------------------------------------
    // Sau khi xác nhận thanh toán thành công → mới push Deal lên Bitrix24.
    // Đây là thời điểm đúng: khách đã cọn thực sự, không phải lúc soft-hold.
    // ------------------------------------------------------------------
    createBitrixDeal({
      bookingId,
      ...confirmedBooking,
      loyaltyTier: loyaltyResult.newTier,
    }).catch((err) =>
      console.error('[confirmPayment → Bitrix] Lỗi gọi Bitrix placeholder:', err)
    );

    return res.status(200).json({
      status: "success",
      message: "Xác nhận thanh toán, cộng điểm và gửi email thành công",
      data: {
        booking: confirmedBooking,
        loyalty: loyaltyResult.loyalty,
        pointsAdded: loyaltyResult.pointsAdded,
        oldTier: loyaltyResult.oldTier,
        newTier: loyaltyResult.newTier,
        isTierUpgraded: loyaltyResult.isTierUpgraded,
      },
    });
  } catch (error) {
    console.error("Confirm payment error:", error);

    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

async function getUserBookings(req, res) {
  try {
    const { uid } = req.params;

    const snapshot = await db
      .collection("bookings")
      .where("uid", "==", uid)
      .get();

    const bookings = snapshot.docs.map((doc) => doc.data());

    return res.status(200).json({
      status: "success",
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

async function getUserLoyalty(req, res) {
  try {
    const { uid } = req.params;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy người dùng",
      });
    }

    const user = userDoc.data();

    return res.status(200).json({
      status: "success",
      data: {
        uid,
        loyalty: user.loyalty || {
          tier: "Member",
          points: 0,
          totalSpent: 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

// ---------------------------------------------------------------------------
// Placeholder: Giả lập gọi CRM Bitrix24 sau khi tạo booking thành công.
// Sau này có thể replace bằng lời gọi Bitrix24 REST API thực tế.
// ---------------------------------------------------------------------------
async function createBitrixDeal(data) {
  console.log('[Bitrix24 Placeholder] Sẽ tạo Deal với dữ liệu:', JSON.stringify(data, null, 2));
  // TODO: Tích hợp Bitrix24 REST API tại đây
}

// ---------------------------------------------------------------------------
// GET /api/bookings/unavailable-slots
// Trả về mảng các timeSlot thực sự bị chiếm (loại bỏ soft-hold đã hết hạn).
// Logic: 'confirmed' → luôn bị chiếm | 'soft-hold' → chỉ bị chiếm nếu chưa hết 15 phút.
// ---------------------------------------------------------------------------
async function getUnavailableSlots(req, res) {
  try {
    const { date, resourceId } = req.query;

    if (!date || !resourceId) {
      return res.status(400).json({
        status: 'error',
        message: 'Thiếu tham số bắt buộc: date và resourceId',
      });
    }

    const now = new Date();

    // Không dùng .select() để lấy đủ cả status và softHoldExpiresAt để lọc
    const snapshot = await db
      .collection('bookings')
      .where('appointmentDate', '==', date)
      .where('resourceId', '==', resourceId)
      .get();

    const unavailableSlots = snapshot.docs
      .filter((doc) => {
        const data = doc.data();
        // Booking đã xác nhận thanh toán → luôn khóa slot
        if (data.status === 'confirmed') return true;
        // Soft-hold: chỉ khóa nếu thời gian giữ chỗ chưa hết
        if (data.status === 'soft-hold' && data.softHoldExpiresAt) {
          const expiresAt = data.softHoldExpiresAt.toDate
            ? data.softHoldExpiresAt.toDate()   // Firestore Timestamp
            : new Date(data.softHoldExpiresAt);  // ISO string fallback
          return expiresAt > now;
        }
        return false;
      })
      .map((doc) => doc.data().timeSlot);

    return res.status(200).json({
      status: 'success',
      data: unavailableSlots,
    });
  } catch (error) {
    console.error('[getUnavailableSlots] Lỗi:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi máy chủ khi kiểm tra lịch trống',
      detail: error.message,
    });
  }
}

// ---------------------------------------------------------------------------
// POST /api/bookings/create
// Tạo soft-hold (giữ chỗ tạm) trong 15 phút, sau đó tự động giải phóng.
// Bitrix24 KHÔNG được gọi ở đây — chỉ gọi sau khi thanh toán xác nhận.
// ---------------------------------------------------------------------------
async function createBookingWithCheck(req, res) {
  try {
    const { date, timeSlot, resourceId, customerData } = req.body;

    if (!date || !timeSlot || !resourceId || !customerData) {
      return res.status(400).json({
        status: 'error',
        message: 'Thiếu thông tin bắt buộc: date, timeSlot, resourceId, customerData',
      });
    }

    const now = new Date();

    // ------------------------------------------------------------------
    // BƯỚC 1: Kiểm tra xung đột — có booking hợp lệ nào chiếm slot này không?
    // Hợp lệ = 'confirmed' hoặc 'soft-hold' chưa hết hạn
    // ------------------------------------------------------------------
    const existingSnapshot = await db
      .collection('bookings')
      .where('appointmentDate', '==', date)
      .where('timeSlot', '==', timeSlot)
      .where('resourceId', '==', resourceId)
      .get();

    // Lọc thủ công: loại bỏ soft-hold đã hết hạn trước khi judge conflict
    const validConflict = existingSnapshot.docs.find((doc) => {
      const data = doc.data();
      if (data.status === 'confirmed') return true;
      if (data.status === 'soft-hold' && data.softHoldExpiresAt) {
        const expiresAt = data.softHoldExpiresAt.toDate
          ? data.softHoldExpiresAt.toDate()
          : new Date(data.softHoldExpiresAt);
        return expiresAt > now;
      }
      return false;
    });

    if (validConflict) {
      return res.status(409).json({
        status: 'conflict',
        message: 'Khung giờ này vừa có người đặt, vui lòng chọn giờ khác',
      });
    }

    // ------------------------------------------------------------------
    // BƯỚC 2: Ghi soft-hold — giữ chỗ tạm 15 phút
    // Status sẽ được nâng lên 'confirmed' sau khi thanh toán thành công.
    // ------------------------------------------------------------------
    const SOFT_HOLD_MINUTES = 15;
    const softHoldExpiresAt = new Date(now.getTime() + SOFT_HOLD_MINUTES * 60 * 1000);

    const bookingId = `SPA-${Date.now()}`;
    const newBooking = {
      bookingId,
      appointmentDate: date,
      timeSlot,
      resourceId,
      ...customerData,
      status: 'soft-hold',                  // Giữ chỗ tạm, chưa xác nhận
      softHoldExpiresAt,                      // Hết hạn sau 15 phút
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('bookings').doc(bookingId).set(newBooking);
    console.log(`[createBookingWithCheck] Soft-hold tạo thành công: ${bookingId}, hết hạn lúc ${softHoldExpiresAt.toISOString()}`);

    // Trả về bookingId để Frontend gắn vào luồng thanh toán tiếp theo
    return res.status(200).json({
      status: 'success',
      message: 'Giữ chỗ thành công! Vui lòng hoàn tất thanh toán trong 15 phút.',
      data: {
        bookingId,
        softHoldExpiresAt: softHoldExpiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[createBookingWithCheck] Lỗi:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi máy chủ khi tạo lịch hẹn',
      detail: error.message,
    });
  }
}

module.exports = {
  createBooking,
  confirmPayment,
  getUserBookings,
  getUserLoyalty,
  // Hai endpoint mới chống double-booking
  getUnavailableSlots,
  createBookingWithCheck,
};