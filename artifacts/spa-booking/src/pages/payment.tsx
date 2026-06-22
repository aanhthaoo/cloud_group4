import React from "react";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";

/**
 * Trang /payment không còn được sử dụng.
 * Luồng thanh toán (upload biên lai R2, reCAPTCHA, OCR) đã được
 * tích hợp trực tiếp vào BookingStep1 (/booking).
 */
export default function Payment() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center px-4">
      <Card className="p-8 max-w-md text-center space-y-3">
        <Info className="w-10 h-10 text-primary mx-auto" />
        <h2 className="text-xl font-semibold text-foreground">Trang này đã được tích hợp</h2>
        <p className="text-sm text-muted-foreground">
          Luồng thanh toán đặt cọc đã được gộp vào trang đặt lịch.
          Vui lòng truy cập <strong>/booking</strong> để bắt đầu.
        </p>
      </Card>
    </div>
  );
}