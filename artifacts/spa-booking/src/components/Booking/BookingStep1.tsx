import React, { useState, useEffect } from "react";
import axios from "axios";
import * as ThuVienIcon from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BookingStep1() {
  // 1. Quản lý trạng thái (State) 100% Tiếng Việt
  const [danh_sach_dich_vu, setDanhSachDichVu] = useState<any[]>([]);
  const [danh_sach_ktv, setDanhSachKtv] = useState<any[]>([]);
  const [dang_tai, setDangTai] = useState(true);

  const [buoc_hien_tai, setBuocHienTai] = useState(1);
  const [dich_vu_da_chon, setDichVuDaChon] = useState<any>(null);
  const [ktv_da_chon, setKtvDaChon] = useState<any>(null);
  const [ngay_da_chon, setNgayDaChon] = useState("");
  const [gio_da_chon, setGioDaChon] = useState("");

  const mang_khung_gio = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00", "19:30"];

  useEffect(() => {
    const taiDuLieu = async () => {
      try {
        const phan_hoi = await axios.get("/api/thong-tin-dat-lich");
        setDanhSachDichVu(phan_hoi.data.danh_sach_dich_vu);
        setDanhSachKtv(phan_hoi.data.danh_sach_ktv);
      } catch (loi) {
        console.error("Lỗi tải dữ liệu:", loi);
      } finally {
        setDangTai(false);
      }
    };
    taiDuLieu();
  }, []);

  if (dang_tai) return <div className="p-10 text-center text-pink-500 animate-pulse font-bold text-lg">Đang kết nối Salon...</div>;

  // --- GIAO DIỆN BƯỚC 1: CHỌN DỊCH VỤ & KTV ---
  if (buoc_hien_tai === 1) {
    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Phần Dịch Vụ */}
        <section>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-1.5 h-7 bg-pink-500 rounded-full" />
            <h3 className="text-2xl font-serif font-bold text-gray-800">Bước 1: Chọn dịch vụ</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {danh_sach_dich_vu.map((dv) => {
              const la_dang_chon = dich_vu_da_chon?.id === dv.id;
              const BieuTuong = (ThuVienIcon as any)[dv.icon] || ThuVienIcon.CheckCircle2;

              return (
                <Card
                  key={dv.id}
                  onClick={() => setDichVuDaChon(dv)}
                  className={`p-6 cursor-pointer transition-all border-2 rounded-2xl flex gap-5 items-center shadow-sm ${
                    la_dang_chon ? "border-pink-300 bg-pink-50 ring-1 ring-pink-200" : "border-gray-100 hover:border-pink-100 bg-white"
                  }`}
                >
                  <div className="w-16 h-14 shrink-0 rounded-2xl bg-pink-100 flex items-center justify-center">
                    <BieuTuong className="w-7 h-7 text-pink-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-base">{dv.ten}</h4>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-1">{dv.mo_ta}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                        <ThuVienIcon.Clock className="w-3.5 h-3.5" /> {dv.thoi_gian} PHÚT
                      </span>
                      <span className="text-pink-600 font-black text-sm">{Number(dv.gia).toLocaleString()}đ</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Phần Kỹ Thuật Viên */}
        <section>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-1.5 h-7 bg-pink-500 rounded-full" />
            <h3 className="text-2xl font-serif font-bold text-gray-800">Chọn kỹ thuật viên</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {danh_sach_ktv.map((ktv) => {
              const la_dang_chon = ktv_da_chon?.id === ktv.id;
              const chu_cai_dau = ktv.ten.split(' ').map((n: any) => n[0]).join('').slice(-2).toUpperCase();
              return (
                <div
                  key={ktv.id}
                  onClick={() => setKtvDaChon(ktv)}
                  className={`p-6 cursor-pointer transition-all border-2 rounded-2xl flex flex-col items-center text-center shadow-sm ${
                    la_dang_chon ? "border-pink-300 bg-pink-50 ring-1 ring-pink-200" : "border-gray-100 hover:border-pink-100 bg-white"
                  }`}
                >
                  <div className="w-20 h-20 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-2xl mb-4 border-4 border-white shadow-sm uppercase">
                    {chu_cai_dau}
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">{ktv.ten}</h4>
                  <p className="text-[11px] text-gray-400 font-bold uppercase mb-2">{ktv.vai_tro}</p>
                  <div className="flex items-center gap-1.5 text-xs text-orange-500 font-bold bg-orange-50 px-3 py-1 rounded-full">
                    <ThuVienIcon.Star className="w-3.5 h-3.5 fill-current" /> {ktv.danh_gia}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex justify-end pt-8">
          <Button
            disabled={!dich_vu_da_chon || !ktv_da_chon}
            onClick={() => setBuocHienTai(2)}
            className="bg-pink-500 hover:bg-pink-600 text-white px-12 py-8 rounded-full text-xl font-bold shadow-2xl shadow-pink-200 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
          >
            Tiếp tục <ThuVienIcon.ChevronRight className="ml-2 w-7 h-7" />
          </Button>
        </div>
      </div>
    );
  }

  // --- GIAO DIỆN BƯỚC 2: CHỌN NGÀY GIỜ & TÓM TẮT ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in slide-in-from-right-10 duration-500">
      <div className="lg:col-span-2 space-y-10 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <section>
          <div className="flex items-center gap-2 mb-10">
            <div className="w-1.5 h-7 bg-pink-500 rounded-full" />
            <h3 className="text-2xl font-serif font-bold text-gray-800">Bước 2: Thời gian hẹn</h3>
          </div>

          <div className="space-y-12">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Ngày đặt lịch</label>
              <div className="relative">
                <ThuVienIcon.Calendar className="absolute left-5 top-5 w-6 h-6 text-pink-400" />
                <input
                  type="date"
                  value={ngay_da_chon}
                  onChange={(e) => setNgayDaChon(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 border-2 border-gray-50 rounded-2xl focus:border-pink-300 focus:bg-pink-50 outline-none transition-all font-bold text-gray-700 text-lg shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Khung giờ còn trống</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {mang_khung_gio.map((gio) => (
                  <button
                    key={gio}
                    onClick={() => setGioDaChon(gio)}
                    className={`py-5 text-base font-black rounded-2xl border-2 transition-all ${
                      gio_da_chon === gio
                        ? "bg-pink-500 border-pink-500 text-white shadow-xl shadow-pink-200"
                        : "border-gray-50 text-gray-500 hover:border-pink-200 hover:text-pink-500 bg-white"
                    }`}
                  >
                    {gio}
                  </button>
                ))}
              </div>
              <div className="flex gap-8 mt-8 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-2.5"><div className="w-4 h-4 rounded-full bg-pink-500 shadow-sm" /> Đã chọn</div>
                <div className="flex items-center gap-2.5"><div className="w-4 h-4 rounded-full border-2 border-gray-200 bg-white" /> Còn trống</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="lg:col-span-1">
        <Card className="bg-gray-50 border-none rounded-[40px] p-10 sticky top-4 shadow-inner">
          <h3 className="text-2xl font-serif font-bold mb-10 text-gray-800">Tóm tắt</h3>
          <div className="space-y-10">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-pink-500 shadow-md shrink-0">
                {(() => {
                  const BieuTuong = (ThuVienIcon as any)[dich_vu_da_chon?.icon] || ThuVienIcon.CheckCircle2;
                  return <BieuTuong className="w-6 h-6" />;
                })()}
              </div>
              <div>
                <p className="text-xs uppercase font-black text-gray-400 tracking-wider mb-1">Dịch vụ</p>
                <p className="font-bold text-gray-800 text-lg">{dich_vu_da_chon?.ten}</p>
                <p className="text-pink-600 font-black text-base">{Number(dich_vu_da_chon?.gia).toLocaleString()}đ</p>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-purple-500 shadow-md shrink-0 font-black text-lg uppercase">
                {ktv_da_chon?.ten[0]}
              </div>
              <div>
                <p className="text-xs uppercase font-black text-gray-400 tracking-wider mb-1">Kỹ thuật viên</p>
                <p className="font-bold text-gray-800 text-lg">{ktv_da_chon?.ten}</p>
                <p className="text-[11px] text-gray-500 font-bold uppercase">{ktv_da_chon?.vai_tro}</p>
              </div>
            </div>

            <div className="flex items-start gap-5 border-t border-gray-200 pt-8">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-500 shadow-md shrink-0">
                <ThuVienIcon.Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase font-black text-gray-400 tracking-wider mb-1">Thời gian</p>
                {ngay_da_chon && gio_da_chon ? (
                  <p className="font-bold text-gray-800 text-base">{gio_da_chon} | {new Date(ngay_da_chon).toLocaleDateString('vi-VN')}</p>
                ) : (
                  <p className="text-sm italic text-gray-400 font-medium">Chưa chọn thời gian</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-14 space-y-5">
            <Button
              onClick={() => alert("Hệ thống sẽ gửi yêu cầu đặt lịch cho Salon...")}
              disabled={!ngay_da_chon || !gio_da_chon}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-8 rounded-3xl text-xl font-black shadow-2xl shadow-pink-200 transition-all active:scale-95 disabled:grayscale"
            >
              Xác nhận lịch
            </Button>
            <button
              onClick={() => setBuocHienTai(1)}
              className="w-full text-gray-400 hover:text-pink-500 font-bold py-3 flex items-center justify-center gap-2 transition-colors text-sm uppercase tracking-widest"
            >
              <ThuVienIcon.ChevronLeft className="w-5 h-5" /> Trở về bước 1
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
