import { CreditCard, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";

import { PaymentDialog } from "@/components/payments/PaymentDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PaymentStarterCardProps = {
  title?: string;
  description?: string;
  priceLabel?: string;
  amount: number;
  currency?: string;
  buttonLabel?: string;
  successPath?: string;
  bulletPoints?: string[];
};

export function PaymentStarterCard({
  title = "Premium access",
  description = "Use the payment starter to launch a real Stripe checkout flow quickly.",
  priceLabel = "$19",
  amount,
  currency = "usd",
  buttonLabel = "Get started now",
  successPath = "/payment/success",
  bulletPoints = [
    "Embedded Stripe payment dialog",
    "Success redirect with retryable flow",
    "Inline errors when payment setup fails",
  ],
}: PaymentStarterCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="w-full max-w-xl border-border/70 bg-background/95 shadow-xl">
        <CardHeader className="space-y-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            Payment starter
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl">{title}</CardTitle>
            <CardDescription className="text-base">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl bg-muted/60 p-5">
            <div className="text-sm text-muted-foreground">One-time payment</div>
            <div className="mt-1 text-4xl font-semibold tracking-tight">
              {priceLabel}
            </div>
          </div>

          <div className="space-y-3">
            {bulletPoints.map((item) => (
              <div className="flex items-center gap-3" key={item}>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3">
          <Button
            className="w-full"
            onClick={() => setOpen(true)}
            size="lg"
            type="button"
          >
            <Zap className="h-4 w-4" />
            {buttonLabel}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Ready for real Stripe + Supabase wiring without rebuilding the
            payment flow from scratch.
          </p>
        </CardFooter>
      </Card>

      <PaymentDialog
        amount={amount}
        currency={currency}
        onOpenChange={setOpen}
        open={open}
        successPath={successPath}
        title={title}
      />
    </>
  );
}
