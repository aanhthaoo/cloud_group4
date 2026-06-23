import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function Services() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-3">
            Dịch vụ của <span className="text-primary">LotusGlow</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto" data-testid="khung-danh-sach-dich-vu">
            Đang chờ tích hợp API để hiển thị danh sách dịch vụ và thông tin chi tiết.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Bộ khung trang dịch vụ đã sẵn sàng để nối API thật.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
