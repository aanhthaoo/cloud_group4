import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export default function Membership() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-serif font-bold text-foreground">Thẻ Thành Viên</h1>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" /> Thông tin thành viên
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground" data-testid="khung-the-thanh-vien">
              Đang chờ tích hợp API để hiển thị hạng thành viên, điểm tích lũy và lịch sử giao dịch.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
