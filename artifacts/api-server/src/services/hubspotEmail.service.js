const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_SINGLE_SEND_URL =
  "https://api.hubapi.com/marketing/v3/transactional/single-email/send";

function formatVnd(amount) {
  return Number(amount || 0).toLocaleString("vi-VN") + " VND";
}

function getCustomerEmail(user, fallbackPayload = {}) {
  return (
    user?.email ||
    user?.customerEmail ||
    fallbackPayload.customerEmail ||
    fallbackPayload.email ||
    null
  );
}

async function sendTransactionalEmail({ emailId, to, customProperties, label }) {
  if (!to) {
    console.log(`[HUBSPOT EMAIL] Skip ${label}: missing recipient email`);
    return { skipped: true, reason: "missing_recipient" };
  }

  if (!HUBSPOT_ACCESS_TOKEN || !emailId) {
    console.log(
      `[MOCK HUBSPOT EMAIL] ${label} -> ${to}`,
      JSON.stringify(customProperties, null, 2)
    );
    return { mocked: true };
  }

  const response = await fetch(HUBSPOT_SINGLE_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      emailId: Number(emailId),
      message: { to },
      customProperties,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || data.error || `HubSpot email failed: ${label}`
    );
  }

  return data;
}

async function sendAppointmentConfirmation(user, bookingOrPayload = {}) {
  const to = getCustomerEmail(user, bookingOrPayload);

  return sendTransactionalEmail({
    emailId: process.env.HUBSPOT_APPOINTMENT_EMAIL_ID,
    to,
    label: "appointment_confirmation",
    customProperties: {
      customer_name:
        user?.fullName ||
        user?.name ||
        bookingOrPayload.customerName ||
        "Khach hang",
      service_name:
        bookingOrPayload.serviceName || bookingOrPayload.ten_dich_vu || "",
      technician_name:
        bookingOrPayload.technicianName || bookingOrPayload.ten_ktv || "",
      appointment_date:
        bookingOrPayload.appointmentDate || bookingOrPayload.ngay_dat || "",
      appointment_time:
        bookingOrPayload.appointmentTime || bookingOrPayload.gio_dat || "",
    },
  });
}

async function sendPaymentInvoice(user, invoicePayload = {}) {
  const to = getCustomerEmail(user, invoicePayload);

  return sendTransactionalEmail({
    emailId: process.env.HUBSPOT_INVOICE_EMAIL_ID,
    to,
    label: "payment_invoice",
    customProperties: {
      customer_name:
        user?.fullName ||
        user?.name ||
        invoicePayload.customerName ||
        "Khach hang",
      invoice_id:
        invoicePayload.invoiceId ||
        invoicePayload.bitrixInvoiceId ||
        invoicePayload.dealId ||
        "",
      service_name:
        invoicePayload.serviceName || invoicePayload.ten_dich_vu || "",
      total_amount: formatVnd(invoicePayload.totalAmount),
      paid_amount: formatVnd(invoicePayload.paidAmount),
      points_added: invoicePayload.pointsAdded || 0,
      loyalty_points:
        invoicePayload.loyalty?.lifetimePoints ||
        invoicePayload.loyalty?.points ||
        0,
      loyalty_tier: invoicePayload.loyalty?.tier || "Member",
    },
  });
}

async function sendTierUpgradeEmail(user, oldTier, newTier, loyalty = {}) {
  const to = getCustomerEmail(user);

  return sendTransactionalEmail({
    emailId: process.env.HUBSPOT_TIER_UPGRADE_EMAIL_ID,
    to,
    label: "tier_upgrade",
    customProperties: {
      customer_name: user?.fullName || user?.name || "Khach hang",
      old_tier: oldTier,
      new_tier: newTier,
      loyalty_points: loyalty.lifetimePoints || loyalty.points || 0,
      discount_percent: loyalty.discountPercent || 0,
    },
  });
}

module.exports = {
  sendAppointmentConfirmation,
  sendPaymentInvoice,
  sendTierUpgradeEmail,
};
