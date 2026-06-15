class Service {
  constructor({
    serviceId,
    name,
    description,
    duration,
    price,
    imageUrl,
    isActive = true
  }) {
    this.serviceId = serviceId;
    this.name = name;
    this.description = description;
    this.duration = duration; // Thời lượng dịch vụ (phút)
    this.price = price;       // Giá dịch vụ (số)
    this.imageUrl = imageUrl;
    this.isActive = isActive; // Trạng thái hoạt động
  }

  toFirestore() {
    const obj = {
      serviceId: this.serviceId,
      name: this.name,
      description: this.description,
      duration: this.duration,
      price: this.price,
      imageUrl: this.imageUrl,
      isActive: this.isActive
    };

    // Loại bỏ các trường undefined
    Object.keys(obj).forEach(key => {
      if (obj[key] === undefined) {
        delete obj[key];
      }
    });

    return obj;
  }
}

module.exports = Service;
