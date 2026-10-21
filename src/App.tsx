import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import SiteLayout from "@/components/SiteLayout";
import Index from "@/pages/Index";
import LearningPathways from "@/pages/LearningPathways";
import Memberships from "@/pages/Memberships";
import About from "@/pages/About";
import AccountPage from "@/pages/AccountPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/learning-pathways" element={<LearningPathways />} />
            <Route path="/memberships" element={<Memberships />} />
            <Route path="/about" element={<About />} />
            <Route path="/sign-in" element={<AccountPage key="sign-in" mode="sign-in" />} />
            <Route path="/sign-up" element={<AccountPage key="sign-up" mode="sign-up" />} />
            <Route path="/password-reset" element={<AccountPage key="password-reset" mode="password-reset" />} />
            {/* An unverified redirect must never display a payment success claim. */}
            <Route path="/payment/success" element={<Navigate to="/memberships" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
