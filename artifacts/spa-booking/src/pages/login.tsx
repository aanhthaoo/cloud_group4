import React, { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password, turnstileToken ?? undefined);
      toast.success("Đăng nhập thành công!");
      setLocation("/");
    } catch (err: any) {
      toast.error(err.message || "Đã có lỗi xảy ra");
      // Reset Turnstile để người dùng xác minh lại
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-secondary/30 to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="text-center space-y-2 pt-8">
          <div className="font-serif text-3xl font-bold text-primary mb-2 flex justify-center items-center gap-2">
            <span>✿</span> LotusGlow
          </div>
          <CardTitle className="text-2xl font-serif text-foreground">Chào mừng trở lại</CardTitle>
          <CardDescription className="text-base">
            Đăng nhập để quản lý lịch hẹn và điểm tích lũy
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email / Số điện thoại</Label>
              <Input
                id="email"
                type="text"
                placeholder="Nhập email hoặc số điện thoại"
                className="h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-login-email"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Mật khẩu</Label>
                <Link href="#" className="text-sm font-medium text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-login-password"
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8">
            {/* Cloudflare Turnstile widget */}
            <div className="w-full flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token: string) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken(null)}
                onError={() => {
                  setTurnstileToken(null);
                  toast.error("Xác minh bảo mật thất bại, vui lòng thử lại.");
                }}
                options={{ theme: "auto" }}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-lg shadow-sm"
              data-testid="button-login-submit"
              disabled={isLoading || !turnstileToken}
            >
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Đăng ký ngay
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
//trigger