const { admin, db } = require('../config/firebase');
const User = require('../models/user.model');

// Thời gian sống của session cookie (ví dụ 5 ngày)
const expiresIn = 1000 * 60 * 60 * 24 * 5;

const register = async (req, res) => {
  try {
    const { email, password, fullName, phoneNumber } = req.body;

    // Chuẩn hóa số điện thoại về định dạng E.164 (VD: +84912345678)
    let formattedPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+84' + formattedPhone.slice(1);
    } else if (formattedPhone && !formattedPhone.startsWith('+') && !formattedPhone.startsWith('84')) {
      formattedPhone = '+84' + formattedPhone;
    } else if (formattedPhone && formattedPhone.startsWith('84')) {
      formattedPhone = '+' + formattedPhone;
    }

    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Thiếu FIREBASE_API_KEY trong biến môi trường (.env)' 
      });
    }

    // 1. Tạo user trên Firebase Auth thông qua REST API (tránh lỗi permission của admin SDK)
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMsg = data.error?.message || 'Đăng ký thất bại';
      if (errorMsg === 'EMAIL_EXISTS') errorMsg = 'Email này đã được sử dụng';
      if (errorMsg === 'WEAK_PASSWORD') errorMsg = 'Mật khẩu quá yếu';
      throw new Error(errorMsg);
    }

    const uid = data.localId;

    // 2. Tự động tạo thẻ thành viên (loyalty) thông qua User Model
    const newUser = new User({
      uid: uid,
      email: email,
      fullName: fullName,
      phoneNumber: phoneNumber, // Ở Firestore có thể giữ nguyên SĐT gốc cho dễ đọc
      // passwordHash không cần lưu khi dùng Firebase Auth
    });

    // 3. Lưu thông tin người dùng cùng thẻ thành viên vào Firestore
    await db.collection('users').doc(uid).set(newUser.toFirestore());

    res.status(201).json({
      status: 'success',
      message: 'Đăng ký thành công. Thẻ thành viên đã được tạo tự động.',
      data: newUser.toFirestore()
    });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(400).json({ status: 'error', message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Vui lòng cung cấp email và password' });
    }

    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Thiếu FIREBASE_API_KEY trong biến môi trường (.env)' 
      });
    }

    // Sử dụng REST API của Firebase để login bằng email/password
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Đăng nhập thất bại');
    }

    const idToken = data.idToken;
    const uid = data.localId;
    
    // Bỏ qua bước tạo session cookie ở server vì nó yêu cầu quyền Admin IAM
    // Frontend hiện tại dựa trên localStorage để duy trì trạng thái đăng nhập

    // Lấy thông tin user từ Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : { email, uid };

    res.status(200).json({
      status: 'success',
      message: 'Đăng nhập thành công',
      data: userData
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    
    // Xử lý một số mã lỗi phổ biến từ Firebase
    let errorMsg = error.message;
    if (errorMsg === 'INVALID_LOGIN_CREDENTIALS' || errorMsg === 'INVALID_PASSWORD' || errorMsg === 'EMAIL_NOT_FOUND') {
      errorMsg = 'Email hoặc mật khẩu không đúng';
    }
    
    res.status(401).json({ status: 'error', message: 'Đăng nhập thất bại: ' + errorMsg });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie('session');
    // Bỏ qua admin.auth().revokeRefreshTokens vì yêu cầu quyền Admin IAM

    res.status(200).json({ status: 'success', message: 'Đăng xuất thành công' });
  } catch (error) {
    console.error('Lỗi đăng xuất:', error);
    // Vẫn clear cookie dù có lỗi verify
    res.clearCookie('session');
    res.status(200).json({ status: 'success', message: 'Đăng xuất cục bộ thành công' });
  }
};

module.exports = {
  register,
  login,
  logout
};
