export interface NavItem {
  label: string;
  href: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: {
    monthly: number;
    annual: number;
  };
  features: string[];
  highlighted?: boolean;
}

export interface Feature {
  title: string;
  description: string;
  icon: string;
} 