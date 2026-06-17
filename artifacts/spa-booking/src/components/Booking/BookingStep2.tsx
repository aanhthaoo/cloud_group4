import React from "react";
import { Card } from "@/components/ui/card";
export default function BookingStep2(_tham_so_dat_lich: any) {
  return (
    <Card className="p-6" data-testid="khung-buoc-2-dat-lich">
      <h3 className="text-lg font-semibold text-foreground mb-2">Bước 2: Chọn ngày và khung giờ</h3>
      <p className="text-sm text-muted-foreground">Đang chờ tích hợp API để tải lịch trống và xác nhận giữ chỗ theo thời gian thực.</p>
    </Card>
  );
}
