import { Elements } from "@stripe/react-stripe-js";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PaymentForm } from "@/components/payments/PaymentForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { createPaymentIntent } from "@/lib/payments/create-payment-intent";
import {
  getPaymentConfigurationError,
  getStripePromise,
} from "@/lib/payments/config";

type PaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency?: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  successPath?: string;
  functionName?: string;
  metadata?: Record<string, string>;
  onSuccess?: () => void;
};

export function PaymentDialog({
  open,
  onOpenChange,
  amount,
  currency = "usd",
  title = "Complete payment",
  description = "Secure payment powered by Stripe.",
  submitLabel = "Pay now",
  successPath = "/payment/success",
  functionName = "create-payment-intent",
  metadata,
  onSuccess,
}: PaymentDialogProps) {
  const navigate = useNavigate();
  const stripePromise = useMemo(() => getStripePromise(), []);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    const configError = getPaymentConfigurationError();
    if (configError) {
      setClientSecret(null);
      setErrorMessage(configError);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadClientSecret = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const secret = await createPaymentIntent({
          amount,
          currency,
          functionName,
          metadata,
        });

        if (!cancelled) {
          setClientSecret(secret);
        }
      } catch (error) {
        if (!cancelled) {
          setClientSecret(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to start payment. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadClientSecret();

    return () => {
      cancelled = true;
    };
  }, [amount, currency, functionName, metadata, open, reloadNonce]);

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
    navigate(successPath);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment unavailable</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-3 rounded-xl border border-border p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        )}

        {!isLoading && !errorMessage && clientSecret && stripePromise && (
          <Elements
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
              },
            }}
            stripe={stripePromise}
          >
            <PaymentForm onSuccess={handleSuccess} submitLabel={submitLabel} />
          </Elements>
        )}

        {!isLoading && !clientSecret && errorMessage && (
          <Button
            onClick={() => {
              setErrorMessage(null);
              setClientSecret(null);
              setIsLoading(false);
              setReloadNonce((current) => current + 1);
            }}
            type="button"
            variant="outline"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
