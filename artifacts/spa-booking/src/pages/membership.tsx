import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Star, Award, TrendingUp, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

export default function Membership() {
  const { user } = useAuth();
  const loyalty = (user as any)?.loyalty || {};

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-serif font-bold text-foreground">Thẻ Thành Viên</h1>
        
        {/* Member Card */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Award className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h2 className="text-xl font-medium opacity-90">Hạng Thành Viên</h2>
            <div className="text-4xl font-bold font-serif mt-1 mb-6 flex items-center gap-2">
              <Star className="w-8 h-8 fill-yellow-300 text-yellow-300" />
              {loyalty.tier || "Thành viên"}
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm opacity-80 uppercase tracking-wider mb-1">Khách hàng</p>
                <p className="font-semibold text-lg">{user?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80 uppercase tracking-wider mb-1">Điểm tích lũy</p>
                <p className="font-semibold text-xl">{loyalty.points || 0} pts</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-700">
                <TrendingUp className="w-5 h-5 text-rose-400" /> Thông tin hạng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Tổng chi tiêu</span>
                  <span className="font-bold text-gray-800">{(loyalty.totalSpent || 0).toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Điểm trọn đời</span>
                  <span className="font-bold text-gray-800">{loyalty.lifetimePoints || loyalty.points || 0} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Chiết khấu hiện tại</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                    {loyalty.discountPercent || 0}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-700">
                <Gift className="w-5 h-5 text-rose-400" /> Ưu đãi hạng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"></div>
                  <span>Tích điểm {(loyalty.tier === "VIP" || loyalty.tier === "VVIP") ? "cao hơn" : "tiêu chuẩn"} trên mỗi hóa đơn dịch vụ.</span>
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"></div>
                  <span>Giảm giá {loyalty.discountPercent || 0}% trực tiếp cho các dịch vụ chăm sóc sắc đẹp.</span>
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"></div>
                  <span>Sử dụng điểm để quy đổi thành quà tặng hoặc voucher giảm giá cho lần sau.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
