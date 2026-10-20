import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type PaymentFormProps = {
  submitLabel?: string;
  onSuccess?: () => void;
};

export function PaymentForm({
  submitLabel = "Pay now",
  onSuccess,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage("Payment form is still loading. Try again in a moment.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (result.error) {
      setErrorMessage(result.error.message ?? "Payment failed. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const status = result.paymentIntent?.status;
    if (status === "succeeded" || status === "processing") {
      onSuccess?.();
      return;
    }

    setErrorMessage("Payment did not complete. Please try again.");
    setIsSubmitting(false);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="relative min-h-[180px]">
          {!isReady && (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          )}
          <div className={!isReady ? "absolute inset-0 opacity-0" : ""}>
            <PaymentElement onReady={() => setIsReady(true)} />
          </div>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        className="w-full"
        disabled={!stripe || !elements || isSubmitting || !isReady}
        type="submit"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
