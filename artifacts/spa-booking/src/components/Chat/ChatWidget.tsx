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

interface ChatResponse {
  reply: string;
  intent: string;
  languageCode: "vi" | "en";
  handoffRequired: boolean;
  handoffReason?: "user_requested" | "fallback_limit" | "low_confidence";
  confidence: number;
  isFallback: boolean;
}

interface HandoffResponse {
  ok: boolean;
  provider: "hubspot";
  openWidget: boolean;
  hubspotSaved: boolean;
  contactId?: string;
  noteId?: string;
  hubspotError?: string;
}

interface HandoffMetadata {
  handoffReason?: ChatResponse["handoffReason"];
  lastIntent?: string;
  lastConfidence?: number;
}

type HandoffStatus = "idle" | "connecting" | "connected";

const initialMessages: Message[] = [
  { id: 1, from: "bot", text: "Xin chào! Mình là lễ tân AI của LotusGlow Spa." },
  { id: 2, from: "bot", text: "Bạn muốn hỏi giờ mở cửa, xem bảng giá, làm trắc nghiệm tư vấn hay gặp nhân viên?" },
];

const hubSpotPortalId = import.meta.env.VITE_HUBSPOT_PORTAL_ID;
const hubSpotScriptHost = import.meta.env.VITE_HUBSPOT_SCRIPT_HOST || "js-na2.hs-scripts.com";

function createSessionId() {
  return `lotus-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId() {
  const storageKey = "lotus_chat_session_id";
  const existing = localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const sessionId = createSessionId();
  localStorage.setItem(storageKey, sessionId);
  return sessionId;
}

function waitForHubSpotWidget(timeoutMs = 8000) {
  return new Promise<boolean>((resolve) => {
    const startedAt = Date.now();

    const checkReady = () => {
      if (window.HubSpotConversations?.widget?.open) {
        resolve(true);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }

      setTimeout(checkReady, 250);
    };

    checkReady();
  });
}

function loadHubSpotWidget() {
  return new Promise<boolean>((resolve) => {
    let settled = false;

    const finish = (loaded: boolean) => {
      if (!settled) {
        settled = true;
        resolve(loaded);
      }
    };

    if (!hubSpotPortalId) {
      finish(false);
      return;
    }

    // Check that widget AND open() are both ready (not just the widget object)
    if (window.HubSpotConversations?.widget?.open) {
      finish(true);
      return;
    }

    // If widget object exists but open() not yet ready, wait for it
    if (window.HubSpotConversations?.widget) {
      waitForHubSpotWidget().then(finish);
      return;
    }

    window.hsConversationsOnReady = window.hsConversationsOnReady || [];
    window.hsConversationsOnReady.push(() => waitForHubSpotWidget().then(finish));

    const existingScript = document.getElementById("hs-script-loader");
    if (existingScript) {
      existingScript.addEventListener("load", () => waitForHubSpotWidget().then(finish), { once: true });
      waitForHubSpotWidget().then(finish);
      return;
    }

    const script = document.createElement("script");
    script.id = "hs-script-loader";
    script.async = true;
    script.defer = true;
    script.src = `https://${hubSpotScriptHost}/${hubSpotPortalId}.js`;
    script.onload = () => waitForHubSpotWidget().then(finish);
    script.onerror = () => finish(false);
    document.body.appendChild(script);
  });
}

function isHubSpotWidgetVisible() {
  // HubSpot injects an iframe with id="hubspot-messages-iframe-container" when the chat opens
  const container = document.getElementById("hubspot-messages-iframe-container");
  if (!container) return false;
  const style = window.getComputedStyle(container);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

async function openHubSpotChat() {
  // First, trigger load() to make the widget visible if it was hidden
  if (window.HubSpotConversations?.widget?.load) {
    window.HubSpotConversations.widget.load();
  }

  const ready = await loadHubSpotWidget();

  console.debug("[HubSpot] openHubSpotChat:", {
    ready,
    hasConversations: !!window.HubSpotConversations,
    hasWidget: !!window.HubSpotConversations?.widget,
    hasOpen: !!window.HubSpotConversations?.widget?.open,
    portalId: hubSpotPortalId,
  });

  if (ready && window.HubSpotConversations?.widget?.open) {
    // Trust HubSpot's own API — if open() exists and we can call it, the widget will open.
    // DOM visibility check was causing false negatives on production (iframe renders slower
    // or uses CSS class changes instead of display:none).
    window.HubSpotConversations.widget.open();
    return true;
  }

  return false;
}

export default function ChatWidget() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [handoffStatus, setHandoffStatus] = useState<HandoffStatus>("idle");
  const [hubSpotVisible, setHubSpotVisible] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sessionId = useMemo(getSessionId, []);

  // Watch for HubSpot launcher button appearing/disappearing in DOM
  useEffect(() => {
    const HS_CONTAINER_ID = "hubspot-messages-iframe-container";

    const checkVisibility = () => {
      const el = document.getElementById(HS_CONTAINER_ID);
      setHubSpotVisible(!!el);
    };

    // Initial check
    checkVisibility();

    const observer = new MutationObserver(checkVisibility);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (trang_thai_mo) tham_chieu_cuoi.current?.scrollIntoView({ behavior: "smooth" });
  }, [danh_sach_tin_nhan, trang_thai_mo]);

  const xu_ly_bat_tat = () => {
    if (!isLoggedIn) {
      setLocation("/login");
      return;
    }
    setIsOpen((v) => !v);
  };

  const appendSystemMessage = (text: string) => {
    setMessages((prev) => [...prev, { id: Date.now(), from: "system", text }]);
  };

  const handleHandoff = async (currentMessages = messages, metadata: HandoffMetadata = {}) => {
    if (handoffStatus === "connecting") return;

    setHandoffStatus("connecting");
    appendSystemMessage("Đang kết nối bạn với nhân viên hỗ trợ...");

    const payload = {
      sessionId,
      userEmail: user?.email,
      messageCount: currentMessages.length,
      reason: metadata?.handoffReason,
    };
    console.group(`[Chat:Handoff] POST /api/chat/handoff`);
    console.log("→ Request:", payload);

    try {
      const handoffResponse = await api.post<HandoffResponse>("/api/chat/handoff", {
        sessionId,
        user,
        transcript: currentMessages.map(({ from, text }) => ({ from, text })),
        metadata,
      });

      console.log("← Response:", {
        status: handoffResponse.status,
        hubspotSaved: handoffResponse.data.hubspotSaved,
        contactId: handoffResponse.data.contactId,
        noteId: handoffResponse.data.noteId,
        hubspotError: handoffResponse.data.hubspotError,
      });

      const opened = await openHubSpotChat();
      console.log("[Chat:Handoff] widget opened:", opened);
      console.groupEnd();

      if (!opened) {
        // Widget didn't appear — keep AI chat open and show a helpful message
        appendSystemMessage(
          handoffResponse.data.hubspotSaved
            ? "Transcript đã lưu vào HubSpot CRM. Cửa sổ chat nhân viên chưa mở được (có thể do trình duyệt chặn hoặc chatflow chưa target URL này). Vui lòng tải lại trang và thử lại."
            : "Chưa thể mở cửa sổ chat nhân viên. Vui lòng thử lại sau hoặc liên hệ qua số hotline."
        );
        setHandoffStatus("idle");
      } else {
        if (handoffResponse.data.hubspotSaved) {
          appendSystemMessage("Đã chuyển sang HubSpot LiveChat. Transcript cuộc trò chuyện đã được lưu vào HubSpot CRM để nhân viên tiếp tục tư vấn.");
        } else {
          appendSystemMessage("Đã mở HubSpot LiveChat. Bạn có thể gửi tin nhắn trực tiếp cho nhân viên hỗ trợ.");
        }
        setHandoffStatus("connected");
        setIsOpen(false);
      }
    } catch (error: unknown) {
      console.groupEnd();
      const axiosErr = error as { response?: { status: number; data: unknown }; message?: string };
      console.error("[Chat:Handoff] ✗ Error:", {
        status: axiosErr?.response?.status,
        body: axiosErr?.response?.data,
        message: axiosErr?.message,
      });
      appendSystemMessage("Chưa thể chuyển sang nhân viên lúc này. Bạn vui lòng thử lại sau.");
      setHandoffStatus("idle");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const messageText = input.trim();
    if (!messageText || isSending) return;

    const userMessage: Message = {
      id: Date.now(),
      from: "user",
      text: messageText,
    };

    const messagesWithUser = [...messages, userMessage];
    setMessages(messagesWithUser);
    setInput("");
    setIsSending(true);

    console.group(`[Chat] POST /api/chat/message`);
    console.log("→ Request:", { sessionId, message: messageText });

    try {
      const response = await api.post<ChatResponse>("/api/chat/message", {
        sessionId,
        message: messageText,
        user,
      });

      console.log("← Response:", {
        status: response.status,
        intent: response.data.intent,
        confidence: response.data.confidence,
        isFallback: response.data.isFallback,
        handoffRequired: response.data.handoffRequired,
        handoffReason: response.data.handoffReason,
      });
      console.groupEnd();

      const botMessage: Message = {
        id: Date.now() + 1,
        from: "bot",
        text: response.data.reply,
      };
      const nextMessages = [...messagesWithUser, botMessage];

      setMessages(nextMessages);

      if (response.data.handoffRequired) {
        await handleHandoff(nextMessages, {
          handoffReason: response.data.handoffReason,
          lastIntent: response.data.intent,
          lastConfidence: response.data.confidence,
        });
      }
    } catch (error: unknown) {
      console.groupEnd();
      const axiosErr = error as { response?: { status: number; data: unknown }; message?: string };
      console.error("[Chat] ✗ Error:", {
        status: axiosErr?.response?.status,
        body: axiosErr?.response?.data,
        message: axiosErr?.message,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          from: "system",
          text: "Mình chưa thể kết nối AI lúc này. Bạn vui lòng thử lại sau.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed right-6 z-50"
      style={{
        bottom: hubSpotVisible ? "88px" : "24px",
        transition: "bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
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
