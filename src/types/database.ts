export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_superadmin: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'agent';
  created_at: string;
}

export interface ServiceTeam {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  _count?: {
    members: number;
  };
}

export interface ServiceTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'leader' | 'member';
  created_at: string;
  profile?: Profile;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  features: {
    chat_channels: string[];
    max_concurrent_chats: number;
  };
  max_users: number;
  max_customers: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatChannel {
  id: string;
  organization_id: string;
  name: string;
  type: 'whatsapp_official' | 'whatsapp_wapi' | 'whatsapp_zapi' | 'whatsapp_evo' | 'instagram' | 'facebook' | 'email';
  status: 'active' | 'inactive';
  is_connected: boolean;
  is_tested: boolean;
  credentials: Record<string, any>;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface Chat {
  id: string;
  ticket_number: number;
  customer_id: string;
  organization_id: string;
  channel_id: string;
  team_id?: string;
  status: 'open' | 'closed';
  channel: 'whatsapp' | 'instagram' | 'web' | 'email';
  created_at: string;
  arrival_time: string;
  start_time?: string;
  end_time?: string;
  last_message_at: string;
  assigned_to?: string;
  customer?: Customer;
  channel_details?: ChatChannel;
  team?: ServiceTeam;
  assigned_agent?: Profile;
  collaborators?: ChatCollaborator[];
  wait_time?: string;
  service_time?: string;
}

interface ChatCollaborator {
  id: string;
  chat_id: string;
  user_id: string;
  organization_id: string;
  joined_at: string;
  left_at?: string;
  profile?: Profile;
}

interface Message {
  id: string;
  chat_id: string;
  organization_id: string;
  content: string;
  sender_type: 'customer' | 'agent' | 'system';
  sender_id: string;
  created_at: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  whatsapp?: string;
  email?: string;
  facebook_id?: string;
  instagram_id?: string;
  created_at: string;
  last_contact: string;
}