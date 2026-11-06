import { getSupabaseClient } from "@/integrations/supabase/client";

export type CreatePaymentIntentInput = {
  amount: number;
  currency?: string;
  functionName?: string;
  metadata?: Record<string, string>;
};

type CreatePaymentIntentResponse = {
  clientSecret?: string;
};

export async function createPaymentIntent({
  amount,
  currency = "usd",
  functionName = "create-payment-intent",
  metadata,
}: CreatePaymentIntentInput) {
  const supabase = getSupabaseClient();
  const { data, error } =
    await supabase.functions.invoke<CreatePaymentIntentResponse>(functionName, {
      body: {
        amount,
        currency,
        metadata,
      },
    });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.clientSecret) {
    throw new Error(
      "Payment intent was created without a client secret. Check the edge function response.",
    );
  }

  return data.clientSecret;
}
