const axios = require('axios');
require('dotenv').config();

// Hàm xử lý giữ chỗ tạm thời và tạo mã QR thanh toán
const giuChoVaTaoQR = async (req, res) => {
  try {
    // Bước 1: Lấy dữ liệu từ body và khởi tạo thông tin đơn hàng
    const { thong_tin_khach, ten_dich_vu, ten_ky_thuat_vien } = req.body;

    const ma_don_hang = `SPA-${Date.now()}`;
    const so_tien_coc = 300000; // Mặc định 300k

    // Bước 2: Gọi Bitrix24 API để tạo Deal (Soft-hold)
    const url_bitrix = process.env.BITRIX24_WEBHOOK_URL + "crm.deal.add";
    await axios.post(url_bitrix, {
      fields: {
        TITLE: `Đặt lịch: ${ten_dich_vu} - ${thong_tin_khach}`,
        OPPORTUNITY: so_tien_coc,
        CURRENCY_ID: "VND",
        STAGE_ID: "NEW", // Trạng thái tạm giữ
        COMMENTS: `Khách hàng: ${thong_tin_khach}, Dịch vụ: ${ten_dich_vu}, Kỹ thuật viên: ${ten_ky_thuat_vien}, Mã đơn: ${ma_don_hang}`
      }
    });

    // Bước 3: Gọi VietQR API để sinh mã QR
    const payload_vietqr = {
      accountNo: process.env.VIETQR_ACCOUNT_NO,
      accountName: process.env.VIETQR_ACCOUNT_NAME,
      acqId: process.env.VIETQR_ACQ_ID,
      amount: so_tien_coc,
      addInfo: ma_don_hang,
      template: "compact" // Kiểu hiển thị QR rút gọn
    };

    const response_vietqr = await axios.post("https://api.vietqr.io/v2/generate", payload_vietqr);

    const link_anh_qr = response_vietqr.data?.data?.qrDataURL || response_vietqr.data?.data?.qrCode;

    // Bước 4: Trả về kết quả cho khách hàng
    return res.status(200).json({
      thong_bao: "Giữ chỗ tạm thời thành công. Vui lòng thanh toán để xác nhận.",
      ma_don_hang: ma_don_hang,
      link_anh_qr: link_anh_qr
    });

  } catch (error) {
    console.error("Lỗi xử lý giao dịch:", error.message);
    return res.status(500).json({
      thong_bao: "Có lỗi xảy ra trong quá trình xử lý.",
      error: error.message
    });
  }
};

module.exports = {
  giuChoVaTaoQR
};
