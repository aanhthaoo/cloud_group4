require('dotenv').config();
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

function resolveServiceAccountPath() {
  const credentialPath = process.env.FIREBASE_CREDENTIALS_PATH || 'service-account.json';
  const candidates = [
    path.resolve(process.cwd(), credentialPath),
    path.resolve(__dirname, '../../', credentialPath),
    path.resolve(__dirname, '../../../../', credentialPath),
  ];

  return candidates.find(candidate => fs.existsSync(candidate));
}

if (!admin.apps.length) {
  try {
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else {
      const serviceAccountPath = resolveServiceAccountPath();

      if (!serviceAccountPath) {
        console.warn('Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CREDENTIALS_PATH.');
        process.exit(1);
      }

      serviceAccount = require(serviceAccountPath);
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        ...serviceAccount,
        universe_domain: serviceAccount.universe_domain || 'googleapis.com',
      }),
      projectId: serviceAccount.project_id,
    });
    console.log('Firebase Admin SDK initialized. Project:', serviceAccount.project_id);
  } catch (error) {
    console.error('Firebase init error:', error.message);
    process.exit(1);
  }
}

const db = getFirestore('salon-booking');

module.exports = { admin, db };
