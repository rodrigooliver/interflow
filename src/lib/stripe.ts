import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Initialize Stripe
export const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Types
export interface CreateCheckoutSessionParams {
  priceId: string;
  organizationId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface ManageSubscriptionParams {
  organizationId: string;
  returnUrl: string;
}

// API Functions
export async function createCheckoutSession({
  priceId,
  organizationId,
  successUrl,
  cancelUrl
}: CreateCheckoutSessionParams) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        priceId,
        organizationId,
        successUrl,
        cancelUrl
      })
    });

    const { sessionId } = await response.json();
    return stripe?.redirectToCheckout({ sessionId });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function createCustomerPortalSession({
  organizationId,
  returnUrl
}: ManageSubscriptionParams) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stripe/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        organizationId,
        returnUrl
      })
    });

    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}