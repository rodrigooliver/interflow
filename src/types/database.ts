export interface Chat {
  id: string;
  ticket_number: number;
  customer_id: Customer;
  organization_id: Organization;
  channel_id: ChatChannel;
  team_id?: string;
  status: 'pending' | 'in_progress' | 'closed';
  created_at: string;
  arrival_time: string;
  start_time?: string;
  end_time?: string;
  last_message?: Message;
  assigned_to?: string;
  external_id?: string;
  title?: string;
  flow_session_id?: FlowSession;
  rating?: number;
  feedback?: string;
  customer?: Customer;
  channel_details?: ChatChannel;
  team?: ServiceTeam;
  assigned_agent?: Profile;
  collaborators?: ChatCollaborator[];
  wait_time?: string;
  service_time?: string;
  profile_picture?: string;
}

export interface ChatChannel {
  id: string;
  organization_id: Organization;
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

interface ChatCollaborator {
  id: string;
  chat_id: Chat;
  user_id: string;
  organization_id: Organization;
  joined_at: string;
  left_at?: string;
  profile?: Profile;
}

export interface Customer {
  id: string;
  organization_id: Organization;
  name: string | null | undefined;
  whatsapp?: string;
  email?: string;
  facebook_id?: string;
  instagram_id?: string;
  created_at: string;
  last_contact: string;
}

export interface Integration {
  id: string;
  organization_id: Organization;
  title: string;
  type: 'openai' | 'aws_s3';
  credentials: {
    [key: string]: string;
  };
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: Chat;
  organization_id: Organization;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'email' | 
        'user_entered' | 'user_left' | 'user_transferred' | 'user_closed' | 'user_start';
  sent_from_system: boolean;
  sender_type: 'customer' | 'agent' | 'system';
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: { url: string; type: string; name: string }[];
  error_message?: string;
  errorMessage?: string;
  created_at: string;
  session_id?: string;
  external_id?: string;
  response_message_id?: string;
  sender_agent_id?: string;
  sender_customer_id?: string;
}

export interface MessageShortcut {
  id: string;
  organization_id: Organization;
  title: string;
  content: string;
  attachments: {
    name: string;
    url: string;
    type: string;
  }[];
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
  storage_limit: number;
  storage_used: number;
  settings: Record<string, any>;
}

export interface OrganizationMember {
  id: string;
  organization_id: Organization;
  user_id: string;
  profile_id: string;
  role: 'owner' | 'admin' | 'agent';
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_superadmin: boolean;
  created_at: string;
}

export interface Prompt {
  id: string;
  organization_id: Organization;
  title: string;
  content: string;
  description?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface ServiceTeam {
  id: string;
  organization_id: Organization;
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

export interface Subscription {
  id: string;
  organization_id: Organization;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
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

export interface FlowSession {
  id: string;
  organization_id: Organization;
  bot_id: Flow;
  chat_id: Chat;
  customer_id: Customer;
  current_node_id: string;
  status: 'active' | 'inactive' | 'timeout';
  variables: Record<string, any>;
  message_history: any[];
  created_at: string;
  last_interaction: string;
  timeout_at?: string;
  debounce_timestamp?: string;
  input_type?: 'text' | 'options';
  selected_option?: Record<string, any>;
}

export interface Flow {
  id: string;
  organization_id: Organization;
  name: string;
  description?: string;
  is_active?: boolean;
  folder_path?: string;
  nodes: any[];
  edges: any[];
  variables: any[];
  created_at: string;
  updated_at: string;
  debounce_time: number;
  draft_nodes?: any[];
  draft_edges?: any[];
  is_published?: boolean;
  published_at?: string;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface File {
  id: string;
  organization_id: Organization;
  name: string;
  size: number;
  public_url: string;
  path?: string;
  message_id?: Message;
  integration_id?: Integration;
  flow_id?: Flow;
  shortcut_id?: MessageShortcut;
  mime_type: string;
  created_at: string;
}

export interface ClosureType {
  id: string;
  title: string;
  color: string;
  flow_id: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  organization_id: Organization;
  profile_id?: Profile;
  name: string;
  key_hash: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  permissions: any[];
  created_by?: string;
}


