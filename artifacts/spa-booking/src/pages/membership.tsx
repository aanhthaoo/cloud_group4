import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Crown, Star, Gift, Clock, Calendar } from "lucide-react";

const mockUser = {
  name: "Nguyễn Thị Hoa",
  phone: "0912 345 678",
  memberSince: "01/2023",
  points: 2450,
  tier: "Gold",
  totalSpent: "8,500,000đ"
};

const mockHistory = [
  { id: 1, date: "15/10/2023", service: "Massage thư giãn 90'", points: "+45" },
  { id: 2, date: "02/09/2023", service: "Chăm sóc da mặt chuyên sâu", points: "+60" },
  { id: 3, date: "20/07/2023", service: "Gói Spa thảo dược", points: "+120" },
];

export default function Membership() {
  const pointsToNextTier = 5000 - mockUser.points;
  const progressPercent = (mockUser.points / 5000) * 100;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-serif font-bold text-foreground">Thẻ Thành Viên</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 bg-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary/40 to-secondary/40"></div>
            <CardContent className="p-6 pt-12 text-center relative z-10">
              <Avatar className="w-24 h-24 mx-auto border-4 border-white shadow-md mb-4">
                <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground font-serif">NH</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-foreground">{mockUser.name}</h2>
              <p className="text-muted-foreground text-sm mb-4">{mockUser.phone}</p>
              
              <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 px-3 py-1 text-sm font-medium mb-4 flex items-center justify-center gap-1 mx-auto w-fit">
                <Crown className="w-4 h-4" /> Hạng {mockUser.tier}
              </Badge>
              
              <div className="text-sm text-muted-foreground flex justify-center items-center gap-1">
                <Calendar className="w-4 h-4" /> Thành viên từ {mockUser.memberSince}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" /> Điểm tích lũy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
                <div>
                  <span className="text-4xl font-bold text-foreground font-serif">{mockUser.points.toLocaleString()}</span>
                  <span className="text-muted-foreground ml-2">điểm</span>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  Tổng chi tiêu: <span className="font-medium text-foreground">{mockUser.totalSpent}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-yellow-600">Gold</span>
                  <span className="text-purple-600">VIP (5000 pts)</span>
                </div>
                <Progress value={progressPercent} className="h-2 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-yellow-400 [&>div]:to-purple-500" />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Tích lũy thêm <span className="font-medium text-primary">{pointsToNextTier.toLocaleString()} điểm</span> để thăng hạng VIP
                </p>
              </div>

              <div className="bg-secondary/20 rounded-xl p-4">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-secondary-foreground" /> Đặc quyền hạng Gold
                </h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary-foreground mt-1.5 shrink-0"></div>
                    <span>Giảm giá 10% cho tất cả các dịch vụ lẻ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary-foreground mt-1.5 shrink-0"></div>
                    <span>Ưu tiên đặt lịch hẹn vào các ngày cuối tuần/lễ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary-foreground mt-1.5 shrink-0"></div>
                    <span>Tặng 1 dịch vụ chăm sóc da cơ bản vào tháng sinh nhật</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" /> Lịch sử giao dịch gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {mockHistory.map((item) => (
                <div key={item.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-foreground">{item.service}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                    {item.points}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
