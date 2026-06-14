import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, Flower, Droplets } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 flex-1 flex items-center bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6">
            Nơi Vẻ Đẹp <span className="text-primary">Bừng Sáng</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Trải nghiệm không gian thư giãn đẳng cấp và các dịch vụ chăm sóc sắc đẹp chuyên sâu tại LotusGlow Spa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full shadow-md hover:shadow-lg transition-all" data-testid="button-book-now">
                Đặt lịch ngay
              </Button>
            </Link>
            <Link href="/membership">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full border-2" data-testid="button-membership">
                Thẻ thành viên
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full border-2 border-secondary-foreground text-secondary-foreground hover:bg-secondary/30" data-testid="button-register-home">
                Đăng ký ngay
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Highlight */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-4">Dịch vụ nổi bật</h2>
            <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-secondary/30 rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform duration-300">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-primary">
                <Flower className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Massage thư giãn</h3>
              <p className="text-muted-foreground mb-4 text-sm">Liệu pháp massage toàn thân giúp giải tỏa căng thẳng và phục hồi năng lượng.</p>
              <div className="flex items-center justify-center gap-1 text-sm text-primary font-medium">
                <Clock className="w-4 h-4" /> 90 phút
              </div>
            </div>

            <div className="bg-primary/10 rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform duration-300">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-primary">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Chăm sóc da mặt</h3>
              <p className="text-muted-foreground mb-4 text-sm">Làm sạch sâu và cung cấp dưỡng chất thiết yếu cho làn da sáng mịn.</p>
              <div className="flex items-center justify-center gap-1 text-sm text-primary font-medium">
                <Clock className="w-4 h-4" /> 60 phút
              </div>
            </div>

            <div className="bg-secondary/30 rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform duration-300">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-primary">
                <Droplets className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nails & Pedicure</h3>
              <p className="text-muted-foreground mb-4 text-sm">Chăm sóc móng chuyên nghiệp với các sản phẩm sơn cao cấp.</p>
              <div className="flex items-center justify-center gap-1 text-sm text-primary font-medium">
                <Clock className="w-4 h-4" /> 75 phút
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/services">
              <Button variant="outline" className="rounded-full px-8 border-primary text-primary hover:bg-primary/10" data-testid="button-view-all-services">
                Xem tất cả dịch vụ
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
