class Technician {
  constructor({
    technicianId,
    fullName,
    avatarUrl,
    rating,
    skills = []
  }) {
    this.technicianId = technicianId;
    this.fullName = fullName;
    this.avatarUrl = avatarUrl;
    this.rating = rating;     // Đánh giá trung bình (số)
    this.skills = skills;     // Mảng chứa các serviceId
  }

  toFirestore() {
    const obj = {
      technicianId: this.technicianId,
      fullName: this.fullName,
      avatarUrl: this.avatarUrl,
      rating: this.rating,
      skills: this.skills
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

module.exports = Technician;
