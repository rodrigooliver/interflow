export type TrackingEventType = 
  | 'PageView'
  | 'SignUp'
  | 'CompleteRegistration'
  | 'Lead'
  | 'Contact'
  | 'Subscribe'
  | 'StartTrial'
  | 'Purchase'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Search'
  | 'ViewContent'
  | 'AddPaymentInfo'
  | 'CustomEvent';

export interface TrackingPixel {
  id: string;
  organization_id: string;
  referral_id: string;
  name: string;
  type: 'facebook' | 'google' | 'tiktok' | 'custom';
  pixel_id: string;
  configuration: Record<string, unknown>;
  status: 'active' | 'inactive';
  created_at: string;
  token?: string;
}

type FacebookPixelFunction = {
  (action: 'init', pixelId: string): void;
  (action: 'track', eventName: string, params?: Record<string, unknown>): void;
  (action: 'trackCustom', eventName: string, params?: Record<string, unknown>): void;
  push: (args: unknown[]) => void;
  loaded: boolean;
  version: string;
  queue: unknown[];
};

declare global {
  interface Window {
    fbq?: FacebookPixelFunction;
    gtag?: (action: string, eventName: string, params?: Record<string, unknown>) => void;
    dataLayer?: unknown[];
    ttq?: {
      track: (eventName: string, params?: Record<string, unknown>) => void;
    };
  }
} 