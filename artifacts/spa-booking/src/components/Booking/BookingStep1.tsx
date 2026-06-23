import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import * as ThuVienIcon from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/axios";
import Recaptcha from "@/components/Recaptcha";



export default function BookingStep1() {
  // ─── 1. State chọn lịch ───────────────────────────────────────────────
  const [danh_sach_dich_vu, setDanhSachDichVu] = useState<any[]>([]);
  const [danh_sach_ktv, setDanhSachKtv] = useState<any[]>([]);
  // unavailable_slots: mảng timeSlot đã bị đặt cho (ngày + KTV) hiện tại
  // Được cập nhật realtime từ GET /api/bookings/unavailable-slots
  const [unavailable_slots, setUnavailableSlots] = useState<string[]>([]);
  const [dang_tai_lich, setDangTaiLich] = useState(false); // loading riêng cho slot
  const [dang_tai, setDangTai] = useState(true);

  const [buoc_hien_tai, setBuocHienTai] = useState(1);
  const [dich_vu_da_chon, setDichVuDaChon] = useState<any>(null);
  const [ktv_da_chon, setKtvDaChon] = useState<any>(null);
  const [ngay_da_chon, setNgayDaChon] = useState(new Date().toISOString().split('T')[0]);
  const [gio_da_chon, setGioDaChon] = useState<string | null>(null);

  const [ma_giao_dich, setMaGiaoDich] = useState<string | null>(null);
  const [link_qr_hien_tai, setLinkQrHienTai] = useState<string | null>(null);
  const [dang_gui, setDangGui] = useState(false);
  const [hien_thong_bao_thanh_cong, setHienThongBaoThanhCong] = useState(false);
  const [hien_thong_bao_that_bai, setHienThongBaoThatBai] = useState(false);
  const [loi_xac_nhan, setLoiXacNhan] = useState("");

  // ─── Đồng hồ đếm ngược 15 phút ────────────────────────────────
  // Số giây còn lại, bắt đầu từ 900 (15*60). -1 = chưa khởi động.
  const [thoi_gian_con_lai, setThoiGianConLai] = useState<number>(-1);



  // ─── 3. State thanh toán — upload R2 + OCR ───────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    ocrStatus: string;
    detectedAmount: number | null;
    detectedContent: string | null;
    detectedRecipient: string | null;
    detectedTransferDate: string | null;
    ocrErrorDetail?: string;
  } | null>(null);
  // Ref chặn useEffect trigger OCR nhiều lần (ví dụ: captchaToken hết hạn giữa chừng)
  const hasTriggeredOcr = useRef(false);

  const mang_khung_gio = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00", "19:30"];

  // ─── Load dữ liệu ban đầu (dịch vụ + KTV) ───────────────────────────
  useEffect(() => {
    const taiDuLieu = async () => {
      try {
        const phan_hoi = await axios.get("/api/thong-tin-dat-lich");
        setDanhSachDichVu(phan_hoi.data.danh_sach_dich_vu);
        setDanhSachKtv(phan_hoi.data.danh_sach_ktv);
        // Không còn dùng danh_sach_lich_ban tĩnh từ đây nữa
      } catch (loi) {
        console.error("Lỗi tải dữ liệu:", loi);
      } finally {
        setDangTai(false);
      }
    };
    taiDuLieu();
  }, []);

  // ─── Fetch lịch đã đặt realtime mỗi khi đổi ngày hoặc KTV ───────────
  // Gọi GET /api/bookings/unavailable-slots để lấy mảng giờ đã bị đặt.
  // Chỉ gọi khi đã chọn KTV (resourceId cần thiết cho query).
  useEffect(() => {
    if (!ktv_da_chon?.id) {
      setUnavailableSlots([]);
      return;
    }
    const fetchUnavailableSlots = async () => {
      setDangTaiLich(true);
      try {
        const res = await api.get("/api/bookings/unavailable-slots", {
          params: { date: ngay_da_chon, resourceId: ktv_da_chon.id },
        });
        setUnavailableSlots(res.data.data || []);
      } catch (loi) {
        console.error("Lỗi tải lịch bận:", loi);
        setUnavailableSlots([]);
      } finally {
        setDangTaiLich(false);
      }
    };
    fetchUnavailableSlots();
  }, [ngay_da_chon, ktv_da_chon]);

  // ─── Đồng hồ đếm ngược ─────────────────────────────────────────
  // Khởi động khi ma_giao_dich được tạo, cập nhật mỗi giây, dừng khi về 0.
  useEffect(() => {
    if (thoi_gian_con_lai < 0) return; // chưa khởi động
    if (thoi_gian_con_lai === 0) return; // đã hết giờ

    const interval = setInterval(() => {
      setThoiGianConLai((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval); // cleanup khi unmount hoặc reset
  }, [thoi_gian_con_lai]);

  // ─── Validate giờ hợp lệ ─────────────────────────────────────────────
  const kiemTraGioHopLe = (gio: string, ngay_da_chon_param: string) => {
    const hien_tai = new Date();
    const ngay_chon = new Date(ngay_da_chon_param);
    if (ngay_chon.toDateString() !== hien_tai.toDateString()) return true;

    const [gio_hen, phut_hen] = gio.split(':').map(Number);
    const gio_hien_tai = hien_tai.getHours();
    const phut_hien_tai = hien_tai.getMinutes();

    if (gio_hen < gio_hien_tai) return false;
    if (gio_hen === gio_hien_tai && phut_hen <= phut_hien_tai) return false;
    return true;
  };

  useEffect(() => {
    if (gio_da_chon && !kiemTraGioHopLe(gio_da_chon, ngay_da_chon)) {
      setGioDaChon(null);
    }
  }, [ngay_da_chon]);



  // ─── Chốt lịch (có kiểm tra conflict 409 trước khi ghi) ─────────────
  const xửLýChốtLịch = async () => {
    setDangGui(true);
    try {
      // BƯỚC 1: Tạo soft-hold 15 phút qua API mới.
      // Nếu slot vừa bị người khác đặt → 409, báo lỗi ngay.
      const holdRes = await api.post("/api/bookings/create", {
        date: ngay_da_chon,
        timeSlot: gio_da_chon,
        resourceId: ktv_da_chon.id,
        customerData: {
          ten_dich_vu: dich_vu_da_chon.ten,
          gia_tien: dich_vu_da_chon.gia,
          ten_ktv: ktv_da_chon.ten,
          thoi_gian: dich_vu_da_chon.thoi_gian,
        },
      });

      // Lấy thời điểm hết hạn để tính số giây đếm ngược chính xác
      const expiresAt = new Date(holdRes.data.data.softHoldExpiresAt);
      const secondsLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setThoiGianConLai(secondsLeft); // khởi động đồng hồ

      // BƯỚC 2: Slot đã giữ xong → tiến hành tạo giao dịch & QR
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
    } catch (loi: any) {
      console.error("Lỗi chốt lịch:", loi);
      if (loi.response?.status === 409) {
        toast.error(loi.response.data.message || "Khung giờ này vừa có người đặt, vui lòng chọn giờ khác");
        if (ktv_da_chon?.id) {
          const res = await api.get("/api/bookings/unavailable-slots", {
            params: { date: ngay_da_chon, resourceId: ktv_da_chon.id },
          });
          setUnavailableSlots(res.data.data || []);
          setGioDaChon(null);
        }
      } else {
        toast.error("Không thể chốt lịch hẹn. Vui lòng thử lại!");
      }
    } finally {
      setDangGui(false);
    }
  };

  // ─── Upload biên lai lên Cloudflare R2 qua presigned URL ─────────────
  const uploadReceiptToR2 = useCallback(async (selectedFile: File) => {
    setIsUploading(true);
    setUploadedFileName(null);
    setOcrResult(null);
    hasTriggeredOcr.current = false; // reset khi upload ảnh mới

    try {
      const { data } = await api.get("/api/upload-url/receipt");
      const { uploadUrl, fileName } = data;

      const putResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: selectedFile,
      });

      if (!putResponse.ok) {
        throw new Error("Upload lên R2 thất bại");
      }

      setUploadedFileName(fileName);
      toast.success("Đã tải biên lai lên thành công");
    } catch (err: any) {
      toast.error(err.message || "Không thể tải biên lai lên. Vui lòng thử lại.");
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      uploadReceiptToR2(selected);
    }
  };

  // ─── Gọi OCR sau khi đủ điều kiện: đã upload R2 + có captchaToken ────
  // Tự động kích hoạt: dù upload trước hay tick captcha trước, cái xong sau sẽ trigger.
  const handleConfirmOCR = useCallback(async () => {
    if (!uploadedFileName || !captchaToken || !dich_vu_da_chon) return;

    const tien_coc = Math.round(Number(dich_vu_da_chon.gia) * 0.3);

    setIsVerifying(true);
    try {
      const { data } = await api.post("/api/payments/verify-receipt", {
        fileName: uploadedFileName,
        recaptchaToken: captchaToken,
        amountPaid: tien_coc,
        bookingId: ma_giao_dich
      });

      setOcrResult({
        ocrStatus: data.data.ocrStatus,
        detectedAmount: data.data.detectedAmount,
        detectedContent: data.data.detectedContent,
        detectedRecipient: data.data.detectedRecipient,
        detectedTransferDate: data.data.detectedTransferDate,
        ocrErrorDetail: data.data.ocrErrorDetail,
      });

      if (data.data.ocrStatus === "failed") {
        toast.error("Không đọc được nội dung biên lai. Xem chi tiết lỗi bên dưới.");
        return;
      }

      toast.success("Đã đọc được thông tin biên lai. Kiểm tra lại bên dưới rồi xác nhận.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Xác thực biên lai thất bại");
    } finally {
      setIsVerifying(false);
    }
  }, [uploadedFileName, captchaToken, dich_vu_da_chon, ma_giao_dich]);

  // OCR tự động chạy ngay khi đủ 2 điều kiện, chỉ trigger 1 lần dựa trên ref.
  // Tránh lỗi vòng lặp khi captchaToken hết hạn giữa lúc OCR đang xử lý.
  useEffect(() => {
    if (uploadedFileName && captchaToken && !hasTriggeredOcr.current) {
      hasTriggeredOcr.current = true;
      handleConfirmOCR();
    }
  }, [uploadedFileName, captchaToken, handleConfirmOCR]);


  // ─── Xác nhận cuối — hiển thị popup thành công ───────────────────────
  const xuLyXacNhanThanhToan = async () => {
    setIsFinalizing(true);
    try {
      if (ma_giao_dich) {
        const phan_hoi = await axios.post('/api/xac-nhan-thanh-toan', { id_giao_dich: ma_giao_dich });
        if (phan_hoi.data.thanh_cong) {
          setHienThongBaoThanhCong(true);
        } else {
          setLoiXacNhan(phan_hoi.data.loi || "Đối soát biên lai không thành công.");
          setHienThongBaoThatBai(true);
        }
      }
    } catch (loi: any) {
      console.error("Lỗi khi xác nhận thanh toán:", loi);
      toast.error("Có lỗi xảy ra khi xác nhận hệ thống. Vui lòng thử lại.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const hasVerifiedOcr = !!ocrResult && ocrResult.ocrStatus !== "failed";
  const ocrFailed = !!ocrResult && ocrResult.ocrStatus === "failed";

  // ─── Loading ──────────────────────────────────────────────────────────
  if (dang_tai) return (
    <div className="p-10 text-center text-primary animate-pulse font-bold text-lg font-serif">
      Đang kết nối Salon...
    </div>
  );

  // ─── MàN HÌNH THANH TOÁN ĐẶT CỌC (khi đã có mã giao dịch) ───────
  if (ma_giao_dich) {
    const tong_cong = Number(dich_vu_da_chon.gia);
    const tien_coc = Math.round(tong_cong * 0.3);
    const tien_con_lai = tong_cong - tien_coc;

    // Định dạng MM:SS cho đồng hồ đếm ngược
    const phut = Math.floor(thoi_gian_con_lai / 60).toString().padStart(2, '0');
    const giay = (thoi_gian_con_lai % 60).toString().padStart(2, '0');
    const da_het_gio = thoi_gian_con_lai === 0;
    // Cảnh báo đỏ khi còn đưới 3 phút
    const sap_het_gio = thoi_gian_con_lai > 0 && thoi_gian_con_lai <= 180;

    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-700">

        {/* BANNER ĐỒNG HỒ ĐẾM NGƯỢC */}
        {thoi_gian_con_lai >= 0 && (
          <div className={`mb-6 rounded-2xl px-5 py-4 flex items-center justify-between border transition-all duration-500 ${
            da_het_gio
              ? 'bg-red-50 border-red-200 text-red-800'
              : sap_het_gio
              ? 'bg-orange-50 border-orange-300 text-orange-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <div className="flex items-center gap-3">
              <ThuVienIcon.Timer className={`w-5 h-5 shrink-0 ${
                da_het_gio ? 'text-red-500' : sap_het_gio ? 'text-orange-500 animate-pulse' : 'text-emerald-500'
              }`} />
              <div>
                <p className="font-bold text-sm">
                  {da_het_gio ? '⚠️ Thời gian giữ chỗ đã hết!' : 'Slot đang được giữ cho bạn'}
                </p>
                <p className="text-xs opacity-75">
                  {da_het_gio
                    ? 'Slot có thể đã được người khác đặt. Vui lòng quay lại chọn giờ mới.'
                    : sap_het_gio
                    ? 'Còn rất ít thời gian! Hãy hoàn tất thanh toán ngay.'
                    : 'Hoàn tất thanh toán trước khi hết giờ giữ chỗ.'}
                </p>
              </div>
            </div>
            {/* Đồng hồ */}
            {!da_het_gio ? (
              <div className={`font-mono text-2xl font-black tracking-widest px-4 py-2 rounded-xl ${
                sap_het_gio ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {phut}:{giay}
              </div>
            ) : (
              <button
                onClick={() => { setMaGiaoDich(null); setThoiGianConLai(-1); setGioDaChon(null); }}
                className="text-xs font-bold bg-red-100 text-red-700 px-4 py-2 rounded-xl hover:bg-red-200 transition-colors"
              >
                Chọn lại giờ
              </button>
            )}
          </div>
        )}

        {/* Overlay mờ khi hết giờ — vẫn cho nhìn thấy nội dung nhưng disabled */}
        <div className={`relative transition-opacity duration-700 ${da_het_gio ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          <div className="grid md:grid-cols-2 gap-8">
          {/* CỘT TRÁI: HÓA ĐƠN & NGÂN HÀNG */}
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-2xl shadow-sm p-6 bg-white space-y-4">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-50 pb-3">Hóa đơn tạm tính</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Dịch vụ:</span>
                  <span className="font-bold text-gray-800">{dich_vu_da_chon?.ten}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Kỹ thuật viên:</span>
                  <span className="font-bold text-gray-800">{ktv_da_chon?.ten}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngày & Giờ:</span>
                  <span className="font-bold text-gray-800">
                    {gio_da_chon} • {new Date(ngay_da_chon).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="pt-3 border-t border-dashed flex justify-between">
                  <span className="text-gray-600 font-bold">Tổng cộng:</span>
                  <span className="font-bold text-gray-800">{tong_cong.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-primary/5 px-3 rounded-lg border border-primary/10">
                  <span className="text-primary font-bold text-base">Đặt cọc (30%):</span>
                  <span className="text-xl font-black text-primary">{tien_coc.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 italic">
                  <span>Còn lại thanh toán tại Spa:</span>
                  <span>{tien_con_lai.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl shadow-sm p-6 bg-white space-y-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">Thông tin chuyển khoản</h3>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100">
                  <img src={link_qr_hien_tai || ""} alt="Mã VietQR" className="w-52 h-52 mx-auto" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Ngân hàng:</span> <span className="font-bold text-gray-700">MB Bank</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Tên tài khoản:</span> <span className="font-bold text-gray-700 uppercase">DINH VAN MANH</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Số tài khoản:</span> <span className="font-black text-primary text-base">0377172930</span></div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-400 mb-1 font-bold">NỘI DUNG CHUYỂN KHOẢN:</p>
                  <p className="font-black text-primary text-lg">LOTUSGLOW DH{ma_giao_dich}</p>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: UPLOAD BIÊN LAI + reCAPTCHA + XÁC NHẬN */}
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-2xl shadow-sm p-6 bg-white space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Tải lên biên lai</h3>
              <p className="text-xs text-gray-500">Vui lòng tải lên ảnh chụp màn hình chuyển khoản thành công.</p>

              <label className="border-2 border-dashed border-primary/20 bg-primary/5 rounded-2xl flex flex-col items-center justify-center p-12 cursor-pointer hover:bg-primary/10 transition-all group">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  data-testid="input-receipt-upload"
                  disabled={isUploading}
                />
                {isUploading ? (
                  <div className="flex flex-col items-center text-center">
                    <ThuVienIcon.Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                    <span className="text-sm font-medium text-foreground">Đang tải lên...</span>
                  </div>
                ) : file && uploadedFileName ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                      <ThuVienIcon.Check className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-primary truncate max-w-full">{file.name}</p>
                    <span className="text-xs text-muted-foreground mt-1">Nhấn để tải lại ảnh khác</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <ThuVienIcon.UploadCloud className="w-10 h-10 text-primary/60 mb-3 mx-auto group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-primary">Kéo thả hoặc Nhấn để tải ảnh lên</p>
                    <p className="text-[10px] text-gray-400 mt-1">PNG, JPG tối đa 5MB</p>
                  </div>
                )}
              </label>

              {/* Kết quả OCR — thất bại */}
              {ocrFailed && (
                <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  <p className="font-medium text-red-700 flex items-center gap-1">
                    <ThuVienIcon.AlertTriangle className="w-4 h-4 shrink-0" /> OCR đọc ảnh thất bại
                  </p>
                  <p className="text-red-600">
                    {ocrResult?.ocrErrorDetail
                      ? `Lý do: ${ocrResult.ocrErrorDetail}`
                      : "Không rõ lý do — xem terminal backend để biết chi tiết."}
                  </p>
                </div>
              )}

              {/* Kết quả OCR — thành công */}
              {hasVerifiedOcr && ocrResult && (
                <div className="text-sm bg-slate-50 rounded-lg p-3 space-y-1">
                  <p className="font-medium text-foreground">Kết quả OCR (tự động đọc từ ảnh):</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Số tiền nhận diện:</span>
                    <span className="font-medium">
                      {ocrResult.detectedAmount
                        ? `${ocrResult.detectedAmount.toLocaleString("vi-VN")}đ`
                        : "Không đọc được"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Người nhận:</span>
                    <span className="font-medium text-right">{ocrResult.detectedRecipient || "Không đọc được"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Nội dung nhận diện:</span>
                    <span className="font-medium text-right">{ocrResult.detectedContent || "Không đọc được"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Thời gian chuyển khoản:</span>
                    <span className="font-medium text-right">{ocrResult.detectedTransferDate || "Không đọc được"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* reCAPTCHA thật */}
            <div>
              <Recaptcha onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
            </div>

            {/* Nút xác nhận */}
            <Button
              className="w-full h-14 text-lg font-medium shadow-md"
              size="lg"
              data-testid="button-confirm-payment"
              disabled={
                isFinalizing || (hasVerifiedOcr
                  ? false
                  : ocrFailed
                    ? isVerifying
                    : true)
              }
              onClick={
                hasVerifiedOcr
                  ? xuLyXacNhanThanhToan
                  : ocrFailed
                    ? handleConfirmOCR
                    : undefined
              }
            >
              {isFinalizing
                ? "Đang đối soát hệ thống..."
                : isVerifying
                ? "Đang đọc thông tin biên lai..."
                : hasVerifiedOcr
                  ? "Xác nhận thông tin & Chốt lịch"
                  : ocrFailed
                    ? "Thử đọc lại biên lai"
                    : !uploadedFileName
                      ? "Vui lòng tải ảnh biên lai lên"
                      : !captchaToken
                        ? "Vui lòng xác thực reCAPTCHA"
                        : "Đang xử lý..."}
            </Button>


          </div>
        </div>
        </div>{/* /relative overlay wrapper */}

        {/* Popup thành công */}
        {hien_thong_bao_thanh_cong && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl transform transition-all scale-100">
              <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-10 h-10 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3 font-serif">Đã xác nhận lịch!</h3>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Tuyệt vời! LotusGlow đã đối soát biên lai thành công. Hẹn gặp bạn tại Spa vào lúc {gio_da_chon} ngày {new Date(ngay_da_chon).toLocaleDateString('vi-VN')}.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-pink-300 text-white rounded-xl py-3.5 font-bold hover:bg-pink-400 transition-colors shadow-sm"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        )}

        {/* Popup thất bại */}
        {hien_thong_bao_that_bai && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl transform transition-all scale-100">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3 font-serif">Xác nhận thất bại</h3>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                {loi_xac_nhan}
              </p>
              <button
                onClick={() => setHienThongBaoThatBai(false)}
                className="w-full bg-gray-200 text-gray-700 rounded-xl py-3.5 font-bold hover:bg-gray-300 transition-colors shadow-sm"
              >
                Kiểm tra lại biên lai
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── LUỒNG CHỌN LỊCH (Bước 1 & 2) ───────────────────────────────────
  return (
    <div className="border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm bg-white font-sans">
      {/* THANH TIẾN TRÌNH */}
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

      {/* BƯỚC 1: CHỌN DỊCH VỤ & KTV */}
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
                      la_dang_chon ? "border-primary bg-primary/10 shadow-sm" : "border-gray-100 hover:border-primary/50 bg-white"
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
                        <span className="text-primary font-bold text-sm">{dv.gia.toLocaleString()}đ</span>
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
                      la_dang_chon ? "border-primary bg-primary/10 shadow-sm" : "border-gray-50 hover:border-primary/50 bg-white"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-3 border-2 border-white shadow-sm uppercase">
                      {chu_cai_dau}
                    </div>
                    <h4 className="font-bold text-gray-800 text-xs mb-1">{ktv.ten}</h4>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <button
              disabled={!dich_vu_da_chon || !ktv_da_chon}
              onClick={() => setBuocHienTai(2)}
              className="bg-primary hover:opacity-90 text-primary-foreground px-10 py-3 rounded-lg font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              Tiếp tục <ThuVienIcon.ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BƯỚC 2: CHỌN THỜI GIAN */}
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
                        // Kiểm tra slot theo mảng realtime từ API /unavailable-slots
                        const bi_trung_lich = unavailable_slots.includes(gio);
                        const bi_qua_gio = !kiemTraGioHopLe(gio, ngay_da_chon);
                        const bi_khoa = bi_qua_gio || bi_trung_lich || dang_tai_lich;
                        const la_dang_chon = gio_da_chon === gio;

                        return (
                          <button
                            key={gio}
                            disabled={bi_khoa}
                            onClick={() => setGioDaChon(gio)}
                            className={`py-3 text-sm font-bold rounded-xl border transition-all ${
                              la_dang_chon
                                ? "bg-primary border-primary text-primary-foreground shadow-md"
                                : !bi_khoa
                                  ? "border-gray-200 text-gray-600 hover:border-primary bg-white font-bold"
                                  : "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed"
                            }`}
                          >
                            {gio}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-6 mt-6">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary shadow-sm" />
                        <span className="text-xs font-medium text-gray-500">Đã chọn</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-gray-300 bg-white" />
                        <span className="text-xs font-medium text-gray-500">Còn trống</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-200" />
                        <span className="text-xs font-medium text-gray-500">Đã đặt</span>
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
                    <p className="text-primary font-bold text-sm mt-1">{dich_vu_da_chon?.gia.toLocaleString()}đ</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Chuyên viên</p>
                    <p className="font-bold text-gray-800 text-sm leading-tight">{ktv_da_chon?.ten}</p>
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

          <div className="flex justify-between items-center w-full mt-10 pt-6 border-t border-gray-100">
            <button
              onClick={() => setBuocHienTai(1)}
              className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Quay lại
            </button>
            <button
              disabled={!ngay_da_chon || !gio_da_chon || dang_gui}
              onClick={xửLýChốtLịch}
              className="px-12 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {dang_gui ? "Đang xử lý..." : "Xác nhận lịch"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
