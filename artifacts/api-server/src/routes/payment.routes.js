const express = require('express');
const { verifyReceipt } = require('../controllers/payment.controller');

const router = express.Router();

router.post('/verify-receipt', verifyReceipt);

module.exports = router;
