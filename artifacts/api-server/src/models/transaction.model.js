class Transaction {
  constructor({
    transactionId,
    bookingId,
    userId,
    amountPaid,
    receiptImageUrl,
    bitrixInvoiceId,
    createdAt = new Date(),
    ocrStatus,
    ocrData = {}
  }) {
    this.transactionId = transactionId;
    this.bookingId = bookingId;
    this.userId = userId;
    this.amountPaid = amountPaid;
    this.receiptImageUrl = receiptImageUrl;
    this.bitrixInvoiceId = bitrixInvoiceId;
    this.createdAt = createdAt; // Thời gian tạo
    this.ocrStatus = ocrStatus; // 'processing', 'verified', 'failed'
    
    // Dữ liệu đối soát OCR
    this.ocrData = {
      detectedAmount: ocrData.detectedAmount,
      detectedContent: ocrData.detectedContent,
      detectedRecipient: ocrData.detectedRecipient,
      detectedTransferDate: ocrData.detectedTransferDate
    };
  }

  toFirestore() {
    const obj = {
      transactionId: this.transactionId,
      bookingId: this.bookingId,
      userId: this.userId,
      amountPaid: this.amountPaid,
      receiptImageUrl: this.receiptImageUrl,
      bitrixInvoiceId: this.bitrixInvoiceId,
      createdAt: this.createdAt,
      ocrStatus: this.ocrStatus,
      ocrData: this.ocrData
    };

    // Loại bỏ các trường undefined
    Object.keys(obj).forEach(key => {
      if (obj[key] === undefined) {
        delete obj[key];
      }
    });

    if (obj.ocrData) {
      Object.keys(obj.ocrData).forEach(k => obj.ocrData[k] === undefined && delete obj.ocrData[k]);
    }

    return obj;
  }
}

module.exports = Transaction;
