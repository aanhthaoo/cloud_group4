class Booking {
  constructor({
    bookingId,
    userId,
    bookingDate,
    timeSlot,
    totalPrice,
    depositAmount,
    status,
    softHoldExpiresAt,
    service = {},
    technician = {}
  }) {
    this.bookingId = bookingId;
    this.userId = userId;
    this.bookingDate = bookingDate; // Timestamp ngày đặt
    this.timeSlot = timeSlot;       // Chuỗi giờ
    this.totalPrice = totalPrice;
    this.depositAmount = depositAmount;
    this.status = status;           // 'pending', 'soft-hold', 'confirmed', 'completed', 'cancelled'
    this.softHoldExpiresAt = softHoldExpiresAt; // Hạn giữ chỗ
    
    // Denormalization: Lưu thông tin dịch vụ
    this.service = {
      id: service.id,
      name: service.name,
      price: service.price
    };

    // Denormalization: Lưu thông tin kỹ thuật viên
    this.technician = {
      id: technician.id,
      name: technician.name,
      avatarUrl: technician.avatarUrl
    };
  }

  toFirestore() {
    const obj = {
      bookingId: this.bookingId,
      userId: this.userId,
      bookingDate: this.bookingDate,
      timeSlot: this.timeSlot,
      totalPrice: this.totalPrice,
      depositAmount: this.depositAmount,
      status: this.status,
      softHoldExpiresAt: this.softHoldExpiresAt,
      service: this.service,
      technician: this.technician
    };

    // Loại bỏ các trường undefined
    Object.keys(obj).forEach(key => {
      if (obj[key] === undefined) {
        delete obj[key];
      }
    });

    if (obj.service) {
      Object.keys(obj.service).forEach(k => obj.service[k] === undefined && delete obj.service[k]);
    }
    
    if (obj.technician) {
      Object.keys(obj.technician).forEach(k => obj.technician[k] === undefined && delete obj.technician[k]);
    }

    return obj;
  }
}

module.exports = Booking;
