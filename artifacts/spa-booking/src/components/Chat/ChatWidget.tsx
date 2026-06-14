import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: number;
  from: "bot" | "system";
  text: string;
}

const initialMessages: Message[] = [
  { id: 1, from: "bot", text: "Xin chào! Tôi là trợ lý ảo của LotusGlow Spa. 🌸" },
  { id: 2, from: "bot", text: "Tôi có thể giúp gì cho bạn hôm nay?" },
];

export default function ChatWidget() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [handoffTriggered, setHandoffTriggered] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleToggle = () => {
    if (!isLoggedIn) {
      setLocation("/login");
      return;
    }
    setIsOpen((v) => !v);
  };

  const handleHandoff = () => {
    if (handoffTriggered) return;
    setHandoffTriggered(true);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), from: "system", text: "Đang kết nối bạn với nhân viên hỗ trợ... Vui lòng chờ trong giây lát." },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
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
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-white" onClick={() => setIsOpen(false)} data-testid="button-close-chat">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="p-4 flex flex-col gap-3 h-[240px] overflow-y-auto bg-slate-50/50">
                {messages.map((msg) =>
                  msg.from === "bot" ? (
                    <div key={msg.id} className="flex gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs shrink-0">AI</div>
                      <div className="bg-white border border-border rounded-2xl rounded-tl-none p-3 text-sm shadow-sm">{msg.text}</div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex gap-2">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <Headphones className="w-4 h-4 text-secondary-foreground" />
                      </div>
                      <div className="bg-secondary/30 border border-secondary/40 rounded-2xl rounded-tl-none p-3 text-sm text-secondary-foreground shadow-sm">{msg.text}</div>
                    </div>
                  )
                )}
                <div ref={bottomRef} />
              </CardContent>

              <CardFooter className="p-3 bg-white border-t flex flex-col gap-2 rounded-b-lg">
                <div className="flex gap-2 w-full">
                  <Link href="/booking" onClick={() => setIsOpen(false)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs text-primary border-primary hover:bg-primary hover:text-primary-foreground" data-testid="button-chat-booking">
                      Đặt lịch ngay
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="flex-1 text-xs text-secondary-foreground border-secondary-foreground hover:bg-secondary hover:text-secondary-foreground" onClick={() => setIsOpen(false)} data-testid="button-chat-services">
                    Xem dịch vụ
                  </Button>
                </div>
                <Button
                  variant={handoffTriggered ? "ghost" : "outline"}
                  size="sm"
                  className={`w-full text-xs gap-1.5 ${handoffTriggered ? "text-muted-foreground cursor-default" : "text-orange-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400"}`}
                  onClick={handleHandoff}
                  disabled={handoffTriggered}
                  data-testid="button-chat-handoff"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  {handoffTriggered ? "Đang kết nối nhân viên..." : "Gặp nhân viên hỗ trợ"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center ml-auto"
        aria-label="Toggle chat"
        data-testid="button-toggle-chat"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>
    </div>
  );
}
