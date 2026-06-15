const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { db } = require('./config/firebase'); // Gọi kết nối từ tệp cấu hình

const app = express();
app.use(cors());
app.use(express.json());

// Import các routes API
const indexRoutes = require('./routes/index.routes.js');
app.use('/', indexRoutes);

// API kiểm tra trạng thái
app.get('/api/health', async (req, res) => {
  try {
    // Thực hiện một truy vấn đọc giả lập để xác thực quyền truy cập Firestore
    const snapshot = await db.collection('system_test').limit(1).get();
    res.status(200).json({
      status: 'ok',
      message: 'Đã kết nối thành công với Google Cloud Firestore!'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Lỗi xác thực Firestore',
      error: error.message
    });
  }
});

const os = require('os');

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  // Lấy địa chỉ IP mạng nội bộ
  const interfaces = os.networkInterfaces();
  const networkIPs = [];
  Object.values(interfaces).forEach(iface => {
    iface.forEach(addr => {
      if (addr.family === 'IPv4' && !addr.internal) {
        networkIPs.push(addr.address);
      }
    });
  });

  console.log('\n  API Server ready!\n');
  console.log(`  ➜  Local:   http://localhost:${PORT}/`);
  networkIPs.forEach(ip => {
    console.log(`  ➜  Network: http://${ip}:${PORT}/`);
  });
  console.log('');
});