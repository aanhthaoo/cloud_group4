import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Crown, LogOut, Phone, Mail } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!user) return null;

  const userName = user.name || "User";
  const initials = userName
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-3xl font-serif font-bold text-foreground text-center">Hồ sơ của tôi</h1>

        <Card className="shadow-sm border-primary/10">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary-foreground flex items-center justify-center text-white text-2xl font-bold font-serif shrink-0">
              {initials}
            </div>
            <div className="flex-1 space-y-1.5">
              <h2 className="text-xl font-semibold text-foreground" data-testid="text-profile-name">
                {userName}
              </h2>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span data-testid="text-profile-email">{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>{user.phone}</span>
              </div>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 border mt-1 gap-1">
                <Crown className="w-3 h-3" /> Thông tin hạng đang chờ API
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/10">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground" data-testid="khung-ho-so-nguoi-dung">
              Các chỉ số và lịch sử dịch vụ đang chờ tích hợp API.
            </p>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 gap-2"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </Button>
      </div>
    </div>
  );
}
