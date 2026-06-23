import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import api from "@/lib/axios";
import * as ThuVienIcon from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

export default function BookingHistory() {
  const { user } = useAuth();
  const [data, setData] = useState<{ lich_sap_toi: any[], lich_su_dich_vu: any[], tong_diem: number }>({
    lich_sap_toi: [],
    lich_su_dich_vu: [],
    tong_diem: 0
  });
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      try {
        const response = await api.get(`/api/lich-su-dat-hen?uid=${user.uid}`);
        setData(response.data);
      } catch (error) {
        console.error("Lỗi tải lịch sử đặt hẹn:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.uid]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse text-primary font-serif text-xl">Đang tải lịch sử...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif font-bold text-gray-900">Lịch sử đặt hẹn</h1>
          <p className="text-gray-500 font-medium">Quản lý lịch hẹn và điểm tích lũy của bạn</p>
        </div>

        {/* Tổng điểm - Giao diện Pill như ảnh 1 */}
        <div className="flex justify-center">
          <div className="bg-[#fff5f6] text-[#ff8fa3] px-10 py-4 rounded-full font-bold text-sm flex items-center gap-3 shadow-sm border border-[#ffe0e3]">
            <ThuVienIcon.Sparkles className="w-5 h-5" />
            <span className="text-gray-700 font-semibold text-base">Tổng điểm tích lũy: <span className="text-[#ff5e78] text-2xl font-bold ml-1">{data.tong_diem} điểm</span></span>
          </div>
        </div>

        {/* Phần 1: Lịch hẹn sắp tới */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-gray-800">
              <ThuVienIcon.Calendar className="w-5 h-5 text-pink-400" />
              <h2 className="font-bold text-lg uppercase tracking-tight">Lịch hẹn sắp tới</h2>
            </div>
            <div className="bg-purple-50 text-purple-500 font-bold px-4 py-1 rounded-full text-xs border border-purple-100">
              {data.lich_sap_toi.length} lịch hẹn
            </div>
          </div>

          <div className="space-y-4">
            {data.lich_sap_toi.length > 0 ? (
              data.lich_sap_toi.map((item) => (
                <div key={item.id} className="bg-white border border-gray-100 rounded-[1.5rem] p-8 flex flex-col md:flex-row md:items-center justify-between shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-gray-800">{item.ten_dich_vu}</h3>
                      <Badge className={`${item.trang_thai_hien_thi === "Đã xác nhận" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"} border-none font-bold text-[10px] px-3 py-1 rounded-md`}>
                        {item.trang_thai_hien_thi || "Chờ xác nhận"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-gray-400 font-medium">
                      <span className="flex items-center gap-2"><ThuVienIcon.User className="w-4 h-4" /> {item.ten_ktv}</span>
                      <span className="flex items-center gap-2"><ThuVienIcon.CalendarDays className="w-4 h-4" /> {item.ngay}</span>
                      <span className="flex items-center gap-2"><ThuVienIcon.Clock className="w-4 h-4" /> {item.gio}</span>
                    </div>
                  </div>
                  {/* Đã xoá SPA-XXXX ở đây theo hình 2 */}
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-gray-50/50 rounded-[1.5rem] border border-dashed border-gray-200 text-gray-400 font-medium">
                Bạn không có lịch hẹn nào sắp tới.
              </div>
            )}
          </div>
        </section>

        {/* Phần 2: Lịch sử dịch vụ - Biểu tượng Ngôi sao như ảnh 1 */}
        <section className="space-y-6 pt-4">
          <div className="flex items-center gap-2.5 text-gray-800">
            <ThuVienIcon.Star className="w-5 h-5 text-pink-400" />
            <h2 className="font-bold text-lg uppercase tracking-tight">Lịch sử dịch vụ</h2>
          </div>

          <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="px-10 py-6">Dịch vụ</th>
                  <th className="px-10 py-6">Ngày</th>
                  <th className="px-10 py-6 text-right">Giá</th>
                  <th className="px-10 py-6 text-right">Điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.lich_su_dich_vu.length > 0 ? (
                  data.lich_su_dich_vu.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/20 transition-colors">
                      <td className="px-10 py-7">
                        <div className="font-bold text-gray-800 text-base">{item.ten_dich_vu}</div>
                        <div className="text-xs text-gray-400 font-medium mt-1 flex items-center gap-1.5 capitalize">
                          <ThuVienIcon.User className="w-3.5 h-3.5" /> {item.ten_ktv}
                        </div>
                      </td>
                      <td className="px-10 py-7 text-sm text-gray-600 font-medium">{item.ngay}</td>
                      <td className="px-10 py-7 text-right font-bold text-gray-900 text-base">
                        {parseInt(item.gia).toLocaleString()}đ
                      </td>
                      <td className="px-10 py-7 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[#ff8fa3] font-bold text-sm">+{Math.round(parseInt(item.gia) * 0.1 / 1000)}</span>
                          <ThuVienIcon.Sparkle className="w-3.5 h-3.5 text-[#ff8fa3] fill-[#ff8fa3]" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-10 py-12 text-center text-gray-400 font-medium">Chưa có lịch sử sử dụng dịch vụ.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Nút đặt lịch mới */}
        <div className="flex justify-center pt-8">
          <Button
            onClick={() => setLocation("/booking")}
            className="bg-[#ff8fa3] hover:bg-[#ff5e78] text-white font-bold rounded-xl px-10 py-6 shadow-md transition-all active:scale-95 flex items-center gap-2 text-base"
          >
            <ThuVienIcon.CalendarPlus className="w-5 h-5" />
            Đặt lịch mới
          </Button>
        </div>

      </div>
    </div>
  );
}
