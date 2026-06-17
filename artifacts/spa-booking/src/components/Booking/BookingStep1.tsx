import React from "react";
import { Card } from "@/components/ui/card";
export default function BookingStep1(_tham_so_dat_lich: any) {
  return (
    <Card className="p-6" data-testid="khung-buoc-1-dat-lich">
      <h3 className="text-lg font-semibold text-foreground mb-2">Bước 1: Chọn dịch vụ và kỹ thuật viên</h3>
      <p className="text-sm text-muted-foreground">Đang chờ tích hợp API để tải danh sách dịch vụ và nhân sự khả dụng.</p>
    </Card>
  );
}
