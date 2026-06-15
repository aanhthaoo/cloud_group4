class Invoice {
  constructor(id, bookingId, userId, amount, status = 'unpaid', createdAt = new Date()) {
    this.id = id;
    this.bookingId = bookingId;
    this.userId = userId;
    this.amount = amount;
    this.status = status;
    this.createdAt = createdAt;
  }
}

module.exports = { Invoice };
