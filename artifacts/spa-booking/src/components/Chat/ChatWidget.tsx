import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones, Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/axios";

declare global {
  interface Window {
    HubSpotConversations?: {
      widget?: {
        load?: () => void;
        open?: () => void;
        refresh?: () => void;
      };
    };
    hsConversationsOnReady?: Array<() => void>;
  }
}

interface Message {
  id: number;
  from: "bot" | "user" | "system";
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

    if (window.HubSpotConversations?.widget) {
      finish(true);
      return;
    }

    window.hsConversationsOnReady = window.hsConversationsOnReady || [];
    window.hsConversationsOnReady.push(() => finish(true));

    const existingScript = document.getElementById("hs-script-loader");
    if (existingScript) {
      existingScript.addEventListener("load", () => finish(true), { once: true });
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

async function openHubSpotChat() {
  const loaded = await loadHubSpotWidget();

  if (loaded && window.HubSpotConversations?.widget?.load) {
    window.HubSpotConversations.widget.load();
  }

  if (loaded && window.HubSpotConversations?.widget?.open) {
    window.HubSpotConversations.widget.open();
    return true;
  }

  if (hubSpotPortalId) {
    window.location.hash = "hs-chat-open";
    return true;
  }

  return false;
}

export default function ChatWidget() {
  const { isLoggedIn, user } = useAuth();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [handoffStatus, setHandoffStatus] = useState<HandoffStatus>("idle");
  const bottomRef = useRef<HTMLDivElement>(null);

  const sessionId = useMemo(getSessionId, []);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isSending]);

  const handleToggle = () => {
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

    try {
      const handoffResponse = await api.post<HandoffResponse>("/api/chat/handoff", {
        sessionId,
        user,
        transcript: currentMessages.map(({ from, text }) => ({ from, text })),
        metadata,
      });

      const opened = await openHubSpotChat();

      if (!opened) {
        appendSystemMessage("Chưa mở được HubSpot LiveChat. Kiểm tra VITE_HUBSPOT_PORTAL_ID, chatflow Published/On và Target All pages.");
      } else if (handoffResponse.data.hubspotSaved) {
        appendSystemMessage("Đã mở HubSpot LiveChat. Transcript đã được lưu vào HubSpot CRM để nhân viên tiếp tục tư vấn.");
      } else {
        appendSystemMessage("Đã mở HubSpot LiveChat, nhưng transcript chưa lưu được vào HubSpot CRM. Bạn vẫn có thể gửi tin nhắn trong cửa sổ HubSpot để nhân viên nhận được.");
      }

      setHandoffStatus(opened ? "connected" : "idle");
      if (opened) {
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Handoff error:", error);
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

    try {
      const response = await api.post<ChatResponse>("/api/chat/message", {
        sessionId,
        message: messageText,
        user,
      });

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
    } catch (error) {
      console.error("Chat error:", error);
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
            <Card className="w-[340px] shadow-xl border-primary/20">
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

              <CardContent className="p-4 flex flex-col gap-3 h-[320px] overflow-y-auto bg-slate-50/50">
                {messages.map((msg) => {
                  if (msg.from === "user") {
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-none p-3 text-sm shadow-sm max-w-[78%]">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex gap-2">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs shrink-0 ${msg.from === "bot" ? "bg-primary/20 text-primary" : "bg-secondary"}`}>
                        {msg.from === "bot" ? "AI" : <Headphones className="w-4 h-4 text-secondary-foreground" />}
                      </div>
                      <div className={`border rounded-2xl rounded-tl-none p-3 text-sm shadow-sm max-w-[78%] ${msg.from === "bot" ? "bg-white border-border" : "bg-secondary/30 border-secondary/40 text-secondary-foreground"}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                {isSending && (
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs shrink-0">AI</div>
                    <div className="bg-white border border-border rounded-2xl rounded-tl-none p-3 text-sm shadow-sm flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Đang trả lời...
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </CardContent>

              <CardFooter className="p-3 bg-white border-t flex flex-col gap-2 rounded-b-lg">
                <form onSubmit={handleSubmit} className="flex gap-2 w-full">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Nhập tin nhắn..."
                    disabled={isSending}
                    data-testid="input-chat-message"
                    className="h-9"
                  />
                  <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={isSending || !input.trim()} data-testid="button-send-chat">
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>

                <div className="flex gap-2 w-full">
                  <Link href="/booking" onClick={() => setIsOpen(false)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs text-primary border-primary hover:bg-primary hover:text-primary-foreground" data-testid="button-chat-booking">
                      Đặt lịch ngay
                    </Button>
                  </Link>
                  <Link href="/services" onClick={() => setIsOpen(false)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs text-secondary-foreground border-secondary-foreground hover:bg-secondary hover:text-secondary-foreground" data-testid="button-chat-services">
                      Xem dịch vụ
                    </Button>
                  </Link>
                </div>
                <Button
                  variant={handoffStatus !== "idle" ? "ghost" : "outline"}
                  size="sm"
                  className={`w-full text-xs gap-1.5 ${handoffStatus !== "idle" ? "text-muted-foreground cursor-default" : "text-orange-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400"}`}
                  onClick={() => handleHandoff(messages, { handoffReason: "user_requested" })}
                  disabled={handoffStatus === "connecting"}
                  data-testid="button-chat-handoff"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  {handoffStatus === "connecting"
                    ? "Đang kết nối nhân viên..."
                    : handoffStatus === "connected"
                    ? "Đã chuyển sang HubSpot"
                    : "Gặp nhân viên hỗ trợ"}
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
