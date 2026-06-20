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
  const [ngay_da_chon, setNgayDaChon] = useState(new Date().toISOString().split('T')[0]);
  const [gio_da_chon, setGioDaChon] = useState<string | null>(null);

  const [ma_giao_dich, setMaGiaoDich] = useState<string | null>(null);
  const [link_qr_hien_tai, setLinkQrHienTai] = useState<string | null>(null);
  const [dang_gui, setDangGui] = useState(false);

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

  const kiemTraGioHopLe = (gio: string) => {
    const hien_tai = new Date();
    const ngay_chon = new Date(ngay_da_chon);
    if (ngay_chon.toDateString() !== hien_tai.toDateString()) return true;

    const [gio_hen, phut_hen] = gio.split(':').map(Number);
    const gio_hien_tai = hien_tai.getHours();
    const phut_hien_tai = hien_tai.getMinutes();

    if (gio_hen < gio_hien_tai) return false;
    if (gio_hen === gio_hien_tai && phut_hen <= phut_hien_tai) return false;

    return true;
  };

  useEffect(() => {
    if (gio_da_chon && !kiemTraGioHopLe(gio_da_chon)) {
      setGioDaChon(null);
    }
  }, [ngay_da_chon]);

  const xửLýChốtLịch = async () => {
    setDangGui(true);
    try {
      const phan_hoi = await axios.post("/api/chot-lich-hen", {
        ten_dich_vu: dich_vu_da_chon.ten,
        gia_tien: dich_vu_da_chon.gia,
        ten_ktv: ktv_da_chon.ten,
        ngay_dat: ngay_da_chon,
        gio_dat: gio_da_chon,
        thoi_gian: dich_vu_da_chon.thoi_gian
      });

      if (phan_hoi.data.thanh_cong) {
        setMaGiaoDich(phan_hoi.data.id_giao_dich);
        setLinkQrHienTai(phan_hoi.data.link_qr);
      }
    } catch (loi) {
      console.error("Lỗi chốt lịch:", loi);
      alert("Không thể chốt lịch hẹn. Vui lòng thử lại!");
    } finally {
      setDangGui(false);
    }
  };

  if (dang_tai) return <div className="p-10 text-center text-primary animate-pulse font-bold text-lg font-serif">Đang kết nối Salon...</div>;

  // --- GIAO DIỆN THANH TOÁN QR ---
  if (ma_giao_dich && link_qr_hien_tai) {
    return (
      <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
        <div className="border border-gray-200 rounded-3xl p-8 md:p-12 shadow-xl bg-white text-center">
          <h2 className="text-2xl font-serif font-bold text-gray-800 mb-6">Thanh toán đơn hàng</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100">
              <img src={link_qr_hien_tai} alt="Mã VietQR" className="w-full h-auto rounded-lg" />
            </div>

            <div className="text-left space-y-4">
              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                <p className="text-xs font-bold text-primary/60 uppercase mb-1 tracking-widest">Nội dung chuyển khoản</p>
                <p className="text-xl font-black text-primary">LOTUSGLOW DH{ma_giao_dich}</p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed italic">
                Vui lòng giữ nguyên nội dung chuyển khoản <span className="font-bold text-gray-800 not-italic text-primary">LOTUSGLOW DH{ma_giao_dich}</span> để hệ thống tự động xác nhận lịch sau 30s.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 font-bold transition-all"
                >
                  Xong, về trang chủ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm bg-white font-sans">
      {/* THANH TIẾN TRÌNH - SỬ DỤNG MÀU PRIMARY ĐỂ KHỚP VỚI LOGO */}
      <div className="flex items-center w-full mb-10 max-w-lg mx-auto px-4">
        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${buoc_hien_tai >= 1 ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-white border-gray-200 text-gray-400'}`}>1</div>
          <span className={`text-[11px] mt-2 font-bold uppercase tracking-wider ${buoc_hien_tai >= 1 ? 'text-primary' : 'text-gray-400'}`}>Dịch vụ</span>
        </div>

        <div className={`flex-1 h-[2px] mx-4 transition-colors duration-500 ${buoc_hien_tai === 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>

        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${buoc_hien_tai === 2 ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-white border-gray-200 text-gray-400'}`}>2</div>
          <span className={`text-[11px] mt-2 font-bold uppercase tracking-wider ${buoc_hien_tai === 2 ? 'text-primary' : 'text-gray-400'}`}>Thời gian</span>
        </div>
      </div>

      {/* GIAO DIỆN BƯỚC 1: CHỌN DỊCH VỤ & KTV */}
      {buoc_hien_tai === 1 && (
        <div className="space-y-10 animate-in fade-in duration-500">
          <section>
            <h3 className="text-xl font-bold text-gray-800 mb-6 uppercase tracking-tight">Chọn dịch vụ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {danh_sach_dich_vu.map((dv) => {
                const la_dang_chon = dich_vu_da_chon?.id === dv.id;
                const BieuTuong = (ThuVienIcon as any)[dv.icon] || ThuVienIcon.CheckCircle2;
                const mo_ta_sach = dv.mo_ta.replace(/&nbsp;/g, ' ');

                return (
                  <div
                    key={dv.id}
                    onClick={() => setDichVuDaChon(dv)}
                    className={`p-5 cursor-pointer transition-all border-2 rounded-xl flex gap-4 items-center ${
                      la_dang_chon ? "border-primary bg-primary/5 shadow-sm" : "border-gray-100 hover:border-primary/50 bg-white"
                    }`}
                  >
                    <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${la_dang_chon ? 'bg-white text-primary shadow-sm' : 'bg-primary/10 text-primary'}`}>
                      <BieuTuong className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 text-sm">{dv.ten}</h4>
                      <p className="text-[11px] text-gray-500 line-clamp-1 font-medium">{mo_ta_sach}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tighter">
                          <ThuVienIcon.Clock className="w-3 h-3" /> {dv.thoi_gian} phút
                        </span>
                        <span className="text-primary font-bold text-sm">{Number(dv.gia).toLocaleString()}đ</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-800 mb-6 uppercase tracking-tight">Chọn kỹ thuật viên</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {danh_sach_ktv.map((ktv) => {
                const la_dang_chon = ktv_da_chon?.id === ktv.id;
                const chu_cai_dau = ktv.ten.split(' ').map((n: any) => n[0]).join('').slice(-2).toUpperCase();
                return (
                  <div
                    key={ktv.id}
                    onClick={() => setKtvDaChon(ktv)}
                    className={`p-4 cursor-pointer transition-all border-2 rounded-xl flex flex-col items-center text-center ${
                      la_dang_chon ? "border-primary bg-primary/5 shadow-sm" : "border-gray-50 hover:border-primary/50 bg-white"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-3 border-2 border-white shadow-sm uppercase">
                      {chu_cai_dau}
                    </div>
                    <h4 className="font-bold text-gray-800 text-xs mb-1">{ktv.ten}</h4>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1 tracking-tighter">{ktv.vai_tro}</p>
                    <div className="flex items-center gap-1 text-[10px] text-orange-400 font-bold">
                      <ThuVienIcon.Star className="w-3 h-3 fill-current" /> {ktv.danh_gia}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <Button
              disabled={!dich_vu_da_chon || !ktv_da_chon}
              onClick={() => setBuocHienTai(2)}
              className="bg-primary hover:opacity-90 text-primary-foreground px-8 py-6 rounded-lg font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              Tiếp tục <ThuVienIcon.ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* GIAO DIỆN BƯỚC 2: CHỌN NGÀY GIỜ & TÓM TẮT */}
      {buoc_hien_tai === 2 && (
        <div className="animate-in slide-in-from-right-10 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-10">
              <section>
                <h3 className="text-xl font-bold text-gray-800 mb-8 uppercase tracking-tight">Thời gian hẹn</h3>

                <div className="space-y-8">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ThuVienIcon.Calendar className="w-4 h-4 text-primary" />
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ngày đặt lịch</label>
                    </div>
                    <input
                      type="date"
                      value={ngay_da_chon}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setNgayDaChon(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary outline-none transition-all font-medium text-gray-700"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <ThuVienIcon.Clock className="w-4 h-4 text-primary" />
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Giờ hẹn</label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {mang_khung_gio.map((gio) => {
                        const hop_le = kiemTraGioHopLe(gio);
                        const la_dang_chon = gio_da_chon === gio;

                        return (
                          <button
                            key={gio}
                            disabled={!hop_le}
                            onClick={() => setGioDaChon(gio)}
                            className={`py-3 text-sm font-bold rounded-xl border transition-all ${
                              la_dang_chon
                                ? "bg-primary border-primary text-primary-foreground shadow-md"
                                : hop_le
                                  ? "border-gray-200 text-gray-600 hover:border-primary bg-white"
                                  : "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed"
                            }`}
                          >
                            {gio}
                          </button>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-6 mt-6">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span className="text-xs font-medium text-gray-500 tracking-tight">Đã chọn</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-gray-300"></div>
                        <span className="text-xs font-medium text-gray-500 tracking-tight">Còn trống</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                        <span className="text-xs font-medium text-gray-500 tracking-tight">Đã đặt</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 h-full">
                <h3 className="text-lg font-bold mb-6 text-gray-800 border-b border-primary/20 pb-2">Tóm tắt lịch hẹn</h3>
                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Dịch vụ</p>
                    <p className="font-bold text-gray-800 text-sm leading-tight">{dich_vu_da_chon?.ten}</p>
                    <p className="text-primary font-bold text-sm mt-1">{Number(dich_vu_da_chon?.gia).toLocaleString()}đ</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Chuyên viên</p>
                    <p className="font-bold text-gray-800 text-sm leading-tight">{ktv_da_chon?.ten}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-tighter">{ktv_da_chon?.vai_tro}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Thời gian</p>
                    {ngay_da_chon && gio_da_chon ? (
                      <p className="font-bold text-gray-800 text-sm">{gio_da_chon} | {new Date(ngay_da_chon).toLocaleDateString('vi-VN')}</p>
                    ) : (
                      <p className="text-xs italic text-gray-400 font-medium">Vui lòng chọn thời gian...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center w-full mt-10">
            <div className="flex justify-between items-center w-full pt-6 border-t border-gray-100">
              <button
                onClick={() => setBuocHienTai(1)}
                className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Quay lại
              </button>
              <button
                disabled={!ngay_da_chon || !gio_da_chon || dang_gui}
                onClick={xửLýChốtLịch}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {dang_gui ? "Đang xử lý..." : "Xác nhận lịch"}
              </button>
            </div>
            <button
              onClick={() => setBuocHienTai(1)}
              className="mt-4 text-gray-400 hover:text-primary text-sm underline transition-colors"
            >
              Trở về bước 1
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
