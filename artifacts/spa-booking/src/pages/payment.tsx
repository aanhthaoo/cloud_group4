import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Check, Clock, AlertTriangle } from "lucide-react";

const HOLD_SECONDS = 15 * 60;

export default function Payment() {
  const [, setLocation] = useLocation();
  const [isChecked, setIsChecked] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(HOLD_SECONDS);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (expired) return;
    if (timeLeft <= 0) { setExpired(true); return; }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); setExpired(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [expired]);

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");
  const isUrgent = timeLeft <= 120 && !expired;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleConfirm = () => {
    const handleConfirm = async () => {
  try {
    if (!isChecked) {
      alert("Vui lòng xác nhận Tôi không phải robot");
      return;
    }

    const pendingBooking = JSON.parse(
      localStorage.getItem("pending_booking") || "{}"
    );

    if (!pendingBooking?.bookingId) {
      alert("Không tìm thấy lịch hẹn tạm thời. Vui lòng đặt lịch lại.");
      setLocation("/booking");
      return;
    }

    setIsSubmitting(true);

    await api.post(`/api/bookings/${pendingBooking.bookingId}/confirm-payment`, {
      receiptFileName: file?.name || "no_receipt_uploaded.jpg",
    });

    localStorage.removeItem("pending_booking");

    setLocation("/booking-status");
  } catch (error: any) {
    alert(
      error?.response?.data?.message ||
        "Xác nhận thanh toán thất bại. Vui lòng thử lại."
    );
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-serif font-bold text-center text-foreground mb-4">Thanh toán đặt cọc</h1>

        {/* Countdown */}
        <div
          data-testid="countdown-timer"
          className={`flex items-center justify-center gap-3 rounded-xl px-6 py-4 mb-8 border transition-colors ${
            expired ? "bg-red-50 border-red-200"
              : isUrgent ? "bg-orange-50 border-orange-300 animate-pulse"
              : "bg-primary/10 border-primary/20"
          }`}
        >
          <Clock className={`w-5 h-5 shrink-0 ${expired ? "text-red-500" : isUrgent ? "text-orange-500" : "text-primary"}`} />
          {expired ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-red-600 font-semibold text-sm leading-tight">
                Thời gian giữ chỗ đã hết, hệ thống đã giải phóng lịch hẹn. Vui lòng đặt lại.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isUrgent ? "text-orange-700" : "text-foreground"}`}>Khóa tạm thời lịch hẹn:</span>
              <span className={`text-2xl font-mono font-bold tabular-nums ${isUrgent ? "text-orange-600" : "text-primary"}`}>
                {minutes}:{seconds}
              </span>
              <span className={`text-sm ${isUrgent ? "text-orange-600" : "text-muted-foreground"}`}>phút</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 border-b pb-2">Hóa đơn tạm tính</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Dịch vụ</span><span className="font-medium">Massage thư giãn</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Kỹ thuật viên</span><span className="font-medium">Thư Ngân</span></div>
                <div className="flex justify-between border-b pb-3"><span className="text-muted-foreground">Ngày & Giờ</span><span className="font-medium">10:30 • Hôm nay</span></div>
                <div className="flex justify-between font-medium"><span>Tổng cộng</span><span>450,000đ</span></div>
                <div className="flex justify-between font-medium text-primary text-base pt-2"><span>Đặt cọc (30%)</span><span>135,000đ</span></div>
                <div className="flex justify-between text-muted-foreground text-xs"><span>Còn lại thanh toán tại Spa</span><span>315,000đ</span></div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Thông tin chuyển khoản</h3>
              <div className="flex flex-col items-center mb-4">
                <div className="w-44 h-44 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border text-center p-4 text-muted-foreground text-sm">
                  Mã QR chuyển khoản
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Ngân hàng:</span><span className="font-medium">Vietcombank (VCB)</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tên tài khoản:</span><span className="font-medium">LOTUS GLOW SPA</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Số tài khoản:</span><span className="font-medium text-primary">1234567890</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Nội dung:</span><span className="font-medium">[Tên khách][Ngày]</span></div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Tải lên biên lai</h3>
              <p className="text-sm text-muted-foreground mb-4">Vui lòng tải lên ảnh chụp màn hình chuyển khoản thành công.</p>
              <label className="border-2 border-dashed border-primary/30 bg-primary/5 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors">
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} data-testid="input-receipt-upload" />
                {file ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3"><Check className="w-6 h-6" /></div>
                    <span className="text-sm font-medium text-foreground">{file.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">Nhấn để tải lại ảnh khác</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-white text-primary rounded-full shadow-sm flex items-center justify-center mb-3"><Upload className="w-6 h-6" /></div>
                    <span className="text-sm font-medium text-primary">Kéo thả hoặc Nhấn để tải ảnh lên</span>
                    <span className="text-xs text-muted-foreground mt-1">PNG, JPG tối đa 5MB</span>
                  </div>
                )}
              </label>
            </Card>

            <div className="bg-white border rounded-md p-4 flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded border flex items-center justify-center cursor-pointer ${isChecked ? "bg-primary border-primary text-white" : "border-input hover:border-primary"}`}
                onClick={() => setIsChecked(!isChecked)}
                data-testid="checkbox-not-robot"
              >
                {isChecked && <Check className="w-4 h-4" />}
              </div>
              <span className="text-sm text-foreground select-none cursor-pointer" onClick={() => setIsChecked(!isChecked)}>
                Tôi không phải robot
              </span>
            </div>

            <Button
              disabled={!isChecked || expired || isSubmitting}
              onClick={handleConfirm}
              data-testid="button-confirm-payment"
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận chốt lịch"}
            </Button>
            {expired && (
              <p className="text-red-600 text-sm font-medium text-center flex items-center justify-center gap-1">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Phiên giữ chỗ đã hết hạn. Vui lòng quay lại đặt lịch mới.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
}