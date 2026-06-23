const axios = require('axios');
const { db } = require('../config/firebase');
const { removeAccents } = require('../utils/receiptParser');
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
        } catch (e) {}
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
        const { ten_dich_vu, gia_tien, ten_ktv, ngay_dat, gio_dat, thoi_gian } = req.body;
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

        const deal_res = await axios.get(`${url_goc}crm.deal.get?id=${id_giao_dich}`);
        const deal = deal_res.data.result;
        if (!deal) return res.status(404).json({ loi: "Không tìm thấy Deal." });

        const snapshot = await db.collection('transactions').where('bookingId', 'in', [String(id_giao_dich), Number(id_giao_dich)]).get();
        if (snapshot.empty) return res.status(200).json({ thanh_cong: false, loi: "Không tìm thấy biên lai AI." });

        const docs = snapshot.docs.sort((a,b) => (b.data().createdAt?.toMillis() || 0) - (a.data().createdAt?.toMillis() || 0));
        const transactionDoc = docs[0];
        const ocr = transactionDoc.data().ocrData || {};

        const khop_nguoi_nhan = removeAccents(ocr.detectedRecipient || "").toUpperCase().includes("DINH VAN MANH");
        const khop_so_tien = Math.abs(parseInt(ocr.detectedAmount) - parseInt(deal.OPPORTUNITY)) < 100;
        const khop_noi_dung = String(ocr.detectedContent || "").toUpperCase().includes(`DH${id_giao_dich}`);

        let khop_thoi_gian = false;
        const gio_ck = parseDateOCR(ocr.detectedTransferDate);
        if (gio_ck && Math.abs(Date.now() - gio_ck.getTime()) / 60000 <= 10.5) khop_thoi_gian = true;

        if (!khop_nguoi_nhan || !khop_so_tien || !khop_noi_dung || !khop_thoi_gian) {
            return res.status(200).json({ thanh_cong: false, loi: "Biên lai không khớp đối soát." });
        }

        await axios.post(`${url_goc}crm.item.add?entityTypeId=31`, {
            fields: { title: `Cọc DH${id_giao_dich}`, opportunity: deal.OPPORTUNITY, currencyId: "VND", parentId2: id_giao_dich, opened: "Y" }
        });

        // CHUYỂN SANG CỘT "ĐÃ XUẤT HOÁ ĐƠN" (Stage ID: PREPAYMENT_INVOICE)
        await axios.post(`${url_goc}crm.deal.update`, { id: id_giao_dich, fields: { STAGE_ID: "PREPAYMENT_INVOICE" } });

        await transactionDoc.ref.update({ ocrStatus: 'verified', bitrixStatus: 'confirmed', verifiedAt: new Date() });

        return res.status(200).json({ thanh_cong: true });
    } catch (err) {
        return res.status(500).json({ loi: "Lỗi Bitrix24: " + err.message });
    }
};

// 4. API GET: Lấy lịch sử đặt hẹn
const layLichSuDatHen = async (req, res) => {
    try {
        const url_goc = "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/";

        // Lấy đồng thời danh sách Deal, cấu hình Fields và kho Sản phẩm
        const [phan_hoi_deals, phan_hoi_fields, phan_hoi_san_pham] = await Promise.all([
            axios.get(`${url_goc}crm.deal.list`, {
                params: {
                    select: ["ID", "TITLE", "STAGE_ID", "OPPORTUNITY", "DATE_CREATE", "UF_CRM_1781780490460", "UF_CRM_1782201826"],
                    order: { "ID": "DESC" }
                }
            }),
            axios.get(url_goc + "crm.deal.fields"),
            axios.get(url_goc + "crm.product.list")
        ]);

        const danh_sach_deal = phan_hoi_deals.data.result || [];
        const kho_san_pham = phan_hoi_san_pham.data.result || [];

        // Tạo bảng ánh xạ ID KTV -> Tên thật từ Bitrix
        const truong_dat_lich_f = phan_hoi_fields.data.result['UF_CRM_1781780490460'];
        let cai_dat = truong_dat_lich_f?.settings || truong_dat_lich_f?.SETTINGS || {};
        if (typeof cai_dat === 'string') cai_dat = JSON.parse(cai_dat);

        const map_ktv = {};
        (cai_dat.SELECTED_RESOURCES || []).forEach(ktv => {
            map_ktv[String(ktv.id)] = (ktv.title || ktv.NAME || "").trim();
        });

        const lich_sap_toi = [];
        const lich_su_dich_vu = [];
        let tong_diem = 0;
        const now = new Date();

        danh_sach_deal.forEach(deal => {
            const trang_thai = String(deal.STAGE_ID).toUpperCase();
            const deal_title = String(deal.TITLE || "");

            let du_lieu_lich = {};
            try {
                const raw = deal.UF_CRM_1781780490460;
                if (raw) {
                    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    // Bitrix field trả về có thể là mảng JSON string
                    du_lieu_lich = Array.isArray(parsed) ? (typeof parsed[0] === 'string' ? JSON.parse(parsed[0]) : parsed[0]) : parsed;
                }
            } catch (e) {}
            du_lieu_lich = du_lieu_lich || {};

            // FIX TÊN KTV THÔNG MINH:
            let ten_ktv = "Chuyên viên";

            // Cách 1: Ưu tiên tách từ Tiêu đề Deal (Giải pháp chắc chắn 100% cho deal mới)
            if (deal_title.includes("| KTV:")) {
                ten_ktv = deal_title.split("| KTV:")[1].trim();
            } else {
                // Cách 2: Lấy từ mảng resources trong booking field (Dự phòng cho deal cũ)
                const res_data = du_lieu_lich.resources || du_lieu_lich.RESOURCES;
                if (res_data) {
                    const items = Array.isArray(res_data) ? res_data : [res_data];
                    const item = items[0];
                    if (item) {
                        const rid = String(item.id || item.ID);
                        ten_ktv = map_ktv[rid] || item.title || item.TITLE || item.name || item.NAME || "Chuyên viên";
                    }
                }
            }

            // Xử lý Dịch vụ
            let ten_dv_raw = "Dịch vụ";
            if (deal_title.includes("Booking - ")) {
                ten_dv_raw = deal_title.split("|")[0].replace("Booking - ", "").trim();
            } else {
                ten_dv_raw = (du_lieu_lich.service_name || du_lieu_lich.SERVICE_NAME || "Dịch vụ").trim();
            }

            // Tính giá gốc (Giữ nguyên logic đã chạy đúng)
            const sp = kho_san_pham.find(s => s.NAME.trim().toLowerCase() === ten_dv_raw.toLowerCase());
            const gia_goc = sp ? Math.round(parseFloat(sp.PRICE)) : (deal.OPPORTUNITY ? Math.round(parseFloat(deal.OPPORTUNITY) / 0.3) : 0);

            // Xử lý thời gian
            const thoi_gian_raw = du_lieu_lich.date_start || du_lieu_lich.DATE_START || deal.UF_CRM_1782201826 || "";
            let hien_thi_ngay = "--/--/----";
            let hien_thi_gio = "--:--";
            let compare_date = null;

            if (thoi_gian_raw) {
                compare_date = new Date(String(thoi_gian_raw).replace(' ', 'T'));
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
                id: deal.ID,
                ma_don: `SPA-${deal.ID}`,
                ten_dich_vu: ten_dv_raw,
                ten_ktv: ten_ktv,
                ngay: hien_thi_ngay,
                gio: hien_thi_gio,
                gia: gia_goc
            };

            const is_future = compare_date ? compare_date > now : false;
            if ((trang_thai.includes("PREPARATION") || trang_thai.includes("PREPAYMENT_INVOICE")) && is_future) {
                item.trang_thai_hien_thi = trang_thai.includes("PREPAYMENT_INVOICE") ? "Đã xuất hoá đơn" : "Đã xác nhận";
                lich_sap_toi.push(item);
            } else if ((compare_date && !is_future) || trang_thai.includes("WON")) {
                item.trang_thai_hien_thi = trang_thai.includes("WON") ? "Hoàn thành" : "Đã sử dụng";
                lich_su_dich_vu.push(item);
                if (trang_thai.includes("WON")) tong_diem += Math.round(gia_goc * 0.1 / 1000);
            }
        });

        return res.status(200).json({ lich_sap_toi, lich_su_dich_vu, tong_diem });
    } catch (loi) {
        console.error("Lỗi layLichSuDatHen:", loi);
        return res.status(500).json({ loi: "Lỗi hệ thống" });
    }
};

const giuChoVaTaoQR = (req, res) => res.status(404).json({ thong_bao: "Dùng /api/chot-lich-hen" });

module.exports = { layThongTinDatLich, chotLichHen, xacNhanThanhToan, layLichSuDatHen, giuChoVaTaoQR };
