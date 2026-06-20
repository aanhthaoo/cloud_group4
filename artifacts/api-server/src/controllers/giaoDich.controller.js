const axios = require('axios');
require('dotenv').config();

// 1. API GET: Lấy thông tin dịch vụ, KTV và trích xuất danh sách Lịch Bận (Soft-hold 15p)
const layThongTinDatLich = async (req, res) => {
  try {
    const url_goc = "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/";

    // Gọi song song 3 API để tối ưu tốc độ
    const [phan_hoi_dat_lich, phan_hoi_san_pham, phan_hoi_deal] = await Promise.all([
        axios.get(url_goc + "crm.deal.fields"),
        axios.get(url_goc + "crm.product.list"),
        axios.post(url_goc + "crm.deal.list", {
            SELECT: ["ID", "STAGE_ID", "DATE_CREATE", "UF_CRM_1781780490460"]
        })
    ]);

    const truong_dat_lich = phan_hoi_dat_lich.data.result['UF_CRM_1781780490460'];
    if (!truong_dat_lich) throw new Error("Không tìm thấy trường cấu hình");

    let cai_dat = truong_dat_lich.settings || truong_dat_lich.SETTINGS || {};
    if (typeof cai_dat === 'string') cai_dat = JSON.parse(cai_dat);

    const mang_dich_vu_bitrix = cai_dat.SERVICE_LIST || [];
    const mang_ktv_bitrix = cai_dat.SELECTED_RESOURCES || [];
    const kho_san_pham = phan_hoi_san_pham.data.result || [];

    // --- BÓC TÁCH DỊCH VỤ ---
    const tu_dien_icon = {
        "Massage thư giãn": "Flower2",
        "Chăm sóc da mặt": "Sparkles",
        "Nails & Pedicure": "Droplets",
        "Waxing": "Scissors",
        "Gói cô dâu": "Heart"
    };

    const danh_sach_dich_vu = mang_dich_vu_bitrix.map((dv, vi_tri) => {
        const ten_dv = dv.name.trim();
        const san_pham_khop = kho_san_pham.find(sp => sp.NAME.trim() === ten_dv);
        const mo_ta_goc = san_pham_khop ? san_pham_khop.DESCRIPTION : "Trải nghiệm dịch vụ đẳng cấp";
        return {
            id: vi_tri + 1,
            ten: ten_dv,
            thoi_gian: dv.duration,
            gia: san_pham_khop ? Math.round(parseFloat(san_pham_khop.PRICE)) : 0,
            mo_ta: mo_ta_goc.replace(/&nbsp;/g, ' '),
            icon: tu_dien_icon[ten_dv] || "CheckCircle2"
        };
    });

    const tu_dien_ktv = {
        "Thảo Anh": { vai_tro: "Massage chuyên sâu", danh_gia: "4.9" },
        "Ngọc Anh": { vai_tro: "Chăm sóc da liễu", danh_gia: "4.8" },
        "Trang Anh": { vai_tro: "Nghệ thuật Nails", danh_gia: "4.7" },
        "Vân Anh": { vai_tro: "Waxing & Body", danh_gia: "4.9" },
        "Diệu Anh": { vai_tro: "Chuyên viên cao cấp", danh_gia: "5.0" }
    };

    const danh_sach_ktv = mang_ktv_bitrix.map(ktv => {
        const ten_ktv = (ktv.title || ktv.NAME).trim();
        const thong_tin_them = tu_dien_ktv[ten_ktv] || { vai_tro: "Chuyên viên Salon", danh_gia: "5.0" };
        return {
            id: ktv.id,
            ten: ktv.title || ktv.NAME,
            vai_tro: thong_tin_them.vai_tro,
            danh_gia: thong_tin_them.danh_gia
        };
    });

    // --- LOGIC SOFT-HOLD 15P: TRÍCH XUẤT LỊCH BẬN ---
    const danh_sach_deal = phan_hoi_deal.data.result || [];
    const thoi_gian_hien_tai = new Date().getTime();
    const danh_sach_lich_ban = [];

    danh_sach_deal.forEach(deal => {
        if (!deal.UF_CRM_1781780490460) return;
        try {
            const du_lieu = typeof deal.UF_CRM_1781780490460 === 'string' ? JSON.parse(deal.UF_CRM_1781780490460) : deal.UF_CRM_1781780490460;
            if (!du_lieu || !du_lieu.date_start) return;

            const thoi_gian_tao = new Date(deal.DATE_CREATE).getTime();
            const so_phut_da_qua = (thoi_gian_hien_tai - thoi_gian_tao) / (1000 * 60);
            const trang_thai = String(deal.STAGE_ID).toUpperCase();

            // Điều kiện: Đang giữ chỗ dưới 15p (NEW) HOẶC đã xác nhận (Không phải LOSE/APOLOGY/NEW)
            const giu_cho_moi = trang_thai.includes('NEW') && so_phut_da_qua <= 15;
            const da_xac_nhan = !trang_thai.includes('NEW') && !trang_thai.includes('LOSE') && !trang_thai.includes('APOLOGY');

            if (giu_cho_moi || da_xac_nhan) {
                // Ép kiểu chuỗi, cắt đúng 16 ký tự: "20/06/2026 19:30"
                const ngay_gio_ban = String(du_lieu.date_start).substring(0, 16);
                danh_sach_lich_ban.push(ngay_gio_ban);
            }
        } catch (e) { console.error("Lỗi parse deal:", e.message); }
    });

    return res.status(200).json({ danh_sach_dich_vu, danh_sach_ktv, danh_sach_lich_ban });
  } catch (loi) {
    console.error("LỖI KHỚP LỆNH:", loi.message);
    return res.status(500).json({ loi: "Lỗi hệ thống" });
  }
};

// 2. API POST: Chốt lịch hẹn (Sử dụng OPPORTUNITY kiểu Number sạch và tính 30% cọc)
const chotLichHen = async (req, res) => {
    try {
        const { ten_dich_vu, gia_tien, ten_ktv, ngay_dat, gio_dat, thoi_gian } = req.body;
        const url_goc = "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/";

        // 1. TÍNH TOÁN 30% TIỀN CỌC
        const chuoi_so_sach = String(gia_tien).replace(/[^0-9]/g, '');
        const gia_goc = parseInt(chuoi_so_sach, 10);
        const tien_dat_coc = Math.round(gia_goc * 0.3); // Tính 30% giá gốc

        const du_lieu_lich = {
            "date_start": `${ngay_dat} ${gio_dat}:00`,
            "duration": parseInt(thoi_gian) * 60,
            "service_name": ten_dich_vu,
            "resources": [{ "id": "1", "title": ten_ktv }]
        };

        // 2. TẠO DEAL TRÊN BITRIX24 VỚI GIÁ ĐẶT CỌC
        const phan_hoi = await axios.post(url_goc + "crm.deal.add", {
            fields: {
                TITLE: `Booking - ${ten_dich_vu}`,
                STAGE_ID: "NEW", // Soft-hold
                OPPORTUNITY: tien_dat_coc, // LƯU GIÁ 30% LÊN BITRIX24
                CURRENCY_ID: "VND",
                UF_CRM_1781780490460: JSON.stringify(du_lieu_lich)
            }
        });

        const id_giao_dich = phan_hoi.data.result;

        // 3. TẠO LINK VIETQR VỚI ĐÚNG SỐ TIỀN CỌC
        const ma_ngan_hang = process.env.NGAN_HANG || "MB";
        const so_tai_khoan = process.env.SO_TAI_KHOAN || "0377172930";
        const ten_tai_khoan = encodeURIComponent(process.env.TEN_TAI_KHOAN || "SPA LOTUSGLOW");
        const noi_dung_ck = encodeURIComponent(`LOTUSGLOW DH${id_giao_dich}`);

        // Nhúng tien_dat_coc vào URL của VietQR
        const link_qr_dong = `https://img.vietqr.io/image/${ma_ngan_hang}-${so_tai_khoan}-compact2.png?amount=${tien_dat_coc}&addInfo=${noi_dung_ck}&accountName=${ten_tai_khoan}`;

        return res.status(200).json({ thanh_cong: true, id_giao_dich, link_qr: link_qr_dong });
    } catch (loi) {
        console.error("Lỗi tạo lịch hẹn:", loi);
        return res.status(500).json({ loi: "Lỗi hệ thống" });
    }
};

// 3. API POST: Xác nhận thanh toán (Cập nhật STAGE_ID của Deal)
const xacNhanThanhToan = async (req, res) => {
    try {
        const { id_giao_dich } = req.body;
        const url_goc = "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/";

        if (!id_giao_dich) {
            return res.status(400).json({ loi: "Thiếu ID giao dịch" });
        }

        // Gọi API cập nhật trạng thái của Deal trên Bitrix24 sang "PREPARATION" (Đã xác nhận)
        await axios.post(url_goc + "crm.deal.update", {
            id: id_giao_dich,
            fields: {
                STAGE_ID: "PREPARATION"
            }
        });

        return res.status(200).json({ thanh_cong: true });
    } catch (loi) {
        console.error("Lỗi cập nhật Bitrix24:", loi.message);
        return res.status(500).json({ loi: "Lỗi hệ thống khi cập nhật trạng thái" });
    }
};

const giuChoVaTaoQR = async (req, res) => {
  return res.status(404).json({ thong_bao: "Vui lòng sử dụng /api/chot-lich-hen" });
};

module.exports = { layThongTinDatLich, chotLichHen, xacNhanThanhToan, giuChoVaTaoQR };
