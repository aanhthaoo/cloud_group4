const axios = require('axios');
require('dotenv').config();

// 1. API GET: Lấy thông tin dịch vụ và KTV động từ Bitrix24
const layThongTinDatLich = async (req, res) => {
  try {
    const url_goc = "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/";
    const [phan_hoi_dat_lich, phan_hoi_san_pham] = await Promise.all([
        axios.get(url_goc + "crm.deal.fields"),
        axios.get(url_goc + "crm.product.list")
    ]);

    const truong_dat_lich = phan_hoi_dat_lich.data.result['UF_CRM_1781780490460'];
    if (!truong_dat_lich) throw new Error("Không tìm thấy trường cấu hình");

    let cai_dat = truong_dat_lich.settings || truong_dat_lich.SETTINGS || {};
    if (typeof cai_dat === 'string') cai_dat = JSON.parse(cai_dat);

    const mang_dich_vu_bitrix = cai_dat.SERVICE_LIST || [];
    const mang_ktv_bitrix = cai_dat.SELECTED_RESOURCES || [];
    const kho_san_pham = phan_hoi_san_pham.data.result || [];

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
            gia: san_pham_khop ? san_pham_khop.PRICE : "0",
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
            ten: ten_ktv,
            vai_tro: thong_tin_them.vai_tro,
            danh_gia: thong_tin_them.danh_gia
        };
    });

    return res.status(200).json({ danh_sach_dich_vu, danh_sach_ktv });
  } catch (loi) {
    console.error("LỖI KHỚP LỆNH:", loi.message);
    return res.status(500).json({ loi: "Lỗi hệ thống" });
  }
};

// 2. API POST: Chốt lịch hẹn và sinh mã VietQR
const chotLichHen = async (req, res) => {
    try {
        const { ten_dich_vu, gia_tien, ten_ktv, ngay_dat, gio_dat, thoi_gian } = req.body;
        const url_goc = "https://b24-krzt7r.bitrix24.vn/rest/1/t022sbp9vx9u578s/";

        // XỬ LÝ GIÁ TIỀN CHUẨN: Ép về kiểu số nguyên, loại bỏ hoàn toàn phần thập phân dư thừa
        const gia_tien_sach = gia_tien ? gia_tien.toString().replace(/[^0-9]/g, '') : "0";
        const so_tien_sach = Math.round(parseFloat(gia_tien_sach));

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
                OPPORTUNITY: so_tien_sach,
                CURRENCY_ID: "VND",
                UF_CRM_1781780490460: JSON.stringify(du_lieu_lich)
            }
        });

        const id_giao_dich = phan_hoi.data.result;

        const ma_ngan_hang = process.env.NGAN_HANG || "MB";
        const so_tai_khoan = process.env.SO_TAI_KHOAN || "0377172930";
        const ten_tai_khoan = encodeURIComponent(process.env.TEN_TAI_KHOAN || "SPA LOTUSGLOW");

        const link_qr_dong = `https://img.vietqr.io/image/${ma_ngan_hang}-${so_tai_khoan}-print.png?amount=${so_tien_sach}&addInfo=LOTUSGLOW DH${id_giao_dich}&accountName=${ten_tai_khoan}`;

        return res.status(200).json({ thanh_cong: true, id_giao_dich, link_qr: link_qr_dong });
    } catch (loi) {
        console.error("LỖI CHỐT LỊCH HẸN:", loi.message);
        return res.status(500).json({ loi: "Lỗi hệ thống" });
    }
};

const giuChoVaTaoQR = async (req, res) => {
  return res.status(404).json({ thong_bao: "Vui lòng sử dụng /api/chot-lich-hen" });
};

module.exports = {
    layThongTinDatLich,
    chotLichHen,
    giuChoVaTaoQR
};
