class User {
  constructor({
    uid,
    fullName,
    phoneNumber,
    email,
    passwordHash,
    bitrixContactId,
    createdAt = new Date(),
    loyalty = {}
  }) {
    this.uid = uid;
    this.fullName = fullName;
    this.phoneNumber = phoneNumber;
    this.email = email;
    this.passwordHash = passwordHash;
    this.bitrixContactId = bitrixContactId;
    this.createdAt = createdAt; // Thời gian tạo tài khoản
    
    // Thông tin thẻ thành viên
    this.loyalty = {
      tier: loyalty.tier || 'Member',
      points: loyalty.points || 0,
      lifetimePoints: loyalty.lifetimePoints || loyalty.points || 0,
      totalSpent: loyalty.totalSpent || 0,
      discountPercent: loyalty.discountPercent || 0
    };
  }

  toFirestore() {
    const obj = {
      uid: this.uid,
      fullName: this.fullName,
      phoneNumber: this.phoneNumber,
      email: this.email,
      passwordHash: this.passwordHash,
      bitrixContactId: this.bitrixContactId,
      createdAt: this.createdAt,
      loyalty: this.loyalty
    };

    // Loại bỏ các trường undefined
    Object.keys(obj).forEach(key => {
      if (obj[key] === undefined) {
        delete obj[key];
      }
    });

    // Làm sạch object loyalty nếu có trường undefined
    if (obj.loyalty) {
      Object.keys(obj.loyalty).forEach(k => obj.loyalty[k] === undefined && delete obj.loyalty[k]);
    }

    return obj;
  }
}

module.exports = User;
