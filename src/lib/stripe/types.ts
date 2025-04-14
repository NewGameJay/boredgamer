export interface StripePriceIds {
  [key: string]: {
    monthly: string;
    yearly: string;
  };
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_STRIPE_PRICE_IDS: StripePriceIds;
      NEXT_PUBLIC_APP_URL: string;
      STRIPE_SECRET_KEY: string;
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    }
  }
}
