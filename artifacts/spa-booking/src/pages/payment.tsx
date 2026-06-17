import React from "react";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function Payment() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-serif font-bold text-center text-foreground mb-4">Thanh toán đặt cọc</h1>

        <Card className="p-6 flex items-center gap-3" data-testid="khung-thanh-toan">
          <Clock className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            Đang chờ tích hợp API thanh toán để hiển thị hóa đơn, thông tin chuyển khoản và xác nhận biên lai.
          </p>
        </Card>
      </div>
    </div>
  );
}
