import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, ChevronDown } from "lucide-react";

export default function Navbar() {
  const { isLoggedIn, user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setLocation("/");
  };

  const userName = user?.name || "User";
  const initials = userName
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() ?? "?";

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="font-serif text-2xl font-bold text-primary flex items-center gap-2">
              <span>✿</span> LotusGlow
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden sm:flex sm:space-x-8 items-center">
            <Link href="/services" className="text-foreground hover:text-primary px-3 py-2 text-sm font-medium transition-colors" data-testid="nav-services">
              Dịch vụ
            </Link>
            <Link href="/booking" className="text-foreground hover:text-primary px-3 py-2 text-sm font-medium transition-colors" data-testid="nav-booking">
              Đặt lịch
            </Link>
            <Link href="/membership" className="text-foreground hover:text-primary px-3 py-2 text-sm font-medium transition-colors" data-testid="nav-membership">
              Thẻ thành viên
            </Link>

            {isLoggedIn ? (
              <div className="relative ml-4">
                <button
                  className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border border-primary/20 hover:bg-primary/5 transition-colors"
                  onClick={() => setDropdownOpen((v) => !v)}
                  data-testid="button-user-menu"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary-foreground flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-foreground max-w-[100px] truncate">{userName.split(" ").pop()}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-xl shadow-lg py-1 z-50">
                    <Link href="/profile" onClick={() => setDropdownOpen(false)}>
                      <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-primary/5 cursor-pointer" data-testid="nav-profile">
                        <User className="w-4 h-4 text-primary" /> Hồ sơ của tôi
                      </div>
                    </Link>
                    <Link href="/booking-history" onClick={() => setDropdownOpen(false)}>
                      <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-primary/5 cursor-pointer" data-testid="nav-booking-history">
                        <span className="w-4 h-4 text-primary text-xs flex items-center justify-center">📋</span> Lịch sử đặt hẹn
                      </div>
                    </Link>
                    <div className="border-t border-border/60 mt-1 pt-1">
                      <button
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full text-left"
                        onClick={handleLogout}
                        data-testid="nav-logout"
                      >
                        <LogOut className="w-4 h-4" /> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-4">
                <Link href="/login">
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary/10" data-testid="nav-login">
                    Đăng nhập
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="shadow-sm" data-testid="nav-register">
                    Đăng ký
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile */}
          <div className="sm:hidden flex items-center gap-2">
            {isLoggedIn ? (
              <Link href="/profile">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary-foreground flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm" className="border-primary text-primary">
                    Đăng nhập
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Đăng ký</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
      )}
    </nav>
  );
}
