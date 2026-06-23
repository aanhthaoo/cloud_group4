const axios = require('axios');
const { db } = require('../config/firebase');
const { removeAccents } = require('../utils/receiptParser');
const {
    buildAfterSalesPayload,
    processInvoiceSuccess,
} = require('../services/afterSales.service');
require('dotenv').config();

// Hàm hỗ trợ parse ngày tháng từ OCR
const parseDateOCR = (dateStr) => {
    if (!dateStr) return null;
    try {
        const dmyMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (dmyMatch) {
            const day = dmyMatch[1].padStart(2, '0');
            const month = dmyMatch[2].padStart(2, '0');
            const year = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
            const timeMatch = dateStr.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
            const hh = timeMatch ? timeMatch[1].padStart(2, '0') : "00";
            const mm = timeMatch ? timeMatch[2].padStart(2, '0') : "00";
            const ss = (timeMatch && timeMatch[3]) ? timeMatch[3].padStart(2, '0') : "00";
            const isoStr = `${year}-${month}-${day}T${hh}:${mm}:${ss}+07:00`;
            const d = new Date(isoStr);
            if (!isNaN(d.getTime())) return d;
        }
        const cleanStr = dateStr.replace(/at|lúc/g, '').trim();
        const d = new Date(cleanStr);
        if (!isNaN(d.getTime())) return d;
    } catch (e) {
        console.error("Lỗi parse ngày OCR:", e.message);
    }
    return null;
};

// 1. API GET: Lấy thông tin dịch vụ, KTV
const layThongTinDatLich = async (req, res) => {
    try {
        const url_goc = "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/";
        const [phan_hoi_dat_lich, phan_hoi_san_pham, phan_hoi_deal] = await Promise.all([
            axios.get(url_goc + "crm.deal.fields"),
            axios.get(url_goc + "crm.product.list"),
            axios.post(url_goc + "crm.deal.list", {
                SELECT: ["ID", "STAGE_ID", "DATE_CREATE", "UF_CRM_1781780490460"]
            })
        ]);

        const truong_dat_lich = phan_hoi_dat_lich.data.result['UF_CRM_1781780490460'];
        let cai_dat = truong_dat_lich?.settings || truong_dat_lich?.SETTINGS || {};
        if (typeof cai_dat === 'string') cai_dat = JSON.parse(cai_dat);

        const kho_san_pham = phan_hoi_san_pham.data.result || [];
        const danh_sach_dich_vu = (cai_dat.SERVICE_LIST || []).map((dv, i) => {
            const sp = kho_san_pham.find(s => s.NAME.trim() === dv.name.trim());
            return {
                id: i + 1,
                ten: dv.name.trim(),
                thoi_gian: dv.duration,
                gia: sp ? Math.round(parseFloat(sp.PRICE)) : 0,
                mo_ta: (sp?.DESCRIPTION || "Dịch vụ Spa chuyên nghiệp").replace(/&nbsp;/g, ' '),
                icon: "CheckCircle2"
            };
        });

        const danh_sach_ktv = (cai_dat.SELECTED_RESOURCES || []).map(ktv => ({
            id: ktv.id,
            ten: ktv.title || ktv.NAME
        }));

        const danh_sach_lich_ban = (phan_hoi_deal.data.result || []).map(deal => {
            if (!deal.UF_CRM_1781780490460) return null;
            let du_lieu = null;
            try {
                const raw = deal.UF_CRM_1781780490460;
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                du_lieu = Array.isArray(parsed) ? parsed[0] : parsed;
            } catch (e) { }
            if (!du_lieu || (!du_lieu.date_start && !du_lieu.DATE_START)) return null;
            return String(du_lieu.date_start || du_lieu.DATE_START).substring(0, 16).replace('T', ' ');
        }).filter(Boolean);

        return res.status(200).json({ danh_sach_dich_vu, danh_sach_ktv, danh_sach_lich_ban });
    } catch (loi) {
        // Log chi tiết để debug khi Bitrix trả về lỗi
        console.error('[layThongTinDatLich] Lỗi gọi Bitrix24:', loi.response?.data || loi.message);
        // Trả về mảng rỗng thay vì để Frontend bị crash khi .map() trên undefined
        return res.status(500).json({
            loi: "Lỗi hệ thống khi kết nối Bitrix24",
            danh_sach_dich_vu: [],
            danh_sach_ktv: [],
            danh_sach_lich_ban: []
        });
    }
};

// 2. API POST: Chốt lịch hẹn
const chotLichHen = async (req, res) => {
    try {
        const {
            ten_dich_vu,
            gia_tien,
            ten_ktv,
            ngay_dat,
            gio_dat,
            thoi_gian,
            uid,
            customerName,
            customerEmail,
            customerPhone,
        } = req.body;
        const url_goc = "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/";

        // Lấy ID KTV chính xác từ settings của Bitrix
        const fields_res = await axios.get(url_goc + "crm.deal.fields");
        const truong_dat_lich = fields_res.data.result['UF_CRM_1781780490460'];
        let cai_dat = truong_dat_lich?.settings || truong_dat_lich?.SETTINGS || {};
        if (typeof cai_dat === 'string') cai_dat = JSON.parse(cai_dat);

        const ktv_info = (cai_dat.SELECTED_RESOURCES || []).find(r =>
            String(r.title || r.NAME || "").trim().toLowerCase() === String(ten_ktv || "").trim().toLowerCase()
        );
        const ktv_id = ktv_info ? ktv_info.id : "1";

        const tien_dat_coc = Math.round(parseInt(String(gia_tien).replace(/[^0-9]/g, '')) * 0.3);
        const full_iso_time = `${ngay_dat}T${gio_dat}:00+07:00`;

        const du_lieu_lich = {
            "date_start": full_iso_time,
            "duration": parseInt(thoi_gian) * 60,
            "service_name": ten_dich_vu,
            "resources": [{ "id": ktv_id, "title": ten_ktv }]
        };

        const phan_hoi = await axios.post(url_goc + "crm.deal.add", {
            fields: {
                // LƯU TÊN KTV VÀO TITLE ĐỂ LÀM FALLBACK CHẮC CHẮN 100%
                TITLE: `Booking - ${ten_dich_vu} | KTV: ${ten_ktv}`,
                STAGE_ID: "NEW",
                OPPORTUNITY: tien_dat_coc,
                CURRENCY_ID: "VND",
                UF_CRM_1781780490460: JSON.stringify(du_lieu_lich),
                UF_CRM_1782201826: full_iso_time
            }
        });

        const id_giao_dich = phan_hoi.data.result;
        await db.collection('booking_payments').doc(String(id_giao_dich)).set({
            dealId: String(id_giao_dich),
            uid: uid || null,
            customerName: customerName || null,
            customerEmail: customerEmail || null,
            customerPhone: customerPhone || null,
            serviceName: ten_dich_vu,
            technicianName: ten_ktv,
            appointmentDate: ngay_dat,
            appointmentTime: gio_dat,
            duration: parseInt(thoi_gian) || null,
            totalAmount: parseInt(String(gia_tien).replace(/[^0-9]/g, '')) || 0,
            depositAmount: tien_dat_coc,
            status: 'waiting_payment',
            createdAt: new Date(),
            updatedAt: new Date(),
        }, { merge: true });

        const link_qr = `https://img.vietqr.io/image/${process.env.NGAN_HANG || "MB"}-${process.env.SO_TAI_KHOAN || "0377172930"}-compact2.png?amount=${tien_dat_coc}&addInfo=${encodeURIComponent(`LOTUSGLOW DH${id_giao_dich}`)}&accountName=${encodeURIComponent("DINH VAN MANH")}`;

        return res.status(200).json({ thanh_cong: true, id_giao_dich, link_qr });
    } catch (loi) {
        return res.status(500).json({ loi: "Lỗi hệ thống" });
    }
};

// 3. API POST: Xác nhận thanh toán
const xacNhanThanhToan = async (req, res) => {
    try {
        const { id_giao_dich } = req.body;
        const url_goc = "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/";
        if (!id_giao_dich) return res.status(400).json({ loi: "Thiếu ID giao dịch" });

        // B1: Lấy Deal từ Bitrix
        console.log(`[xacNhanThanhToan] B1 - Lấy deal ${id_giao_dich} từ Bitrix24`);
        const deal_res = await axios.get(`${url_goc}crm.deal.get?id=${id_giao_dich}`);
        const deal = deal_res.data.result;
        if (!deal) return res.status(404).json({ loi: "Không tìm thấy Deal." });

        // B2: Tìm transaction OCR — dùng 2 query riêng để tránh lỗi mixed-type
        console.log(`[xacNhanThanhToan] B2 - Tìm transaction cho bookingId: ${id_giao_dich}`);
        let snapshot;
        try {
            const [snapStr, snapNum] = await Promise.all([
                db.collection('transactions').where('bookingId', '==', String(id_giao_dich)).get(),
                db.collection('transactions').where('bookingId', '==', id_giao_dich).get(),
            ]);
            // Gộp kết quả, loại trùng theo doc ID
            const docsMap = new Map();
            [...snapStr.docs, ...snapNum.docs].forEach(d => docsMap.set(d.id, d));
            snapshot = { empty: docsMap.size === 0, docs: [...docsMap.values()] };
        } catch (firestoreErr) {
            console.error('[xacNhanThanhToan] ❌ Lỗi Firestore khi tìm transaction:', firestoreErr.code, firestoreErr.message);
            return res.status(500).json({ loi: `Lỗi Firestore: ${firestoreErr.message}` });
        }

        if (snapshot.empty) return res.status(200).json({ thanh_cong: false, loi: "Không tìm thấy biên lai AI." });

        const docs = snapshot.docs.sort((a, b) => (b.data().createdAt?.toMillis() || 0) - (a.data().createdAt?.toMillis() || 0));
        const transactionDoc = docs[0];
        const ocr = transactionDoc.data().ocrData || {};

        // B3: Đối soát biên lai
        console.log(`[xacNhanThanhToan] B3 - Đối soát OCR`);
        const khop_nguoi_nhan = removeAccents(ocr.detectedRecipient || "").toUpperCase().includes("DINH VAN MANH");
        const khop_so_tien = Math.abs(parseInt(ocr.detectedAmount) - parseInt(deal.OPPORTUNITY)) < 100;
        const khop_noi_dung = String(ocr.detectedContent || "").toUpperCase().includes(`DH${id_giao_dich}`);

        let khop_thoi_gian = false;
        const gio_ck = parseDateOCR(ocr.detectedTransferDate);
        if (gio_ck && Math.abs(Date.now() - gio_ck.getTime()) / 60000 <= 10.5) khop_thoi_gian = true;

        if (!khop_nguoi_nhan || !khop_so_tien || !khop_noi_dung || !khop_thoi_gian) {
            console.log(`[xacNhanThanhToan] ❌ Đối soát thất bại:`, { khop_nguoi_nhan, khop_so_tien, khop_noi_dung, khop_thoi_gian });
            return res.status(200).json({ thanh_cong: false, loi: "Biên lai không khớp đối soát." });
        }

        // B4: Cập nhật Bitrix
        console.log(`[xacNhanThanhToan] B4 - Cập nhật Bitrix24`);
        await axios.post(`${url_goc}crm.item.add?entityTypeId=31`, {
            fields: { title: `Cọc DH${id_giao_dich}`, opportunity: deal.OPPORTUNITY, currencyId: "VND", parentId2: id_giao_dich, opened: "Y" }
        });
        await axios.post(`${url_goc}crm.deal.update`, { id: id_giao_dich, fields: { STAGE_ID: "PREPAYMENT_INVOICE" } });

        // B5: After-sales (loyalty + email) — không để lỗi ở đây làm fail toàn bộ flow
        console.log(`[xacNhanThanhToan] B5 - After-sales`);
        let afterSalesResult = null;
        try {
            const bookingPaymentDoc = await db.collection('booking_payments').doc(String(id_giao_dich)).get();
            const bookingPayment = bookingPaymentDoc.exists ? bookingPaymentDoc.data() : null;
            const afterSalesPayload = buildAfterSalesPayload({
                deal: { ...deal, STAGE_ID: "PREPAYMENT_INVOICE" },
                bookingPayment,
                transaction: transactionDoc.data(),
                invoiceId: null,
            });
            afterSalesResult = await processInvoiceSuccess(afterSalesPayload);
        } catch (afterSalesErr) {
            console.error('[xacNhanThanhToan] ⚠️ After-sales lỗi (không block flow):', afterSalesErr.message);
            afterSalesResult = { error: afterSalesErr.message };
        }

        // B6: Cập nhật Firestore
        console.log(`[xacNhanThanhToan] B6 - Cập nhật Firestore`);
        try {
            await transactionDoc.ref.update({
                ocrStatus: 'verified',
                bitrixStatus: 'confirmed',
                verifiedAt: new Date(),
                afterSalesResult,
            });
            await db.collection('booking_payments').doc(String(id_giao_dich)).set({
                status: 'invoice_success',
                afterSalesResult,
                updatedAt: new Date(),
            }, { merge: true });
        } catch (updateErr) {
            console.error('[xacNhanThanhToan] ⚠️ Cập nhật Firestore lỗi:', updateErr.message);
        }

        console.log(`[xacNhanThanhToan] ✅ Xác nhận thành công cho deal ${id_giao_dich}`);
        return res.status(200).json({ thanh_cong: true, afterSales: afterSalesResult });
    } catch (err) {
        console.error('[xacNhanThanhToan] ❌ Lỗi không xác định:', err.code, err.message);
        return res.status(500).json({ loi: "Lỗi xử lý: " + err.message });
    }
};


// 4. API GET: Lấy lịch sử đặt hẹn
const layLichSuDatHen = async (req, res) => {
    try {
        const { uid } = req.query;
        if (!uid) {
            return res.status(400).json({ loi: "Thiếu thông tin người dùng (uid)" });
        }

        // 1. Lấy thông tin user từ Firestore để lấy điểm tích lũy
        const userDoc = await db.collection('users').doc(uid).get();
        let tong_diem = 0;
        if (userDoc.exists) {
            const userData = userDoc.data();
            tong_diem = userData.loyalty?.points || 0;
        }

        // 2. Lấy lịch sử đặt hẹn từ booking_payments theo uid
        const bookingsSnapshot = await db.collection('booking_payments')
            .where('uid', '==', uid)
            .get();

        const lich_sap_toi = [];
        const lich_su_dich_vu = [];
        const now = new Date();

        // Chuyển kết quả sang mảng để sort (vì Firestore có thể yêu cầu index nếu order kết hợp where)
        const bookings = [];
        bookingsSnapshot.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));
        bookings.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        bookings.forEach(booking => {
            let hien_thi_ngay = booking.appointmentDate || "--/--/----";
            let hien_thi_gio = booking.appointmentTime || "--:--";
            let compare_date = null;

            if (booking.appointmentDate && booking.appointmentTime) {
                // Định dạng ISO: YYYY-MM-DDTHH:mm:00+07:00
                const rawDate = `${booking.appointmentDate}T${booking.appointmentTime}:00+07:00`;
                compare_date = new Date(rawDate);

                if (!isNaN(compare_date.getTime())) {
                    hien_thi_ngay = compare_date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                    hien_thi_gio = compare_date.toLocaleTimeString('vi-VN', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                }
            }

            const item = {
                id: booking.dealId || booking.id,
                ma_don: `SPA-${booking.dealId || booking.id}`,
                ten_dich_vu: booking.serviceName || "Dịch vụ",
                ten_ktv: booking.technicianName || "Chuyên viên",
                ngay: hien_thi_ngay,
                gio: hien_thi_gio,
                gia: booking.totalAmount || booking.depositAmount || 0,
            };

            const is_future = compare_date ? compare_date > now : false;

            if (is_future && booking.status !== 'cancelled') {
                item.trang_thai_hien_thi = booking.status === 'invoice_success' ? "Đã xác nhận" : "Chờ xác nhận";
                lich_sap_toi.push(item);
            } else if (!is_future && booking.status !== 'cancelled') {
                item.trang_thai_hien_thi = "Hoàn thành";
                lich_su_dich_vu.push(item);
            }
        });

        return res.status(200).json({ lich_sap_toi, lich_su_dich_vu, tong_diem });
    } catch (loi) {
        console.error("Lỗi layLichSuDatHen (Firestore):", loi);
        return res.status(500).json({ loi: "Lỗi hệ thống" });
    }
};

const giuChoVaTaoQR = (req, res) => res.status(404).json({ thong_bao: "Dùng /api/chot-lich-hen" });

const dongBoDiemBitrixDaThanhToan = async (req, res) => {
    try {
        const url_goc = "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/";
        const limit = Math.min(Number(req.body?.limit || 50), 200);
        const stages = req.body?.stages || ["WON"];

        const deals_res = await axios.post(`${url_goc}crm.deal.list`, {
            order: { ID: "DESC" },
            select: ["ID", "TITLE", "STAGE_ID", "OPPORTUNITY", "CONTACT_ID"],
        });

        const deals = (deals_res.data.result || [])
            .filter((deal) => stages.some((stage) => String(deal.STAGE_ID || "").includes(stage)))
            .slice(0, limit);

        const synced = [];
        const skipped = [];

        for (const deal of deals) {
            try {
                let customerEmail = null;
                let customerName = null;

                if (deal.CONTACT_ID) {
                    const contact_res = await axios.get(`${url_goc}crm.contact.get?id=${deal.CONTACT_ID}`);
                    const contact = contact_res.data.result || {};
                    customerName = [contact.NAME, contact.LAST_NAME].filter(Boolean).join(" ").trim() || null;
                    customerEmail = Array.isArray(contact.EMAIL) && contact.EMAIL[0]?.VALUE
                        ? contact.EMAIL[0].VALUE
                        : null;
                }

                if (!customerEmail) {
                    skipped.push({ dealId: deal.ID, reason: "missing_contact_email" });
                    continue;
                }

                const result = await processInvoiceSuccess({
                    source: "bitrix_paid_deal_sync",
                    dealId: String(deal.ID),
                    invoiceId: null,
                    customerName,
                    customerEmail,
                    serviceName: deal.TITLE || "",
                    totalAmount: Number(deal.OPPORTUNITY || 0),
                    paidAmount: Number(deal.OPPORTUNITY || 0),
                    bitrixStageId: deal.STAGE_ID || null,
                    createdAt: new Date(),
                });

                synced.push({ dealId: deal.ID, ...result });
            } catch (error) {
                skipped.push({ dealId: deal.ID, reason: error.message });
            }
        }

        return res.status(200).json({
            thanh_cong: true,
            syncedCount: synced.length,
            skippedCount: skipped.length,
            synced,
            skipped,
        });
    } catch (error) {
        return res.status(500).json({ loi: "Khong dong bo duoc diem Bitrix: " + error.message });
    }
};

module.exports = { layThongTinDatLich, chotLichHen, xacNhanThanhToan, layLichSuDatHen, giuChoVaTaoQR, dongBoDiemBitrixDaThanhToan };
