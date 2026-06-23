// ============================================================
// hubspotEmail.service.js  –  Powered by Resend (free tier)
// Thay thế HubSpot Transactional Email (yêu cầu gói trả phí)
//
// Setup:
//   npm install resend
//   Thêm vào .env:
//     RESEND_API_KEY=re_xxxxxxxxxxxxxx
//     EMAIL_FROM=noreply@yourdomain.com   (domain đã verify trên Resend)
//     EMAIL_FROM_NAME=Spa Booking         (tuỳ chọn)
// ============================================================

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = `${process.env.EMAIL_FROM_NAME || "Spa Booking"} <${process.env.EMAIL_FROM || "noreply@example.com"
  }>`;

// ─── Helpers ────────────────────────────────────────────────

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

// Gửi email qua Resend — hàm nội bộ, không export
async function sendEmail({ to, subject, html, label }) {
  if (!to) {
    console.log(`[EMAIL] Skip ${label}: thiếu địa chỉ người nhận`);
    return { skipped: true, reason: "missing_recipient" };
  }

  if (!process.env.RESEND_API_KEY) {
    // Chế độ mock khi chưa cấu hình API key (dev local)
    console.log(`[MOCK EMAIL] ${label} -> ${to}\nSubject: ${subject}`);
    return { mocked: true };
  }

  try {
    const data = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Đã gửi ${label} -> ${to} | id: ${data.id}`);
    return data;
  } catch (err) {
    console.error(`[EMAIL] Lỗi gửi ${label}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── HTML Templates ─────────────────────────────────────────

function baseLayout(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: Arial, sans-serif; color: #333; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #c8956c; padding: 28px 32px; text-align: center; }
    .header h1 { margin: 0; color: #fff; font-size: 22px; letter-spacing: 1px; }
    .body { padding: 28px 32px; }
    .body p { line-height: 1.7; margin: 0 0 12px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 18px 0; }
    .info-table td { padding: 10px 14px; border-bottom: 1px solid #f0e8e0; font-size: 14px; }
    .info-table td:first-child { color: #888; width: 40%; }
    .info-table td:last-child { font-weight: bold; color: #333; }
    .badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; }
    .badge-member { background: #e8e8e8; color: #555; }
    .badge-gold   { background: #fff3cd; color: #856404; }
    .badge-vip    { background: #ffe0f0; color: #880044; }
    .highlight { background: #fdf6f0; border-left: 4px solid #c8956c; padding: 14px 18px; border-radius: 0 6px 6px 0; margin: 18px 0; }
    .footer { background: #f9f3ef; padding: 18px 32px; text-align: center; font-size: 12px; color: #aaa; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>✨ Spa Booking</h1></div>
    <div class="body">${bodyContent}</div>
    <div class="footer">© 2026 Spa Booking · Email này được gửi tự động, vui lòng không reply.</div>
  </div>
</body>
</html>`;
}

function tierBadge(tier) {
  const cls =
    tier === "VIP" ? "badge-vip" : tier === "Gold" ? "badge-gold" : "badge-member";
  const icon = tier === "VIP" ? "💎" : tier === "Gold" ? "🥇" : "🎫";
  return `<span class="badge ${cls}">${icon} ${tier}</span>`;
}

function buildAppointmentHtml(p) {
  return baseLayout(
    "Xác nhận lịch hẹn",
    `<p>Xin chào <strong>${p.customer_name}</strong>,</p>
     <p>Lịch hẹn của bạn đã được xác nhận thành công. Hẹn gặp bạn sớm! 🎉</p>
     <table class="info-table">
       <tr><td>Dịch vụ</td><td>${p.service_name}</td></tr>
       <tr><td>Kỹ thuật viên</td><td>${p.technician_name || "Sẽ được sắp xếp"}</td></tr>
       <tr><td>Ngày hẹn</td><td>${p.appointment_date}</td></tr>
       <tr><td>Giờ hẹn</td><td>${p.appointment_time}</td></tr>
     </table>
     <div class="highlight">📌 Vui lòng đến trước <strong>10 phút</strong> và mang theo xác nhận này nếu cần.</div>
     <p>Nếu bạn cần thay đổi lịch, liên hệ với chúng tôi sớm nhất có thể.</p>`
  );
}

function buildInvoiceHtml(p) {
  return baseLayout(
    "Hóa đơn thanh toán",
    `<p>Xin chào <strong>${p.customer_name}</strong>,</p>
     <p>Cảm ơn bạn đã sử dụng dịch vụ. Dưới đây là thông tin hóa đơn:</p>
     <table class="info-table">
       <tr><td>Mã hóa đơn</td><td>${p.invoice_id || "—"}</td></tr>
       <tr><td>Dịch vụ</td><td>${p.service_name}</td></tr>
       <tr><td>Tổng tiền</td><td>${p.total_amount}</td></tr>
       <tr><td>Đã thanh toán</td><td>${p.paid_amount}</td></tr>
       <tr><td>Điểm tích lũy thêm</td><td>+${p.points_added} điểm</td></tr>
       <tr><td>Tổng điểm hiện tại</td><td>${p.loyalty_points} điểm</td></tr>
       <tr><td>Hạng thành viên</td><td>${tierBadge(p.loyalty_tier)}</td></tr>
     </table>
     <div class="highlight">💡 Mỗi 10.000đ chi tiêu = 1 điểm tích lũy. Đạt 1.000 điểm để lên hạng <strong>Gold</strong>!</div>`
  );
}

function buildTierUpgradeHtml(p) {
  return baseLayout(
    "Chúc mừng nâng hạng thành viên!",
    `<p>Xin chào <strong>${p.customer_name}</strong>,</p>
     <p>🎊 Chúc mừng! Bạn vừa được <strong>nâng hạng thành viên</strong>!</p>
     <div class="highlight" style="text-align:center; font-size: 18px;">
       ${tierBadge(p.old_tier)} &nbsp;→&nbsp; ${tierBadge(p.new_tier)}
     </div>
     <table class="info-table">
       <tr><td>Hạng mới</td><td>${tierBadge(p.new_tier)}</td></tr>
       <tr><td>Tổng điểm</td><td>${p.loyalty_points} điểm</td></tr>
       <tr><td>Ưu đãi mới</td><td>Giảm <strong>${p.discount_percent}%</strong> trên hóa đơn tiếp theo</td></tr>
     </table>
     <p>Cảm ơn bạn đã đồng hành cùng chúng tôi. Hẹn gặp bạn lần sau! 💖</p>`
  );
}

// ─── Exported functions (giữ nguyên interface cũ) ────────────

async function sendAppointmentConfirmation(user, bookingOrPayload = {}) {
  const to = getCustomerEmail(user, bookingOrPayload);
  const props = {
    customer_name:
      user?.fullName || user?.name || bookingOrPayload.customerName || "Quý khách",
    service_name: bookingOrPayload.serviceName || bookingOrPayload.ten_dich_vu || "",
    technician_name: bookingOrPayload.technicianName || bookingOrPayload.ten_ktv || "",
    appointment_date: bookingOrPayload.appointmentDate || bookingOrPayload.ngay_dat || "",
    appointment_time: bookingOrPayload.appointmentTime || bookingOrPayload.gio_dat || "",
  };

  return sendEmail({
    to,
    subject: `[Spa Booking] Xác nhận lịch hẹn – ${props.service_name}`,
    html: buildAppointmentHtml(props),
    label: "appointment_confirmation",
  });
}

async function sendPaymentInvoice(user, invoicePayload = {}) {
  const to = getCustomerEmail(user, invoicePayload);
  const props = {
    customer_name:
      user?.fullName || user?.name || invoicePayload.customerName || "Quý khách",
    invoice_id:
      invoicePayload.invoiceId ||
      invoicePayload.bitrixInvoiceId ||
      invoicePayload.dealId ||
      "",
    service_name: invoicePayload.serviceName || invoicePayload.ten_dich_vu || "",
    total_amount: formatVnd(invoicePayload.totalAmount),
    paid_amount: formatVnd(invoicePayload.paidAmount || invoicePayload.depositAmount),
    points_added: invoicePayload.pointsAdded || 0,
    loyalty_points:
      invoicePayload.loyalty?.lifetimePoints || invoicePayload.loyalty?.points || 0,
    loyalty_tier: invoicePayload.loyalty?.tier || "Member",
  };

  return sendEmail({
    to,
    subject: `[Spa Booking] Hóa đơn thanh toán – ${props.invoice_id || props.service_name}`,
    html: buildInvoiceHtml(props),
    label: "payment_invoice",
  });
}

async function sendTierUpgradeEmail(user, oldTier, newTier, loyalty = {}) {
  const to = getCustomerEmail(user);
  const props = {
    customer_name: user?.fullName || user?.name || "Quý khách",
    old_tier: oldTier,
    new_tier: newTier,
    loyalty_points: loyalty.lifetimePoints || loyalty.points || 0,
    discount_percent: loyalty.discountPercent || 0,
  };

  return sendEmail({
    to,
    subject: `[Spa Booking] 🎉 Chúc mừng! Bạn vừa lên hạng ${newTier}`,
    html: buildTierUpgradeHtml(props),
    label: "tier_upgrade",
  });
}

module.exports = {
  sendAppointmentConfirmation,
  sendPaymentInvoice,
  sendTierUpgradeEmail,
};