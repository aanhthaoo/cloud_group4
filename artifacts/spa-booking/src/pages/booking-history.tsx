import React from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, User, Sparkles, Star } from "lucide-react";

interface Appointment {
  id: string;
  service: string;
  technician: string;
  date: string;
  time: string;
  status: "confirmed" | "pending";
}

interface HistoryItem {
  id: string;
  service: string;
  technician: string;
  date: string;
  price: string;
  points: number;
}

const upcomingAppointments: Appointment[] = [
  {
    id: "SPA-10293",
    service: "Massage thư giãn",
    technician: "Thư Ngân",
    date: "20/06/2026",
    time: "10:30",
    status: "confirmed",
  },
  {
    id: "SPA-10301",
    service: "Chăm sóc da mặt",
    technician: "Hồng Anh",
    date: "28/06/2026",
    time: "14:00",
    status: "pending",
  },
];

const serviceHistory: HistoryItem[] = [
  {
    id: "SPA-10201",
    service: "Gói Cô Dâu",
    technician: "Hồng Anh",
    date: "05/05/2026",
    price: "1,200,000đ",
    points: 120,
  },
  {
    id: "SPA-10178",
    service: "Nails & Pedicure",
    technician: "Lan Phương",
    date: "18/04/2026",
    price: "280,000đ",
    points: 28,
  },
  {
    id: "SPA-10145",
    service: "Massage thư giãn",
    technician: "Thư Ngân",
    date: "02/03/2026",
    price: "450,000đ",
    points: 45,
  },
  {
    id: "SPA-10110",
    service: "Waxing",
    technician: "Kim Yến",
    date: "14/01/2026",
    price: "200,000đ",
    points: 20,
  },
];

const totalPoints = serviceHistory.reduce((sum, item) => sum + item.points, 0);

export default function BookingHistory() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-1">Lịch sử đặt hẹn</h1>
          <p className="text-muted-foreground text-sm">Quản lý lịch hẹn và điểm tích lũy của bạn</p>
        </div>

        {/* Points summary pill */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-5 py-2.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Tổng điểm tích lũy:</span>
            <span className="text-lg font-bold text-primary" data-testid="text-total-points">{totalPoints} điểm</span>
          </div>
        </div>

        {/* Upcoming appointments */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Lịch hẹn sắp tới</h2>
            <Badge variant="secondary" className="ml-auto text-xs">
              {upcomingAppointments.length} lịch hẹn
            </Badge>
          </div>

          <div className="space-y-3">
            {upcomingAppointments.map((appt) => (
              <Card
                key={appt.id}
                className="border-primary/10 shadow-sm hover:shadow-md transition-shadow"
                data-testid={`card-upcoming-${appt.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-base">{appt.service}</span>
                        <Badge
                          className={`text-xs px-2 py-0.5 ${
                            appt.status === "confirmed"
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-amber-100 text-amber-700 border-amber-200"
                          }`}
                          variant="outline"
                        >
                          {appt.status === "confirmed" ? "Đã xác nhận" : "Chờ xác nhận"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> {appt.technician}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" /> {appt.date}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {appt.time}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground font-mono">{appt.id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Service history */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Lịch sử dịch vụ</h2>
          </div>

          <Card className="shadow-sm border-primary/10 overflow-hidden">
            <CardHeader className="bg-primary/5 py-3 px-5 border-b border-primary/10">
              <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span className="col-span-5">Dịch vụ</span>
                <span className="col-span-3">Ngày</span>
                <span className="col-span-2 text-right">Giá</span>
                <span className="col-span-2 text-right">Điểm</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {serviceHistory.map((item, idx) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-12 items-center px-5 py-4 text-sm gap-2 hover:bg-primary/3 transition-colors ${
                    idx !== serviceHistory.length - 1 ? "border-b border-border/60" : ""
                  }`}
                  data-testid={`row-history-${item.id}`}
                >
                  <div className="col-span-5">
                    <p className="font-medium text-foreground">{item.service}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" /> {item.technician}
                    </p>
                  </div>
                  <div className="col-span-3 text-muted-foreground">{item.date}</div>
                  <div className="col-span-2 text-right font-medium text-foreground">{item.price}</div>
                  <div className="col-span-2 text-right">
                    <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
                      +{item.points}
                      <Sparkles className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <div className="flex justify-center pt-2">
          <Link href="/booking">
            <Button className="gap-2" data-testid="button-book-new">
              <CalendarDays className="w-4 h-4" />
              Đặt lịch mới
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
