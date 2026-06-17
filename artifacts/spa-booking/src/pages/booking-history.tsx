import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function BookingHistory() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Lịch sử đặt hẹn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground" data-testid="khung-lich-su-dat-hen">
              Đang chờ tích hợp API để hiển thị lịch hẹn sắp tới và lịch sử dịch vụ.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
