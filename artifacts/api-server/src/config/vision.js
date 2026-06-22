const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const vision = require('@google-cloud/vision');

// Dùng lại CÙNG một service account đang dùng cho Firebase Admin SDK.
// Project GCP (salon-499416) phải được bật "Cloud Vision API" trong
// Google Cloud Console (https://console.cloud.google.com/apis/library/vision.googleapis.com)
// và phải có billing account gắn vào project (Vision API yêu cầu billing,
// dù vẫn có free tier 1000 request/tháng).

let visionClient;

try {
  let credentials;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    const credentialPath = process.env.FIREBASE_CREDENTIALS_PATH || 'service-account.json';
    const serviceAccountPath = path.resolve(__dirname, '../../', credentialPath);

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Không tìm thấy file service account tại: ${serviceAccountPath}`);
    }
    credentials = require(serviceAccountPath);
  }

  visionClient = new vision.ImageAnnotatorClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    projectId: credentials.project_id,
  });

  console.log('✅ Đã khởi tạo thành công Google Cloud Vision client. Project:', credentials.project_id);
} catch (error) {
  console.error('❌ Lỗi khởi tạo Cloud Vision client:', error.message);
  console.error('   -> Kiểm tra: Cloud Vision API đã được Enable trong GCP Console chưa?');
  console.error('   -> Kiểm tra: project đã gắn billing account chưa?');
  throw error;
}

module.exports = { visionClient };
