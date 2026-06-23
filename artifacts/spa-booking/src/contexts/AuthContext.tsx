import React, { createContext, useContext, useState } from "react";
import api from "../lib/axios";

interface User {
  uid?: string;
  name: string;
  email: string;
  phone: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  login: (email: string, password?: string, cfTurnstileResponse?: string) => Promise<void>;
  register: (data: { email: string; password?: string; fullName: string; phoneNumber: string; cfTurnstileResponse?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("lotus_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = async (email: string, password?: string, cfTurnstileResponse?: string) => {
    try {
      const response = await api.post("/api/auth/login", { email, password, cfTurnstileResponse });
      
      const backendData = response.data?.data || {};
      const userData = {
        ...backendData,
        name: backendData.fullName || backendData.name || "Người dùng hệ thống",
        email: backendData.email || email,
        phone: backendData.phoneNumber || backendData.phone || ""
      };
      
      localStorage.setItem("lotus_user", JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại.";
      throw new Error(errorMsg);
    }
  };

  const register = async (data: { email: string; password?: string; fullName: string; phoneNumber: string; cfTurnstileResponse?: string }) => {
    try {
      const response = await api.post("/api/auth/register", data);
      
      const backendData = response.data?.data || {};
      const userData = {
        ...backendData,
        name: backendData.fullName || backendData.name || data.fullName,
        email: backendData.email || data.email,
        phone: backendData.phoneNumber || backendData.phone || data.phoneNumber
      };
      
      // Tự động đăng nhập sau khi đăng ký thành công
      localStorage.setItem("lotus_user", JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.";
      throw new Error(errorMsg);
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (e) {
      console.warn("Lỗi khi gọi API logout", e);
    } finally {
      localStorage.removeItem("lotus_user");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
