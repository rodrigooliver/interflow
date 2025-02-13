export interface CRMFunnel {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CRMStage {
  id: string;
  funnel_id: string;
  name: string;
  description?: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CRMCustomerStage {
  id: string;
  customer_id: string;
  stage_id: string;
  notes?: string;
  moved_at: string;
  created_at: string;
  customer?: Customer;
}