import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function BookingStatus() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-secondary/30 to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardContent className="pt-10 pb-10 flex flex-col items-center text-center gap-6 px-8">
          <div
            className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
            data-testid="icon-booking-success"
          >
            <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={2} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-foreground" data-testid="text-booking-success">
              Trạng thái đặt lịch
            </h2>
            <p className="text-sm text-muted-foreground" data-testid="khung-trang-thai-dat-lich">
              Đang chờ tích hợp API để hiển thị trạng thái xử lý và mã đơn thực tế.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
