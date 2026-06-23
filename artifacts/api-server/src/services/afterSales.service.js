const { db } = require("../config/firebase");
const { applyLoyaltyAfterPayment } = require("./loyalty.service");
const {
  sendAppointmentConfirmation,
  sendPaymentInvoice,
  sendTierUpgradeEmail,
} = require("./hubspotEmail.service");

function normalizeMoney(value) {
  if (typeof value === "number") return value;
  return Number(String(value || "0").replace(/[^\d]/g, ""));
}

async function findUserByPayload(payload) {
  if (payload.uid) {
    const userDoc = await db.collection("users").doc(String(payload.uid)).get();
    if (userDoc.exists) {
      return { uid: userDoc.id, ...userDoc.data() };
    }
  }

  if (payload.customerEmail) {
    const snapshot = await db
      .collection("users")
      .where("email", "==", payload.customerEmail)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      return { uid: userDoc.id, ...userDoc.data() };
    }
  }

  return null;
}

function buildAfterSalesPayload({
  deal,
  bookingPayment,
  transaction,
  invoiceId,
}) {
  const booking = bookingPayment || {};
  const ocr = transaction?.ocrData || {};
  const dealId = String(deal.ID || booking.dealId || "");
  const totalAmount = normalizeMoney(
    booking.totalAmount || booking.gia_tien || deal.OPPORTUNITY
  );
  const paidAmount = normalizeMoney(
    ocr.detectedAmount || transaction?.amountPaid || deal.OPPORTUNITY
  );

  return {
    source: "bitrix_invoice_success",
    dealId,
    invoiceId: invoiceId ? String(invoiceId) : null,
    uid: booking.uid || booking.userId || transaction?.userId || null,
    customerName: booking.customerName || booking.fullName || null,
    customerEmail: booking.customerEmail || booking.email || null,
    customerPhone: booking.customerPhone || booking.phoneNumber || null,
    serviceName: booking.serviceName || booking.ten_dich_vu || deal.TITLE || "",
    technicianName: booking.technicianName || booking.ten_ktv || "",
    appointmentDate: booking.appointmentDate || booking.ngay_dat || "",
    appointmentTime: booking.appointmentTime || booking.gio_dat || "",
    totalAmount,
    paidAmount,
    bitrixStageId: deal.STAGE_ID || null,
    createdAt: new Date(),
  };
}

async function processInvoiceSuccess(payload) {
  const user = await findUserByPayload(payload);

  if (!user?.uid) {
    throw new Error(
      "Khong tim thay user Firestore de cong diem. Hay gui uid hoac customerEmail trong payload."
    );
  }

  const eventId = `bitrix_deal_${payload.dealId}`;
  const loyaltyResult = await applyLoyaltyAfterPayment(
    user.uid,
    payload.totalAmount,
    {
      eventId,
      source: payload.source,
      sourceId: payload.dealId,
      payload,
    }
  );

  if (loyaltyResult.alreadyProcessed) {
    return {
      uid: user.uid,
      loyalty: loyaltyResult.loyalty,
      pointsAdded: loyaltyResult.pointsAdded,
      oldTier: loyaltyResult.oldTier,
      newTier: loyaltyResult.newTier,
      isTierUpgraded: loyaltyResult.isTierUpgraded,
      alreadyProcessed: true,
      bitrixSyncError: loyaltyResult.bitrixSyncError || null,
    };
  }

  const emailPayload = {
    ...payload,
    loyalty: loyaltyResult.loyalty,
    pointsAdded: loyaltyResult.pointsAdded,
  };

  await sendAppointmentConfirmation(user, emailPayload);
  await sendPaymentInvoice(user, emailPayload);

  if (loyaltyResult.isTierUpgraded) {
    await sendTierUpgradeEmail(
      user,
      loyaltyResult.oldTier,
      loyaltyResult.newTier,
      loyaltyResult.loyalty
    );
  }

  await db.collection("after_sales_events").doc(eventId).set(
    {
      eventId,
      payload,
      uid: user.uid,
      loyalty: loyaltyResult.loyalty,
      pointsAdded: loyaltyResult.pointsAdded,
      oldTier: loyaltyResult.oldTier,
      newTier: loyaltyResult.newTier,
      isTierUpgraded: loyaltyResult.isTierUpgraded,
      alreadyProcessed: loyaltyResult.alreadyProcessed || false,
      bitrixSyncError: loyaltyResult.bitrixSyncError || null,
      processedAt: new Date(),
    },
    { merge: true }
  );

  return {
    uid: user.uid,
    loyalty: loyaltyResult.loyalty,
    pointsAdded: loyaltyResult.pointsAdded,
    oldTier: loyaltyResult.oldTier,
    newTier: loyaltyResult.newTier,
    isTierUpgraded: loyaltyResult.isTierUpgraded,
    alreadyProcessed: loyaltyResult.alreadyProcessed || false,
    bitrixSyncError: loyaltyResult.bitrixSyncError || null,
  };
}

module.exports = {
  buildAfterSalesPayload,
  processInvoiceSuccess,
};
