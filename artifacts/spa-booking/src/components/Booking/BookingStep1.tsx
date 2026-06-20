import React, { useState, useEffect } from "react";
import axios from "axios";
import * as ThuVienIcon from 'lucide-react';

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

  // Hàm kiểm tra giờ hợp lệ (không cho chọn giờ quá khứ trong ngày hôm nay)
  const kiemTraGioHopLe = (gio: string) => {
    const hien_tai = new Date();
    const ngay_chon = new Date(ngay_da_chon);

    // Nếu không phải hôm nay thì mọi giờ đều hợp lệ
    if (ngay_chon.toDateString() !== hien_tai.toDateString()) return true;

    const [gio_hen, phut_hen] = gio.split(':').map(Number);
    const gio_hien_tai = hien_tai.getHours();
    const phut_hien_tai = hien_tai.getMinutes();

    if (gio_hen < gio_hien_tai) return false;
    if (gio_hen === gio_hien_tai && phut_hen <= phut_hien_tai) return false;

    return true;
  };

  // Reset giờ nếu ngày thay đổi khiến giờ cũ không còn hợp lệ
  useEffect(() => {
    if (gio_da_chon && !kiemTraGioHopLe(gio_da_chon)) {
      setGioDaChon(null);
    }
  }, [ngay_da_chon]);

  if (dang_tai) return <div className="p-10 text-center text-pink-400 animate-pulse font-bold">Đang kết nối Salon...</div>;

  return (
    <div className="border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm bg-white">
      {/* THANH TIẾN TRÌNH (PROGRESS BAR) */}
      <div className="flex items-center w-full mb-12 px-2 md:px-10">
        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${buoc_hien_tai >= 1 ? 'bg-pink-300 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>1</div>
          <span className={`text-[11px] mt-2 font-bold uppercase tracking-wider ${buoc_hien_tai >= 1 ? 'text-pink-400' : 'text-gray-400'}`}>Dịch vụ</span>
        </div>

        <div className={`flex-1 h-[2px] mx-4 transition-colors duration-500 ${buoc_hien_tai === 2 ? 'bg-pink-300' : 'bg-gray-200'}`}></div>

        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${buoc_hien_tai === 2 ? 'bg-pink-300 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>2</div>
          <span className={`text-[11px] mt-2 font-bold uppercase tracking-wider ${buoc_hien_tai === 2 ? 'text-pink-400' : 'text-gray-400'}`}>Thời gian</span>
        </div>
      </div>

      {/* GIAO DIỆN BƯỚC 1: CHỌN DỊCH VỤ & KTV */}
      {buoc_hien_tai === 1 && (
        <div className="space-y-10 animate-in fade-in duration-500">
          <section>
            <h3 className="text-xl font-bold text-gray-800 mb-6">Chọn dịch vụ</h3>
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
                      la_dang_chon ? "border-pink-300 bg-pink-50" : "border-gray-100 hover:border-pink-300 bg-white"
                    }`}
                  >
                    <div className="w-12 h-12 shrink-0 rounded-full bg-pink-100 text-pink-400 flex items-center justify-center">
                      <BieuTuong className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 text-sm">{dv.ten}</h4>
                      <p className="text-[11px] text-gray-500 line-clamp-1">{mo_ta_sach}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase">
                          <ThuVienIcon.Clock className="w-3 h-3" /> {dv.thoi_gian} phút
                        </span>
                        <span className="text-pink-400 font-bold text-sm">{Number(dv.gia).toLocaleString()}đ</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-800 mb-6">Chọn kỹ thuật viên</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {danh_sach_ktv.map((ktv) => {
                const la_dang_chon = ktv_da_chon?.id === ktv.id;
                const chu_cai_dau = ktv.ten.split(' ').map((n: any) => n[0]).join('').slice(-2).toUpperCase();
                return (
                  <div
                    key={ktv.id}
                    onClick={() => setKtvDaChon(ktv)}
                    className={`p-4 cursor-pointer transition-all border-2 rounded-xl flex flex-col items-center text-center ${
                      la_dang_chon ? "border-pink-300 bg-pink-50" : "border-gray-50 hover:border-pink-300 bg-white"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-400 flex items-center justify-center font-bold text-lg mb-3 border-2 border-white shadow-sm uppercase">
                      {chu_cai_dau}
                    </div>
                    <h4 className="font-bold text-gray-800 text-xs mb-1">{ktv.ten}</h4>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">{ktv.vai_tro}</p>
                    <div className="flex items-center gap-1 text-[10px] text-orange-400 font-bold">
                      <ThuVienIcon.Star className="w-3 h-3 fill-current" /> {ktv.danh_gia}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <button
              disabled={!dich_vu_da_chon || !ktv_da_chon}
              onClick={() => setBuocHienTai(2)}
              className="bg-pink-300 hover:bg-pink-400 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              Tiếp tục <ThuVienIcon.ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* GIAO DIỆN BƯỚC 2: CHỌN NGÀY GIỜ & TÓM TẮT */}
      {buoc_hien_tai === 2 && (
        <div className="animate-in slide-in-from-right-10 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-10">
              <section>
                <h3 className="text-xl font-bold text-gray-800 mb-8">Thời gian hẹn</h3>

                <div className="space-y-8">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ThuVienIcon.Calendar className="w-4 h-4 text-pink-400" />
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ngày đặt lịch</label>
                    </div>
                    <input
                      type="date"
                      value={ngay_da_chon}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setNgayDaChon(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-pink-300 outline-none transition-all font-medium text-gray-700"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <ThuVienIcon.Clock className="w-4 h-4 text-pink-400" />
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
                                ? "bg-pink-300 border-pink-300 text-white"
                                : hop_le
                                  ? "border-gray-200 text-gray-600 hover:border-pink-300 bg-white"
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
                        <div className="w-3 h-3 rounded-full bg-pink-300"></div>
                        <span className="text-xs font-medium text-gray-500">Đã chọn</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-gray-300"></div>
                        <span className="text-xs font-medium text-gray-500">Còn trống</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                        <span className="text-xs font-medium text-gray-500">Đã đặt</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 h-full">
                <h3 className="text-lg font-bold mb-6 text-gray-800 border-b border-gray-200 pb-2">Tóm tắt lịch hẹn</h3>
                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Dịch vụ</p>
                    <p className="font-bold text-gray-800 text-sm leading-tight">{dich_vu_da_chon?.ten}</p>
                    <p className="text-pink-400 font-bold text-sm">{Number(dich_vu_da_chon?.gia).toLocaleString()}đ</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Chuyên viên</p>
                    <p className="font-bold text-gray-800 text-sm leading-tight">{ktv_da_chon?.ten}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">{ktv_da_chon?.vai_tro}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Thời gian</p>
                    {ngay_da_chon && gio_da_chon ? (
                      <p className="font-bold text-gray-800 text-sm">{gio_da_chon} | {new Date(ngay_da_chon).toLocaleDateString('vi-VN')}</p>
                    ) : (
                      <p className="text-xs italic text-gray-400">Vui lòng chọn thời gian...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nút điều hướng cuối form */}
          <div className="flex justify-between items-center w-full mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setBuocHienTai(1)}
              className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Quay lại
            </button>
            <button
              disabled={!ngay_da_chon || !gio_da_chon}
              onClick={() => alert("Hệ thống sẽ gửi yêu cầu đặt lịch cho Salon...")}
              className="px-8 py-3 bg-pink-300 text-white rounded-lg font-medium hover:bg-pink-400 transition-colors disabled:opacity-50"
            >
              Xác nhận lịch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
