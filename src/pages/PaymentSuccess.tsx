import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-200 bg-white p-10 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Payment successful
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your checkout flow completed successfully. You can go back home and
          trigger the payment flow again.
        </p>
        <Button
          className="mt-8"
          onClick={() => navigate("/")}
          type="button"
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Button>
      </div>
    </div>
  );
}
