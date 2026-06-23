import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import api from "@/lib/axios";
import * as ThuVienIcon from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await api.get("/api/thong-tin-dat-lich");
        // Fallback rỗng nếu API trả về lỗi có mảng rỗng kèm theo
        const data = response.data.danh_sach_dich_vu || [];
        setServices(data);
        if (data.length === 0) {
          setError("Không tải được danh sách dịch vụ. Hệ thống đang được bảo trì.");
        }
      } catch (error) {
        console.error("Lỗi tải danh sách dịch vụ:", error);
        setServices([]); // đảm bảo không bao giờ là undefined
        setError("Không thể kết nối máy chủ. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  // Hàm bổ trợ để map icon và màu sắc dựa trên tên dịch vụ
  const getServiceStyles = (name: string) => {
    if (name.includes("Massage")) return {
      icon: "Flower2",
      bg: "bg-pink-50",
      border: "border-pink-100",
      text: "text-pink-600",
      tag: "Bán chạy nhất",
      tagColor: "bg-pink-100 text-pink-600",
      features: ["Giảm căng thẳng cơ bắp", "Cải thiện tuần hoàn", "Ngủ sâu hơn", "Tăng cường miễn dịch"]
    };
    if (name.includes("Chăm sóc da")) return {
      icon: "Sparkles",
      bg: "bg-purple-50",
      border: "border-purple-100",
      text: "text-purple-600",
      tag: "Được yêu thích",
      tagColor: "bg-purple-100 text-purple-600",
      features: ["Làm sạch sâu lỗ chân lông", "Cấp ẩm chuyên sâu", "Giảm nếp nhăn", "Da sáng mịn tức thì"]
    };
    if (name.includes("Nails")) return {
      icon: "Scissors",
      bg: "bg-red-50",
      border: "border-red-100",
      text: "text-red-600",
      tag: null,
      tagColor: "",
      features: ["Gel bền màu 3 tuần", "Sản phẩm an toàn", "Tạo hình chuyên nghiệp", "Ngâm dưỡng thư giãn"]
    };
    if (name.includes("Waxing")) return {
      icon: "Zap",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      text: "text-emerald-600",
      tag: "Nhanh chóng",
      tagColor: "bg-emerald-100 text-emerald-600",
      features: ["Sạch lông tận gốc", "Giảm đau tối đa", "Dưỡng da sau wax", "Nguyên liệu tự nhiên"]
    };
    if (name.includes("cô dâu")) return {
      icon: "Heart",
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-600",
      tag: "Gói cao cấp",
      tagColor: "bg-amber-100 text-amber-600",
      features: ["Chăm sóc toàn diện", "Tỏa sáng ngày cưới", "Combo tiết kiệm", "Quà tặng đi kèm"]
    };
    return {
      icon: "CheckCircle2",
      bg: "bg-yellow-50",
      border: "border-yellow-100",
      text: "text-yellow-600",
      tag: null,
      tagColor: "",
      features: ["Trải nghiệm đẳng cấp", "Dịch vụ tận tâm"]
    };
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse text-primary font-serif text-xl">Đang tải dịch vụ...</div>
    </div>
  );

  if (error || services.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <ThuVienIcon.WifiOff className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-700">Không thể tải dịch vụ</h2>
        <p className="text-gray-400 text-sm">{error || "Danh sách dịch vụ trống."}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-pink-300 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-pink-400 transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-800">
            Dịch vụ của <span className="text-pink-400">LotusGlow</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Mỗi dịch vụ được thiết kế tỉ mỉ để mang lại trải nghiệm thư giãn và làm đẹp đỉnh cao.
          </p>
          <div className="w-16 h-1 bg-pink-200 mx-auto rounded-full mt-4"></div>
        </div>

        {/* Danh sách dịch vụ */}
        <div className="space-y-8">
          {services.map((service) => {
            const styles = getServiceStyles(service.ten);
            const IconComponent = (ThuVienIcon as any)[styles.icon] || ThuVienIcon.CheckCircle2;

            return (
              <div
                key={service.id}
                className={`group relative border-2 ${styles.border} ${styles.bg} rounded-3xl p-8 transition-all hover:shadow-xl hover:-translate-y-1`}
              >
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Icon bên trái */}
                  <div className={`w-16 h-16 shrink-0 rounded-2xl bg-white flex items-center justify-center shadow-sm ${styles.text}`}>
                    <IconComponent className="w-8 h-8" />
                  </div>

                  {/* Nội dung ở giữa */}
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-gray-800">{service.ten}</h2>
                      {styles.tag && (
                        <Badge variant="secondary" className={`${styles.tagColor} border-none font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider`}>
                          {styles.tag}
                        </Badge>
                      )}
                    </div>

                    <p className="text-gray-400 font-medium text-sm italic">
                      {service.ten.includes("Massage") ? "Liệu pháp phục hồi toàn thân" :
                       service.ten.includes("da mặt") ? "Da sáng mịn từ sâu bên trong" :
                       service.ten.includes("Nails") ? "Đôi tay đôi chân hoàn hảo" :
                       service.ten.includes("Waxing") ? "Làn da mịn màng, sạch bóng" : "Chăm sóc toàn diện"}
                    </p>

                    <p className="text-gray-600 text-sm leading-relaxed max-w-2xl">
                      {service.mo_ta}
                    </p>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 pt-2">
                      {styles.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-500">
                          <div className={`w-1 h-1 rounded-full ${styles.text} bg-current`}></div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Giá & Nút bên phải */}
                  <div className="flex flex-col items-end justify-between min-w-[140px] gap-4 border-l border-gray-100 pl-8 md:border-l">
                    <div className="text-right">
                      <div className="text-3xl font-black text-pink-400">
                        {service.gia.toLocaleString()}đ
                      </div>
                      <div className="flex flex-col items-end mt-2 text-[11px] font-bold text-gray-400 space-y-1">
                        <div className="flex items-center gap-1 uppercase">
                          <ThuVienIcon.Clock className="w-3 h-3" /> {service.thoi_gian} phút
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <ThuVienIcon.Star className="fill-current w-3 h-3" />
                          <span className="text-gray-400">4.9 (128)</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => setLocation("/booking")}
                      className="bg-pink-300 hover:bg-pink-400 text-white font-bold rounded-xl px-8 py-6 shadow-sm transition-all active:scale-95"
                    >
                      Đặt lịch
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
