require('dotenv').config();
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

if (!admin.apps.length) {
  try {
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Ưu tiên đọc từ biến môi trường (Cloud Run Secret truyền vào)
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else {
      // Fallback đọc từ file (cho môi trường dev)
      const credentialPath = process.env.FIREBASE_CREDENTIALS_PATH || 'service-account.json';
      const serviceAccountPath = path.resolve(__dirname, '../../', credentialPath);

      if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = require(serviceAccountPath);
      } else {
        console.warn(`❌ Không tìm thấy biến môi trường FIREBASE_SERVICE_ACCOUNT_JSON hoặc file tại: ${serviceAccountPath}`);
        process.exit(1);
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        ...serviceAccount,
        // Thêm universe_domain để tránh firebase-admin gọi gcpMetadata.universe()
        // (bị lỗi do version conflict giữa firebase-admin và @google-cloud/pubsub)
        universe_domain: serviceAccount.universe_domain || 'googleapis.com',
      }),
      projectId: serviceAccount.project_id,
    });
    console.log('✅ Firebase Admin SDK initialized. Project:', serviceAccount.project_id);
  } catch (error) {
    console.error('❌ Firebase init error:', error.message);
    process.exit(1);
  }
}

// Kết nối đến named database 'salon-booking'
const db = getFirestore('salon-booking');

module.exports = { admin, db };
