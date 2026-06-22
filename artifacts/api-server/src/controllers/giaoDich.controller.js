const axios = require('axios');
const { db } = require('../config/firebase');
const { removeAccents } = require('../utils/receiptParser');
require('dotenv').config();

// Hàm hỗ trợ parse ngày tháng từ OCR và chuẩn hóa về đối tượng Date
const parseDateOCR = (dateStr) => {
    if (!dateStr) return null;
    try {
        console.log(`[OCR Parse] Đang xử lý chuỗi: "${dateStr}"`);
        // 1. Thử định dạng DD/MM/YYYY hoặc DD-MM-YYYY
        const dmyMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (dmyMatch) {
            const day = dmyMatch[1].padStart(2, '0');
            const month = dmyMatch[2].padStart(2, '0');
            const year = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];

            const timeMatch = dateStr.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
            const hh = timeMatch ? timeMatch[1].padStart(2, '0') : "00";
            const mm = timeMatch ? timeMatch[2].padStart(2, '0') : "00";
            const ss = (timeMatch && timeMatch[3]) ? timeMatch[3].padStart(2, '0') : "00";

            // Ép kiểu về ISO (Giả định biên lai ở Việt Nam GMT+7)
            const isoStr = `${year}-${month}-${day}T${hh}:${mm}:${ss}+07:00`;
            const d = new Date(isoStr);
            if (!isNaN(d.getTime())) {
                return d;
            }
        }

        // 2. Thử định dạng native
        const cleanStr = dateStr.replace(/at|lúc/g, '').trim();
        const d = new Date(cleanStr);
        if (!isNaN(d.getTime())) return d;
    } catch (e) {
        console.error("Lỗi parse ngày OCR:", e.message);
    }
    return null;
};

// 1. API GET: Lấy thông tin dịch vụ, KTV và danh sách Lịch Bận
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
        const du_lieu = typeof deal.UF_CRM_1781780490460 === 'string' ? JSON.parse(deal.UF_CRM_1781780490460) : deal.UF_CRM_1781780490460;
        const thoi_gian_tao = new Date(deal.DATE_CREATE).getTime();
        const so_phut_da_qua = (Date.now() - thoi_gian_tao) / 60000;
        const trang_thai = String(deal.STAGE_ID).toUpperCase();
        if ((trang_thai.includes('NEW') && so_phut_da_qua <= 15) || (!trang_thai.includes('NEW') && !trang_thai.includes('LOSE'))) {
            return String(du_lieu.date_start).substring(0, 16);
        }
        return null;
    }).filter(Boolean);

    return res.status(200).json({ danh_sach_dich_vu, danh_sach_ktv, danh_sach_lich_ban });
  } catch (loi) {
    return res.status(500).json({ loi: "Lỗi hệ thống" });
  }
};

// 2. API POST: Chốt lịch hẹn
const chotLichHen = async (req, res) => {
    try {
        const { ten_dich_vu, gia_tien, ten_ktv, ngay_dat, gio_dat, thoi_gian } = req.body;
        const url_goc = "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/";

        const tien_dat_coc = Math.round(parseInt(String(gia_tien).replace(/[^0-9]/g, '')) * 0.3);
        const du_lieu_lich = {
            "date_start": `${ngay_dat} ${gio_dat}:00`,
            "duration": parseInt(thoi_gian) * 60,
            "service_name": ten_dich_vu,
            "resources": [{ "id": "1", "title": ten_ktv }]
        };

        const phan_hoi = await axios.post(url_goc + "crm.deal.add", {
            fields: {
                TITLE: `Booking - ${ten_dich_vu}`,
                STAGE_ID: "NEW",
                OPPORTUNITY: tien_dat_coc,
                CURRENCY_ID: "VND",
                UF_CRM_1781780490460: JSON.stringify(du_lieu_lich)
            }
        });

        const id_giao_dich = phan_hoi.data.result;
        const link_qr = `https://img.vietqr.io/image/${process.env.NGAN_HANG || "MB"}-${process.env.SO_TAI_KHOAN || "0377172930"}-compact2.png?amount=${tien_dat_coc}&addInfo=${encodeURIComponent(`LOTUSGLOW DH${id_giao_dich}`)}&accountName=${encodeURIComponent("DINH VAN MANH")}`;

        return res.status(200).json({ thanh_cong: true, id_giao_dich, link_qr });
    } catch (loi) {
        return res.status(500).json({ loi: "Lỗi hệ thống" });
    }
};

// 3. API POST: Xác nhận thanh toán (Đối soát OCR -> Xuất Invoice SPA -> Confirm Deal)
const xacNhanThanhToan = async (req, res) => {
    try {
        const { id_giao_dich } = req.body;
        const url_goc = "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/";

        console.log(`[Xác nhận] Bắt đầu đối soát cho Deal ID: ${id_giao_dich}`);

        if (!id_giao_dich) return res.status(400).json({ loi: "Thiếu ID giao dịch" });

        const deal_res = await axios.get(`${url_goc}crm.deal.get?id=${id_giao_dich}`);
        const deal = deal_res.data.result;
        if (!deal) return res.status(404).json({ loi: "Không tìm thấy Deal." });

        const snapshot = await db.collection('transactions').where('bookingId', 'in', [String(id_giao_dich), Number(id_giao_dich)]).get();
        if (snapshot.empty) return res.status(200).json({ thanh_cong: false, loi: "Không tìm thấy dữ liệu biên lai AI." });

        const docs = snapshot.docs.sort((a,b) => (b.data().createdAt?.toMillis() || 0) - (a.data().createdAt?.toMillis() || 0));
        const transactionDoc = docs[0];
        const ocr = transactionDoc.data().ocrData || {};

        // --- ĐỐI SOÁT ---
        const khop_nguoi_nhan = removeAccents(ocr.detectedRecipient || "").toUpperCase().includes("DINH VAN MANH");
        const khop_so_tien = Math.abs(parseInt(ocr.detectedAmount) - parseInt(deal.OPPORTUNITY)) < 100;
        const khop_noi_dung = String(ocr.detectedContent || "").toUpperCase().includes(`DH${id_giao_dich}`);

        let khop_thoi_gian = false;
        const gio_ck = parseDateOCR(ocr.detectedTransferDate);
        if (gio_ck) {
            const diff_phut = Math.abs(Date.now() - gio_ck.getTime()) / 60000;
            console.log(`[Xác nhận] Độ lệch thời gian: ${diff_phut.toFixed(2)} phút`);
            // YÊU CẦU: Trong vòng 10 phút
            if (diff_phut <= 10.5) khop_thoi_gian = true;
        }

        if (!khop_nguoi_nhan || !khop_so_tien || !khop_noi_dung || !khop_thoi_gian) {
            let detail = "Biên lai không hợp lệ: ";
            if (!khop_nguoi_nhan) detail += "Sai người nhận. ";
            if (!khop_so_tien) detail += `Số tiền sai (OCR: ${ocr.detectedAmount}đ). `;
            if (!khop_noi_dung) detail += "Nội dung sai mã đơn. ";
            if (!khop_thoi_gian) detail += "Thời gian chuyển khoản quá 10 phút hoặc không khớp. ";

            return res.status(200).json({ thanh_cong: false, loi: detail });
        }

        // --- CẬP NHẬT BITRIX24 ---
        try {
            // A. TẠO HÓA ĐƠN TRONG SPA (Entity Type 31 - Như trong hình ảnh của bạn)
            await axios.post(`${url_goc}crm.item.add?entityTypeId=31`, {
                fields: {
                    title: `Hóa đơn cọc - DH${id_giao_dich}`,
                    opportunity: deal.OPPORTUNITY,
                    currencyId: "VND",
                    parentId2: id_giao_dich, // Liên kết hóa đơn với Deal này (Entity Type 2 là Deal)
                    opened: "Y"
                }
            }).catch(e => console.error("Lỗi tạo SPA Invoice:", e.response?.data || e.message));

            // B. Chuyển trạng thái Deal sang PREPARATION (Đã xác nhận)
            await axios.post(`${url_goc}crm.deal.update`, {
                id: id_giao_dich,
                fields: { STAGE_ID: "PREPARATION" }
            });

            // C. Cập nhật Firestore
            await transactionDoc.ref.update({
                ocrStatus: 'verified',
                bitrixStatus: 'confirmed',
                verifiedAt: new Date()
            });

            return res.status(200).json({ thanh_cong: true });
        } catch (err) {
            console.error("Lỗi cập nhật Bitrix24:", err.message);
            return res.status(500).json({ loi: "Lỗi Bitrix24: " + err.message });
        }
    } catch (loi) {
        console.error("Lỗi server xacNhanThanhToan:", loi);
        return res.status(500).json({ loi: "Lỗi hệ thống: " + loi.message });
    }
};

const giuChoVaTaoQR = (req, res) => res.status(404).json({ thong_bao: "Dùng /api/chot-lich-hen" });

module.exports = { layThongTinDatLich, chotLichHen, xacNhanThanhToan, giuChoVaTaoQR };
