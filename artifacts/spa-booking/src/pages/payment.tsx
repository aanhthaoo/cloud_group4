import React from "react";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Trang /payment không còn được sử dụng.
 * Luồng thanh toán (upload biên lai R2, reCAPTCHA, OCR) đã được
 * tích hợp trực tiếp vào BookingStep1 (/booking).
 */
export default function Payment() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <Info className="w-12 h-12 text-blue-500 mx-auto" />
        <h1 className="text-2xl font-serif font-bold text-foreground">Trang không còn sử dụng</h1>
        <p className="text-muted-foreground">
          Luồng thanh toán đã được chuyển sang trang đặt lịch trực tiếp.
        </p>
        <button 
          onClick={() => setLocation("/booking")}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Đến trang Đặt lịch
        </button>
      </Card>
    </div>
  );
}