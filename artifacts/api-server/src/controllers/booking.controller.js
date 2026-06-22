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

module.exports = {
  createBooking,
  confirmPayment,
  getUserBookings,
  getUserLoyalty,
};