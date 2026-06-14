import React from "react";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Clock, Calendar } from "lucide-react";

const mockTimeSlots = [
  { time: "09:00", isAvailable: true },
  { time: "10:30", isAvailable: true },
  { time: "12:00", isAvailable: false },
  { time: "13:30", isAvailable: true },
  { time: "15:00", isAvailable: false },
  { time: "16:30", isAvailable: true },
  { time: "18:00", isAvailable: true },
  { time: "19:30", isAvailable: false },
];

export default function BookingStep2({
  selectedService, selectedTech,
  selectedDate, setSelectedDate,
  selectedTime, setSelectedTime
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-foreground">3. Chọn ngày & giờ</h3>
          <div className="space-y-6 max-w-md">
            {/* Date picker */}
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-1.5 text-sm font-medium">
                <Calendar className="w-4 h-4 text-primary" /> Ngày đặt lịch
              </Label>
              <input
                type="date"
                id="date"
                data-testid="input-booking-date"
                className="w-full flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime("");
                }}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Time slot grid */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Clock className="w-4 h-4 text-primary" /> Giờ hẹn
              </Label>

              {!selectedDate ? (
                <p className="text-sm text-muted-foreground italic">Vui lòng chọn ngày trước.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2" data-testid="grid-time-slots">
                  {mockTimeSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        data-testid={`btn-timeslot-${slot.time}`}
                        disabled={!slot.isAvailable}
                        onClick={() => slot.isAvailable && setSelectedTime(slot.time)}
                        className={`
                          relative h-12 rounded-xl text-sm font-medium border transition-all
                          ${!slot.isAvailable
                            ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                            : isSelected
                            ? "bg-primary border-primary text-primary-foreground shadow-md scale-105"
                            : "bg-white border-border text-foreground hover:border-primary hover:bg-primary/5 cursor-pointer"
                          }
                        `}
                      >
                        {slot.time}
                        {!slot.isAvailable && (
                          <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] leading-none text-gray-400">
                            Đã đặt
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedDate && (
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-primary inline-block" /> Đã chọn
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-white border border-border inline-block" /> Còn trống
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Đã đặt
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <Card className="p-6 bg-slate-50 border-border">
          <h3 className="font-semibold text-lg mb-4 border-b pb-2">Tóm tắt lịch hẹn</h3>

          <div className="space-y-4 text-sm">
            <div>
              <span className="text-muted-foreground block mb-1">Dịch vụ</span>
              <p className="font-medium text-foreground">{selectedService?.name || "Chưa chọn"}</p>
              <p className="text-primary">{selectedService?.price}</p>
            </div>

            <div>
              <span className="text-muted-foreground block mb-1">Kỹ thuật viên</span>
              <p className="font-medium text-foreground">
                {selectedTech ? `${selectedTech.name} (${selectedTech.specialty})` : "Chưa chọn"}
              </p>
            </div>

            <div>
              <span className="text-muted-foreground block mb-1">Thời gian</span>
              {selectedDate && selectedTime ? (
                <p className="font-medium text-foreground flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" /> {selectedDate.split("-").reverse().join("/")}
                  <span className="mx-1">•</span>
                  <Clock className="w-4 h-4 text-muted-foreground" /> {selectedTime}
                </p>
              ) : (
                <p className="text-muted-foreground italic">Chưa chọn</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
