import { loadStripe, type Stripe } from "@stripe/stripe-js";

import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/integrations/supabase/client";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePublishableKey() {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  return key || null;
}

export function isStripeConfigured() {
  return Boolean(getStripePublishableKey());
}

export function getStripePromise() {
  const publishableKey = getStripePublishableKey();
  if (!publishableKey) {
    return null;
  }

  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}

export function getPaymentConfigurationError() {
  if (!isSupabaseConfigured()) {
    return getSupabaseConfigError();
  }

  if (!isStripeConfigured()) {
    return "Stripe is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in your app environment.";
  }

  return null;
}
