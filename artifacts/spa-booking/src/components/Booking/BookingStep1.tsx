import React from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Clock, Flower, Sparkles, Droplets, Scissors, Heart } from "lucide-react";

const mockServices = [
  { id: 1, name: "Massage thư giãn", duration: 90, price: "450,000đ", description: "Trị liệu toàn thân", icon: <Flower className="w-8 h-8 text-primary" /> },
  { id: 2, name: "Chăm sóc da mặt", duration: 60, price: "380,000đ", description: "Làm sạch và cấp ẩm", icon: <Sparkles className="w-8 h-8 text-primary" /> },
  { id: 3, name: "Nails & Pedicure", duration: 75, price: "280,000đ", description: "Chăm sóc móng", icon: <Droplets className="w-8 h-8 text-primary" /> },
  { id: 4, name: "Waxing", duration: 45, price: "200,000đ", description: "Waxing các vùng", icon: <Scissors className="w-8 h-8 text-primary" /> },
  { id: 5, name: "Gói Cô Dâu", duration: 180, price: "1,200,000đ", description: "Chăm sóc toàn diện", icon: <Heart className="w-8 h-8 text-primary" /> },
];

const mockTechnicians = [
  { id: 1, name: "Thư Ngân", specialty: "Massage", rating: 4.9, avatar_initials: "TN" },
  { id: 2, name: "Hồng Anh", specialty: "Da mặt", rating: 4.8, avatar_initials: "HA" },
  { id: 3, name: "Lan Phương", specialty: "Nails", rating: 4.7, avatar_initials: "LP" },
  { id: 4, name: "Kim Yến", specialty: "Waxing", rating: 4.9, avatar_initials: "KY" },
];

export default function BookingStep1({ 
  selectedService, setSelectedService, 
  selectedTech, setSelectedTech 
}: any) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold mb-4 text-foreground">1. Chọn dịch vụ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockServices.map((service) => (
            <Card 
              key={service.id}
              data-testid={`card-service-${service.id}`}
              className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${selectedService?.id === service.id ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}
              onClick={() => setSelectedService(service)}
            >
              <div className="flex items-start gap-4">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm shrink-0">
                  {service.icon}
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{service.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{service.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> {service.duration}'</span>
                    <span className="font-semibold text-primary">{service.price}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4 text-foreground">2. Chọn kỹ thuật viên</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockTechnicians.map((tech) => (
            <Card 
              key={tech.id}
              data-testid={`card-technician-${tech.id}`}
              className={`p-4 cursor-pointer text-center transition-all hover:border-secondary-foreground/50 ${selectedTech?.id === tech.id ? 'border-secondary-foreground ring-1 ring-secondary-foreground bg-secondary/20' : ''}`}
              onClick={() => setSelectedTech(tech)}
            >
              <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-secondary">
                <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
                  {tech.avatar_initials}
                </AvatarFallback>
              </Avatar>
              <h4 className="font-medium text-foreground">{tech.name}</h4>
              <p className="text-xs text-muted-foreground mb-2">{tech.specialty}</p>
              <div className="flex items-center justify-center text-xs text-amber-500 font-medium">
                <Star className="w-3 h-3 fill-current mr-1" /> {tech.rating}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
