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

    console.log(`\n========== [CONFIRM PAYMENT] START ==========`);
    console.log(`[1] bookingId: ${bookingId}, receiptFileName: ${receiptFileName}`);

    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      console.log(`[1] FAIL: Không tìm thấy booking ${bookingId}`);
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy lịch hẹn",
      });
    }

    const booking = bookingDoc.data();
    console.log(`[2] Booking found: uid=${booking.uid}, status=${booking.status}, depositAmount=${booking.depositAmount}`);

    if (booking.status === "confirmed") {
      console.log(`[2] Booking đã confirmed trước đó, bỏ qua.`);
      return res.status(200).json({
        status: "success",
        message: "Lịch hẹn đã được xác nhận trước đó",
        data: booking,
      });
    }

    const userRef = db.collection("users").doc(booking.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`[3] FAIL: Không tìm thấy user với uid=${booking.uid}`);
      throw new Error("Không tìm thấy thông tin khách hàng");
    }

    const user = {
      uid: booking.uid,
      ...userDoc.data(),
    };
    console.log(`[3] User found: email=${user.email}, fullName=${user.fullName}`);

    await bookingRef.update({
      status: "confirmed",
      paymentStatus: "deposit_paid",
      receiptFileName: receiptFileName || null,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`[4] Booking updated -> status=confirmed`);

    const confirmedBooking = {
      ...booking,
      status: "confirmed",
      paymentStatus: "deposit_paid",
      receiptFileName: receiptFileName || null,
    };

    console.log(`[5] Gọi applyLoyaltyAfterPayment: uid=${booking.uid}, depositAmount=${booking.depositAmount}`);
    const loyaltyResult = await applyLoyaltyAfterPayment(
      booking.uid,
      booking.depositAmount
    );
    console.log(`[5] loyaltyResult:`, JSON.stringify({
      pointsAdded: loyaltyResult.pointsAdded,
      oldTier: loyaltyResult.oldTier,
      newTier: loyaltyResult.newTier,
      isTierUpgraded: loyaltyResult.isTierUpgraded,
      alreadyProcessed: loyaltyResult.alreadyProcessed,
      bitrixSyncError: loyaltyResult.bitrixSyncError,
      loyalty: loyaltyResult.loyalty,
    }, null, 2));

    const invoicePayload = {
      ...confirmedBooking,
      pointsAdded: loyaltyResult.pointsAdded,
      loyalty: loyaltyResult.loyalty,
    };

    const emailTasks = [
      sendAppointmentConfirmation(user, confirmedBooking),
      sendPaymentInvoice(user, invoicePayload)
    ];

    if (loyaltyResult.isTierUpgraded) {
      console.log(`[6] isTierUpgraded=true, thêm task gửi email tier upgrade`);
      emailTasks.push(
        sendTierUpgradeEmail(
          user,
          loyaltyResult.oldTier,
          loyaltyResult.newTier,
          loyaltyResult.loyalty
        )
      );
    }

    console.log(`[6] Bắt đầu gửi ${emailTasks.length} email song song...`);
    const emailResults = await Promise.allSettled(emailTasks);
    emailResults.forEach((r, i) => {
      const label = ["appointment_confirmation", "payment_invoice", "tier_upgrade"][i];
      if (r.status === "fulfilled") {
        console.log(`[6] Email [${label}]: OK -`, JSON.stringify(r.value));
      } else {
        console.error(`[6] Email [${label}]: FAIL -`, r.reason);
      }
    });

    console.log(`========== [CONFIRM PAYMENT] END (SUCCESS) ==========\n`);

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
    console.error(`[CONFIRM PAYMENT] UNEXPECTED ERROR:`, error);

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

module.exports = {
  createBooking,
  confirmPayment,
  getUserBookings,
  getUserLoyalty,
};