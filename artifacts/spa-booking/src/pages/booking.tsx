import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import BookingStep1 from "@/components/Booking/BookingStep1";
import BookingStep2 from "@/components/Booking/BookingStep2";

export default function Booking() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedTech, setSelectedTech] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  
  const [countdown, setCountdown] = useState(900); // 15 mins
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isLocked && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else if (countdown === 0 && isLocked) {
      setIsLocked(false);
      setStep(1); // Reset
    }
    return () => clearInterval(timer);
  }, [isLocked, countdown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (step === 1 && selectedService && selectedTech) {
      setStep(2);
    } else if (step === 2 && selectedDate && selectedTime) {
      setIsLocked(true);
      setTimeout(() => {
        setLocation("/payment");
      }, 1000);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Đặt Lịch Hẹn</h1>
          <p className="text-muted-foreground">Vui lòng chọn dịch vụ và thời gian mong muốn</p>
        </div>

        {isLocked && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/20 text-primary-foreground border border-primary/30 p-4 rounded-lg flex items-center justify-center gap-3 mb-6 shadow-sm"
          >
            <Clock className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Khóa tạm thời {formatTime(countdown)} phút để bạn thanh toán.</span>
          </motion.div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 md:p-8">
          {/* Progress Indicator */}
          <div className="flex items-center mb-8">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              2
            </div>
          </div>

          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <BookingStep1 
                    selectedService={selectedService} 
                    setSelectedService={setSelectedService}
                    selectedTech={selectedTech}
                    setSelectedTech={setSelectedTech}
                  />
                </motion.div>
              )}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <BookingStep2 
                    selectedService={selectedService}
                    selectedTech={selectedTech}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    selectedTime={selectedTime}
                    setSelectedTime={setSelectedTime}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 pt-6 border-t border-border flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              disabled={step === 1 || isLocked}
              data-testid="button-booking-back"
            >
              Quay lại
            </Button>
            <Button 
              onClick={handleNext} 
              data-testid="button-booking-next"
              disabled={
                (step === 1 && (!selectedService || !selectedTech)) || 
                (step === 2 && (!selectedDate || !selectedTime)) ||
                isLocked
              }
            >
              {step === 2 ? 'Xác nhận lịch' : 'Tiếp tục'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
