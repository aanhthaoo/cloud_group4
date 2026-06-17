import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: number;
  from: "he_thong";
  text: string;
}

export default function ChatWidget() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [trang_thai_mo, dat_trang_thai_mo] = useState(false);
  const [danh_sach_tin_nhan, dat_danh_sach_tin_nhan] = useState<Message[]>([]);
  const [da_yeu_cau_ho_tro, dat_da_yeu_cau_ho_tro] = useState(false);
  const tham_chieu_cuoi = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trang_thai_mo) tham_chieu_cuoi.current?.scrollIntoView({ behavior: "smooth" });
  }, [danh_sach_tin_nhan, trang_thai_mo]);

  const xu_ly_bat_tat = () => {
    if (!isLoggedIn) {
      setLocation("/login");
      return;
    }
    dat_trang_thai_mo((gia_tri_hien_tai) => !gia_tri_hien_tai);
  };

  const xu_ly_yeu_cau_ho_tro = () => {
    if (da_yeu_cau_ho_tro) return;
    dat_da_yeu_cau_ho_tro(true);
    dat_danh_sach_tin_nhan((danh_sach_hien_tai) => [
      ...danh_sach_hien_tai,
      {
        id: Date.now(),
        from: "he_thong",
        text: "Đang chờ tích hợp API chat để kết nối với nhân viên hỗ trợ.",
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {trang_thai_mo && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 origin-bottom-right"
          >
            <Card className="w-[320px] shadow-xl border-primary/20">
              <CardHeader className="bg-primary/10 py-3 px-4 flex flex-row items-center justify-between rounded-t-lg border-b border-primary/10">
                <div className="font-medium text-foreground flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                  </span>
                  Lễ tân AI
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-white" onClick={() => dat_trang_thai_mo(false)} data-testid="button-close-chat">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="p-4 flex flex-col gap-3 h-[240px] overflow-y-auto bg-slate-50/50">
                <p className="text-sm text-muted-foreground" data-testid="khung-chat-api">
                  Khung chat đang chờ tích hợp API hội thoại và lịch sử tin nhắn.
                </p>
                {danh_sach_tin_nhan.map((tin_nhan) => (
                  <div key={tin_nhan.id} className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Headphones className="w-4 h-4 text-secondary-foreground" />
                    </div>
                    <div className="bg-secondary/30 border border-secondary/40 rounded-2xl rounded-tl-none p-3 text-sm text-secondary-foreground shadow-sm">
                      {tin_nhan.text}
                    </div>
                  </div>
                ))}
                <div ref={tham_chieu_cuoi} />
              </CardContent>

              <CardFooter className="p-3 bg-white border-t flex flex-col gap-2 rounded-b-lg">
                <Button
                  variant={da_yeu_cau_ho_tro ? "ghost" : "outline"}
                  size="sm"
                  className={`w-full text-xs gap-1.5 ${da_yeu_cau_ho_tro ? "text-muted-foreground cursor-default" : "text-orange-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400"}`}
                  onClick={xu_ly_yeu_cau_ho_tro}
                  disabled={da_yeu_cau_ho_tro}
                  data-testid="button-chat-handoff"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  {da_yeu_cau_ho_tro ? "Đang chờ API hỗ trợ..." : "Gặp nhân viên hỗ trợ"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={xu_ly_bat_tat}
        className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center ml-auto"
        aria-label="Toggle chat"
        data-testid="button-toggle-chat"
      >
        {trang_thai_mo ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>
    </div>
  );
}
