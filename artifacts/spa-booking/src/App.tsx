import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Booking from "@/pages/booking";
import Payment from "@/pages/payment";
import Membership from "@/pages/membership";
import Login from "@/pages/login";
import Register from "@/pages/register";
import BookingStatus from "@/pages/booking-status";
import BookingHistory from "@/pages/booking-history";
import Services from "@/pages/services";
import Profile from "@/pages/profile";
import Navbar from "@/components/layout/Navbar";
import ChatWidget from "@/components/Chat/ChatWidget";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoggedIn) setLocation("/login");
  }, [isLoggedIn]);

  if (!isLoggedIn) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/services" component={Services} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Protected routes */}
      <Route path="/booking">
        {() => <AuthGuard><Booking /></AuthGuard>}
      </Route>
      <Route path="/payment">
        {() => <AuthGuard><Payment /></AuthGuard>}
      </Route>
      <Route path="/membership">
        {() => <AuthGuard><Membership /></AuthGuard>}
      </Route>
      <Route path="/booking-status">
        {() => <AuthGuard><BookingStatus /></AuthGuard>}
      </Route>
      <Route path="/booking-history">
        {() => <AuthGuard><BookingHistory /></AuthGuard>}
      </Route>
      <Route path="/profile">
        {() => <AuthGuard><Profile /></AuthGuard>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Navbar />
            <Router />
            <ChatWidget />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
