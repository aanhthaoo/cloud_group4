const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { S3Client } = require('@aws-sdk/client-s3');

// 1. Chốt chặn kiểm tra biến môi trường
const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!endpoint || !accessKeyId || !secretAccessKey) {
    console.error("❌ LỖI R2: Không tìm thấy biến môi trường R2!");
    console.error(`Kiểm tra lại .env: ENDPOINT=${!!endpoint}, ACCESS_KEY=${!!accessKeyId}, SECRET=${!!secretAccessKey}`);
    // Ném lỗi ngay lập tức để ứng dụng không bị treo
    throw new Error("Dừng khởi tạo R2 do thiếu thông tin xác thực.");
}

// 2. Khởi tạo nếu đã đủ thông tin
const s3Client = new S3Client({
    region: 'auto',
    endpoint: endpoint,
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
    },
});

console.log("✅ Đã khởi tạo thành công kết nối Cloudflare R2");

module.exports = { s3Client };
