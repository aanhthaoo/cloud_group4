import React from "react";
import { Card } from "@/components/ui/card";
import BookingStep1 from "@/components/Booking/BookingStep1";
import BookingStep2 from "@/components/Booking/BookingStep2";

export default function Booking() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Đặt Lịch Hẹn</h1>
          <p className="text-muted-foreground">Khung đặt lịch đang chờ tích hợp API thực tế.</p>
        </div>

        <Card className="p-6 md:p-8 space-y-6">
          <BookingStep1 />
          <BookingStep2 />
        </Card>
      </div>
    </div>
  );
}
