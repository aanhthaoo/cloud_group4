import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle } from "lucide-react";

const MOCK_ACCOUNTS = [
  { email: "hoa@lotusglow.vn", password: "123456", name: "Nguyễn Thị Hoa" },
  { email: "admin@lotusglow.vn", password: "admin123", name: "Quản lý Spa" },
];

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const matched = MOCK_ACCOUNTS.find(
      (a) => a.email === email.trim() && a.password === password
    );
    if (!matched) {
      setError("Email hoặc mật khẩu không đúng. Vui lòng thử lại.");
      return;
    }
    login(email.trim(), matched.name);
    setLocation("/");
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
            {/* Mock credentials hint */}
            <div className="bg-secondary/40 border border-secondary-foreground/20 rounded-xl p-4 text-xs space-y-2">
              <p className="font-semibold text-secondary-foreground text-sm">Tài khoản demo:</p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <button
                    type="button"
                    className="font-mono font-medium text-primary hover:underline"
                    onClick={() => { setEmail("hoa@lotusglow.vn"); setPassword("123456"); }}
                  >
                    hoa@lotusglow.vn
                  </button>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mật khẩu:</span>
                  <span className="font-mono font-medium">123456</span>
                </div>
              </div>
              <p className="text-muted-foreground text-[11px] pt-1">Nhấn vào email để tự động điền.</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm" data-testid="text-login-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

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
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8">
            <Button type="submit" className="w-full h-12 text-lg shadow-sm" data-testid="button-login-submit">
              Đăng nhập
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
