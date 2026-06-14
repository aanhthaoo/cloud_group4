import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarDays, Crown, LogOut, Sparkles, User, Phone, Mail, ChevronRight } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-3xl font-serif font-bold text-foreground text-center">Hồ sơ của tôi</h1>

        {/* Avatar + info */}
        <Card className="shadow-sm border-primary/10">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary-foreground flex items-center justify-center text-white text-2xl font-bold font-serif shrink-0">
              {initials}
            </div>
            <div className="flex-1 space-y-1.5">
              <h2 className="text-xl font-semibold text-foreground" data-testid="text-profile-name">
                {user.name}
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
                <Crown className="w-3 h-3" /> Thành viên Gold
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Lượt đặt lịch", value: "6" },
            { label: "Điểm tích lũy", value: "213" },
            { label: "Tổng chi tiêu", value: "2.5tr" },
          ].map((stat) => (
            <Card key={stat.label} className="shadow-sm border-primary/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary" data-testid={`stat-${stat.label}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick links */}
        <Card className="shadow-sm border-primary/10 overflow-hidden">
          <CardContent className="p-0">
            {[
              {
                icon: CalendarDays,
                label: "Lịch sử đặt hẹn",
                sub: "Xem lịch sắp tới và đã qua",
                href: "/booking-history",
                testid: "link-booking-history",
              },
              {
                icon: Sparkles,
                label: "Thẻ thành viên",
                sub: "Điểm tích lũy và quyền lợi",
                href: "/membership",
                testid: "link-membership",
              },
              {
                icon: User,
                label: "Dịch vụ đã sử dụng",
                sub: "Gợi ý dịch vụ phù hợp với bạn",
                href: "/services",
                testid: "link-services",
              },
            ].map((item, idx, arr) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-4 px-5 py-4 hover:bg-primary/5 transition-colors cursor-pointer ${idx !== arr.length - 1 ? "border-b border-border/60" : ""}`}
                    data-testid={item.testid}
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Logout */}
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
