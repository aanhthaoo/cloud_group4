const express = require('express');
const router = express.Router();
const giaoDichController = require('../controllers/giaoDich.controller');

// Định nghĩa API đặt lịch và thanh toán
router.post('/dat-lich-thanh-toan', giaoDichController.giuChoVaTaoQR);

module.exports = router;
