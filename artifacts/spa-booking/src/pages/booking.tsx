import React from "react";
import BookingStep1 from "@/components/Booking/BookingStep1";

export default function Booking() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-serif font-bold text-gray-900 tracking-tight">Đặt Lịch Hẹn</h1>
          <div className="h-1 w-20 bg-pink-400 mx-auto rounded-full mt-4" />
        </div>

        <div className="space-y-6">
          <BookingStep1 />
        </div>
      </div>
    </div>
  );
}
