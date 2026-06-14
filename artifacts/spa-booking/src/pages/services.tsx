import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Flower, Sparkles, Scissors, Droplets, Heart } from "lucide-react";

const services = [
  {
    id: 1,
    icon: Flower,
    name: "Massage thư giãn",
    tagline: "Liệu pháp phục hồi toàn thân",
    duration: "90 phút",
    price: "450,000đ",
    rating: 4.9,
    reviews: 128,
    color: "bg-pink-50 border-pink-200",
    iconColor: "text-pink-400",
    badge: "Bán chạy nhất",
    badgeColor: "bg-pink-100 text-pink-700",
    description:
      "Liệu pháp massage toàn thân với tinh dầu thiên nhiên, kết hợp kỹ thuật Thụy Điển và Á Đông giúp giải phóng căng thẳng cơ bắp, cải thiện tuần hoàn máu và phục hồi năng lượng sau ngày dài.",
    benefits: ["Giảm căng thẳng cơ bắp", "Cải thiện tuần hoàn", "Ngủ sâu hơn", "Tăng cường miễn dịch"],
  },
  {
    id: 2,
    icon: Sparkles,
    name: "Chăm sóc da mặt",
    tagline: "Da sáng mịn từ sâu bên trong",
    duration: "60 phút",
    price: "380,000đ",
    rating: 4.8,
    reviews: 95,
    color: "bg-purple-50 border-purple-200",
    iconColor: "text-purple-400",
    badge: "Được yêu thích",
    badgeColor: "bg-purple-100 text-purple-700",
    description:
      "Quy trình chăm sóc da chuyên sâu gồm tẩy tế bào chết, đắp mặt nạ collagen và massage dưỡng ẩm. Thích hợp cho mọi loại da, giúp tái tạo và làm sáng làn da tự nhiên.",
    benefits: ["Làm sạch sâu lỗ chân lông", "Cấp ẩm chuyên sâu", "Giảm nếp nhăn", "Da sáng mịn tức thì"],
  },
  {
    id: 3,
    icon: Scissors,
    name: "Nails & Pedicure",
    tagline: "Đôi tay đôi chân hoàn hảo",
    duration: "75 phút",
    price: "280,000đ",
    rating: 4.7,
    reviews: 76,
    color: "bg-rose-50 border-rose-200",
    iconColor: "text-rose-400",
    badge: "",
    badgeColor: "",
    description:
      "Dịch vụ làm móng chuyên nghiệp với sản phẩm cao cấp không chứa hóa chất độc hại. Bao gồm ngâm tay/chân, tẩy da chết, dũa tạo hình và sơn gel bền màu lên đến 3 tuần.",
    benefits: ["Gel bền màu 3 tuần", "Sản phẩm an toàn", "Tạo hình chuyên nghiệp", "Ngâm dưỡng thư giãn"],
  },
  {
    id: 4,
    icon: Droplets,
    name: "Waxing",
    tagline: "Làn da mịn màng, sạch bóng",
    duration: "45 phút",
    price: "200,000đ",
    rating: 4.6,
    reviews: 54,
    color: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-400",
    badge: "",
    badgeColor: "",
    description:
      "Triệt lông bằng sáp tự nhiên không gây kích ứng da, phù hợp cho cả da nhạy cảm. Kết quả mịn màng kéo dài 4–6 tuần, lông mọc lại mềm hơn và thưa hơn qua từng lần.",
    benefits: ["Lông mọc lại mềm hơn", "Kết quả 4–6 tuần", "Phù hợp da nhạy cảm", "Nhanh – gọn – hiệu quả"],
  },
  {
    id: 5,
    icon: Heart,
    name: "Gói Cô Dâu",
    tagline: "Tỏa sáng trong ngày trọng đại",
    duration: "180 phút",
    price: "1,200,000đ",
    rating: 5.0,
    reviews: 42,
    color: "bg-fuchsia-50 border-fuchsia-200",
    iconColor: "text-fuchsia-400",
    badge: "Cao cấp",
    badgeColor: "bg-fuchsia-100 text-fuchsia-700",
    description:
      "Gói chăm sóc trọn vẹn dành riêng cho cô dâu gồm: massage thư giãn, chăm sóc da mặt, làm móng tay và chân, trang điểm nhẹ. Bạn sẽ tỏa sáng rạng rỡ trong ngày cưới đặc biệt.",
    benefits: ["Trọn gói massage + da mặt", "Nails tay + chân", "Trang điểm nhẹ", "Ưu tiên đặt lịch"],
  },
];

export default function Services() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-3">
            Dịch vụ của <span className="text-primary">LotusGlow</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Mỗi dịch vụ được thiết kế tỉ mỉ để mang lại trải nghiệm thư giãn và làm đẹp đỉnh cao.
          </p>
          <div className="h-1 w-20 bg-primary mx-auto rounded-full mt-4" />
        </div>

        {/* Service cards */}
        <div className="space-y-6">
          {services.map((svc) => {
            const Icon = svc.icon;
            return (
              <Card
                key={svc.id}
                className={`border-2 shadow-sm hover:shadow-md transition-shadow ${svc.color}`}
                data-testid={`card-service-${svc.id}`}
              >
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Icon */}
                    <div className="shrink-0 flex md:flex-col items-center gap-4 md:gap-2">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                        <Icon className={`w-8 h-8 ${svc.iconColor}`} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-start gap-2">
                        <div>
                          <h2 className="text-xl font-semibold text-foreground">{svc.name}</h2>
                          <p className="text-sm text-muted-foreground">{svc.tagline}</p>
                        </div>
                        {svc.badge && (
                          <Badge className={`${svc.badgeColor} border-0 text-xs ml-auto`}>
                            {svc.badge}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-foreground/80 leading-relaxed">{svc.description}</p>

                      {/* Benefits */}
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {svc.benefits.map((b) => (
                          <li key={b} className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Price & CTA */}
                    <div className="shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:gap-3 md:min-w-[140px]">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{svc.price}</p>
                        <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground mt-1">
                          <Clock className="w-3.5 h-3.5" /> {svc.duration}
                        </div>
                        <div className="flex items-center gap-1 justify-end text-xs text-amber-500 mt-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400" /> {svc.rating}
                          <span className="text-muted-foreground">({svc.reviews})</span>
                        </div>
                      </div>
                      <Link href="/booking">
                        <Button
                          size="sm"
                          className="rounded-full px-5"
                          data-testid={`button-book-service-${svc.id}`}
                        >
                          Đặt lịch
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">Chưa có tài khoản? Đăng ký để nhận ưu đãi thành viên</p>
          <div className="flex gap-3 justify-center">
            <Link href="/register">
              <Button data-testid="button-services-register">Đăng ký miễn phí</Button>
            </Link>
            <Link href="/booking">
              <Button variant="outline" data-testid="button-services-book">Đặt lịch ngay</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
