import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, CalendarCheck } from "lucide-react";

type Status = "processing" | "success";

const ORDER_ID = "SPA-10293";

export default function BookingStatus() {
  const [status, setStatus] = useState<Status>("processing");

  useEffect(() => {
    const timer = setTimeout(() => setStatus("success"), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-secondary/30 to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardContent className="pt-10 pb-10 flex flex-col items-center text-center gap-6 px-8">

          {status === "processing" ? (
            <>
              {/* Spinner */}
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-primary text-xs font-semibold">OCR</span>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-serif font-bold text-foreground">
                  Đang xử lý biên lai
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-ocr-processing">
                  Hệ thống đang trích xuất dữ liệu ảnh biên lai (OCR).
                  <br />
                  Vui lòng không đóng trình duyệt...
                </p>
              </div>

              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-[progress_3s_linear_forwards]" style={{ width: "100%" }} />
              </div>
            </>
          ) : (
            <>
              {/* Success */}
              <div
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
                data-testid="icon-booking-success"
              >
                <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={2} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold text-foreground" data-testid="text-booking-success">
                  Đặt lịch thành công!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Biên lai đã được xác nhận. LotusGlow Spa sẽ liên hệ bạn sớm.
                </p>
              </div>

              <div className="w-full bg-primary/8 border border-primary/20 rounded-xl py-4 px-6 flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-widest">Mã đơn hàng</span>
                <span
                  className="text-2xl font-mono font-bold text-primary tracking-wider"
                  data-testid="text-order-id"
                >
                  {ORDER_ID}
                </span>
              </div>

              <Link href="/booking-history" className="w-full">
                <Button
                  className="w-full h-12 text-base font-medium gap-2"
                  data-testid="button-view-history"
                >
                  <CalendarCheck className="w-4 h-4" />
                  Xem lịch sử đặt hẹn
                </Button>
              </Link>

              <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Về trang chủ
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
