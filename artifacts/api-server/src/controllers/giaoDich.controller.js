const axios = require('axios');
require('dotenv').config();

// Hàm xử lý giữ chỗ tạm thời và tạo mã QR thanh toán
const giuChoVaTaoQR = async (req, res) => {
  try {
    const { thong_tin_khach, ten_dich_vu, ten_ky_thuat_vien } = req.body;
    const ma_don_hang = `SPA-${Date.now()}`;
    const so_tien_coc = 300000;

    const url_bitrix = process.env.BITRIX24_WEBHOOK_URL + "crm.deal.add";
    await axios.post(url_bitrix, {
      fields: {
        TITLE: `Đặt lịch: ${ten_dich_vu} - ${thong_tin_khach}`,
        OPPORTUNITY: so_tien_coc,
        CURRENCY_ID: "VND",
        STAGE_ID: "NEW",
        COMMENTS: `Khách hàng: ${thong_tin_khach}, Dịch vụ: ${ten_dich_vu}, Kỹ thuật viên: ${ten_ky_thuat_vien}, Mã đơn: ${ma_don_hang}`
      }
    });

    const payload_vietqr = {
      accountNo: process.env.VIETQR_ACCOUNT_NO,
      accountName: process.env.VIETQR_ACCOUNT_NAME,
      acqId: process.env.VIETQR_ACQ_ID,
      amount: so_tien_coc,
      addInfo: ma_don_hang,
      template: "compact"
    };

    const response_vietqr = await axios.post("https://api.vietqr.io/v2/generate", payload_vietqr);
    const link_anh_qr = response_vietqr.data?.data?.qrDataURL || response_vietqr.data?.data?.qrCode;

    return res.status(200).json({
      thong_bao: "Giữ chỗ tạm thời thành công.",
      ma_don_hang: ma_don_hang,
      link_anh_qr: link_anh_qr
    });
  } catch (error) {
    return res.status(500).json({ thong_bao: "Lỗi xử lý.", error: error.message });
  }
};

// Hàm lấy dữ liệu dịch vụ và nhân viên động từ Bitrix24 - KHỚP LỆNH SẢN PHẨM & KTV
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

    // Danh sách Icon chuẩn Lucide
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

        return {
            id: vi_tri + 1,
            ten: ten_dv,
            thoi_gian: dv.duration,
            gia: san_pham_khop ? san_pham_khop.PRICE : "0",
            mo_ta: san_pham_khop ? san_pham_khop.DESCRIPTION : "Trải nghiệm dịch vụ đẳng cấp tại LotusGlow",
            icon: tu_dien_icon[ten_dv] || "CheckCircle2"
        };
    });

    // Từ điển thông tin bổ sung KTV
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
    return res.status(500).json({ loi: "Lỗi hệ thống", chi_tiet: loi.message });
  }
};

module.exports = {
  giuChoVaTaoQR,
  layThongTinDatLich
};
