const express = require('express');
const router = express.Router();
const giaoDichController = require('../controllers/giaoDich.controller');

// API lấy thông tin dịch vụ và KTV động từ Bitrix24
router.get('/thong-tin-dat-lich', giaoDichController.layThongTinDatLich);

// API xử lý giữ chỗ và tạo mã VietQR (Cũ)
router.post('/dat-lich-thanh-toan', giaoDichController.giuChoVaTaoQR);

// API CHỐT LỊCH HẸN: Tạo Deal trên Bitrix24 và trả về ID giao dịch
router.post('/chot-lich-hen', giaoDichController.chotLichHen);

module.exports = router;
