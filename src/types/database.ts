import { Trigger } from './flow';
/**
 * DATABASE SCHEMA TYPES
 * This file contains TypeScript interfaces that represent the database schema
 * of the Interflow application. These types are used throughout the application
 * to ensure type safety and provide context for AI assistants.
 */

// ==========================================
// COMMUNICATION INTERFACES
// ==========================================

/**
 * Represents a conversation between a customer and agent(s)
 * A chat is the main communication unit in the system
 */
export interface Chat {
  id: string;
  ticket_number: number;
  customer_id: Customer;
  organization_id: Organization;
  channel_id: ChatChannel;
  team_id?: string;
  status: 'pending' | 'in_progress' | 'closed' | 'await_closing';
  created_at: string;
  arrival_time: string;
  start_time?: string;
  end_time?: string;
  last_message?: Message;
  last_message_at?: string;
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
  is_fixed?: boolean;
  unread_count?: number;
  is_archived?: boolean;
}

/**
 * Represents a communication channel through which customers can contact the organization
 * Supports various messaging platforms like WhatsApp, Instagram, Facebook, and email
 */
export interface ChatChannel {
  id: string;
  organization_id: Organization;
  name: string;
  type: 'whatsapp_official' | 'whatsapp_wapi' | 'whatsapp_zapi' | 'whatsapp_evo' | 'instagram' | 'facebook' | 'email';
  status: 'active' | 'inactive';
  is_connected: boolean;
  is_tested: boolean;
  credentials: Record<string, string | number | boolean>;
  settings: Record<string, string | number | boolean>;
  created_at: string;
  updated_at: string;
}

/**
 * Represents an agent who is collaborating on a chat
 * Multiple agents can collaborate on a single chat
 */
interface ChatCollaborator {
  id: string;
  chat_id: Chat;
  user_id: string;
  organization_id: Organization;
  joined_at: string;
  left_at?: string;
  profile?: Profile;
}

/**
 * Represents a message within a chat
 * Messages can be text, media, or system notifications
 */
export interface Message {
  id: string;
  chat_id: Chat;
  organization_id: Organization;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'email' | 
        'user_entered' | 'user_left' | 'user_transferred' | 'user_transferred_himself' | 'user_closed' | 'user_start' | 'user_join' | 'template' | 'team_transferred' | 'location' | 'instructions_model';
  sent_from_system: boolean;
  sender_type: 'customer' | 'agent' | 'system';
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received' | 'deleted';
  attachments?: { url: string; type: string; name: string }[];
  error_message?: string;
  errorMessage?: string;
  created_at: string;
  session_id?: string;
  external_id?: string;
  response_message_id?: string;
  sender_agent_id?: string;
  sender_agent?: Profile;
  sender_customer_id?: string;
  response_to?: Message;
  metadata?: Record<string, unknown>;
}

/**
 * Represents a predefined message template that agents can quickly use
 */
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
  updated_at?: string;
}

// ==========================================
// USER AND ORGANIZATION INTERFACES
// ==========================================

/**
 * Represents a customer who interacts with the organization
 * Customers can be contacted through various channels
 */

export interface Customer {
  id: string;
  name: string;
  organization_id: string;
  stage_id: string | null;
  created_at: string;
  updated_at: string;
  profile_picture?: string;
  tags?: { 
    tag_id: string;
    tags: {
      id: string;
      name: string;
      color: string;
    }
  }[];
  contacts?: CustomerContact[];
  field_values?: {
    id: string;
    field_definition_id: string;
    value: string;
    updated_at: string;
    field_definition: CustomFieldDefinition;
  }[];
  is_spam?: boolean;
  stage?: CrmStage;
  sale_price?: number;
}

/**
 * Represents an organization using the platform
 * Each organization has its own users, customers, and settings
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  email?: string;
  whatsapp?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  storage_limit: number;
  storage_used: number;
  settings: Record<string, string | number | boolean | object>;
}

/**
 * Represents a user's membership within an organization
 * Users can have different roles within an organization
 */
export interface OrganizationMember {
  id: string;
  organization: Organization;
  organization_id: string;
  user_id: string;
  profile_id: string;
  role: 'owner' | 'admin' | 'agent';
  created_at: string;
}

/**
 * Represents a user profile in the system
 * Contains basic user information
 */
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  whatsapp?: string;
  role: string;
  created_at: string;
  is_superadmin: boolean;
  language: string;
}

// ==========================================
// TEAM MANAGEMENT INTERFACES
// ==========================================

/**
 * Represents a team of agents within an organization
 * Teams can be assigned to handle specific types of chats
 */
export interface ServiceTeam {
  id: string;
  organization_id: Organization;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  members: ServiceTeamMember[]; // Não está no banco, mas útil para UI
  _count?: {
    members: number;
  };
}

/**
 * Represents a user's membership within a service team
 * Users can have different roles within a team
 */
export interface ServiceTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'leader' | 'member';
  created_at: string;
  profile?: Profile; // Não está no banco, mas útil para UI
}

// ==========================================
// SUBSCRIPTION AND BILLING INTERFACES
// ==========================================

/**
 * Represents an organization's subscription to the platform
 * Tracks billing periods and subscription status
 */
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
  subscription_plans: SubscriptionPlan;
}

/**
 * Represents a subscription plan available for organizations
 * Defines features, limits, and pricing
 */
export interface SubscriptionPlan {
  id: string;
  name_pt: string;
  name_en: string;
  name_es: string;
  description_pt?: string;
  description_en?: string;
  description_es?: string;
  price_brl: number;
  price_usd: number;
  default_currency: 'BRL' | 'USD';
  max_users: number;
  max_customers: number;
  max_channels: number;
  max_flows: number;
  max_teams: number;
  storage_limit: number;
  additional_user_price_brl: number;
  additional_user_price_usd: number;
  additional_channel_price_brl: number;
  additional_channel_price_usd: number;
  additional_flow_price_brl: number;
  additional_flow_price_usd: number;
  additional_team_price_brl: number;
  additional_team_price_usd: number;
  features_pt: string[] | Record<string, string>;
  features_en: string[] | Record<string, string>;
  features_es: string[] | Record<string, string>;
  stripe_price_id?: string;
  created_at: string;
  is_active?: boolean;
  updated_at?: string;
}

/**
 * Represents an invoice for a subscription
 * Contains billing information and payment status
 */
export interface Invoice {
  id: string;
  organization_id: Organization;
  subscription_id: Subscription;
  stripe_invoice_id: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  paid_at?: string;
  due_date: string;
  pdf_url: string;
  hosted_invoice_url: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string | number | boolean>;
}

/**
 * Represents a payment method associated with an organization
 * Used for billing subscriptions
 */
export interface PaymentMethod {
  id: string;
  organization_id: Organization;
  stripe_payment_method_id: string;
  type: 'card' | 'bank' | 'other';
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  metadata: Record<string, string | number | boolean>;
}

/**
 * Represents a Stripe customer record
 * Links an organization to its Stripe customer ID
 */
export interface StripeCustomer {
  id: string;
  organization_id: Organization;
  stripe_customer_id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string | number | boolean>;
}

/**
 * Represents a Stripe subscription record
 * Links a subscription to its Stripe subscription ID
 */
export interface StripeSubscription {
  id: string;
  subscription_id: Subscription;
  stripe_subscription_id: string;
  stripe_price_id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string | number | boolean>;
}

/**
 * Represents a Stripe webhook event
 * Used to track and process events from Stripe
 */
export interface StripeWebhookEvent {
  id: string;
  stripe_event_id: string;
  type: string;
  data: Record<string, unknown>;
  processed: boolean;
  error?: string;
  created_at: string;
  processed_at?: string;
}

// ==========================================
// AUTOMATION AND FLOW INTERFACES
// ==========================================

/**
 * Represents an active session of a customer interacting with a flow
 * Tracks the customer's progress through the flow
 */
export interface FlowSession {
  id: string;
  organization_id: Organization;
  bot_id: Flow;
  chat_id: Chat;
  customer_id: Customer;
  current_node_id: string;
  status: 'active' | 'inactive' | 'timeout';
  variables: Record<string, string | number | boolean | object>;
  message_history: FlowMessage[];
  created_at: string;
  last_interaction: string;
  timeout_at?: string;
  debounce_timestamp?: string;
  input_type?: 'text' | 'options';
  selected_option?: Record<string, string | number | boolean>;
}

/**
 * Represents a message in a flow session history
 */
export interface FlowMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Represents an automated conversation flow
 * Flows are built with nodes and edges to create interactive experiences
 */
export interface Flow {
  id: string;
  organization_id: Organization;
  name: string;
  description?: string;
  is_active: boolean;
  folder_path?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: FlowVariable[];
  created_at: string;
  updated_at: string;
  debounce_time: number;
  draft_nodes?: FlowNode[];
  draft_edges?: FlowEdge[];
  is_published: boolean;
  published_at?: string;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  created_by_prompt?: string | null;
  prompt?: {
    id: string;
    title: string;
  } | null;
  triggers?: Trigger[];
}

/**
 * Represents a node in a flow
 */
export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

/**
 * Represents an edge connecting nodes in a flow
 */
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Represents a variable used in a flow
 */
export interface FlowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  defaultValue?: string | number | boolean | object;
}

/**
 * Represents a trigger that can start a flow
 * Triggers can be based on various conditions
 */
export interface FlowTrigger {
  id: string;
  flow_id: Flow;
  organization_id: Organization;
  type: 'message' | 'schedule' | 'webhook' | 'event';
  is_active: boolean;
  conditions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Represents a predefined AI prompt template
 * Used for generating consistent AI responses
 */
export interface Prompt {
  id: string;
  organization_id: Organization;
  title: string;
  content: string;
  content_addons?: string[];
  description?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  is_default?: boolean;
}

// ==========================================
// INTEGRATION AND FILE INTERFACES
// ==========================================

/**
 * Represents an integration with an external service
 * Supports various types of integrations like OpenAI and AWS S3
 */
export interface Integration {
  id: string;
  organization_id: Organization;
  title: string;
  name?: string;
  type: 'openai' | 'aws_s3';
  credentials: {
    [key: string]: string;
  };
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

/**
 * Represents a file stored in the system
 * Files can be attached to messages, flows, or shortcuts
 */
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

// ==========================================
// CRM INTERFACES
// ==========================================

/**
 * Represents a sales funnel in the CRM system
 * Funnels contain stages that customers move through
 */
export interface CrmFunnel {
  id: string;
  organization_id: Organization;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Represents a stage in a sales funnel
 * Customers progress through stages in the sales process
 */
export interface CrmStage {
  id: string;
  funnel_id: CrmFunnel;
  name: string;
  description?: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

/**
 * Represents a tag that can be applied to various entities
 * Used for categorization and filtering
 */
export interface Tag {
  id: string;
  name: string;
  color: string;
  organization_id: string;
  created_at: string;
}

// ==========================================
// MISCELLANEOUS INTERFACES
// ==========================================

/**
 * Represents a reason for closing a chat
 * Used for analytics and reporting
 */
export interface ClosureType {
  id: string;
  title: string;
  color: string;
  flow_id: string;
  flow?: Flow; // Não está no banco, mas útil para UI
  created_at: string;
  organization_id?: string;
}

/**
 * Represents an API key for programmatic access to the platform
 * API keys can have different permissions and expiration dates
 */
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
  permissions: string[];
  created_by?: string;
}

// Tipo de contato como enum
export enum ContactType {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  PHONE = 'phone',
  INSTAGRAM = 'instagram',
  INSTAGRAM_ID = 'instagramId',
  FACEBOOK = 'facebook',
  FACEBOOK_ID = 'facebookId',
  TELEGRAM = 'telegram',
  OTHER = 'other'
}

// Interface para contato de cliente
export interface CustomerContact {
  id: string;
  customer_id: string;
  type: ContactType;
  value: string;
  label?: string | null;
  created_at: string;
  updated_at: string;
}

// Interface para definição de campo personalizado
export interface CustomFieldDefinition {
  id: string;
  name: string;
  organization_id: string;
  type: 'text' | 'number' | 'date' | 'datetime' | 'select';
  options?: string[];
  mask_type?: 'cpf' | 'cnpj' | 'phone' | 'cep' | 'rg' | 'custom';
  custom_mask?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Interface para valor de campo personalizado
export interface CustomFieldValue {
  id: string;
  customer_id: string;
  field_definition_id: string;
  value: string;
  created_at?: string;
}

// Interface para uso em formulários e criação/edição
export interface CustomFieldFormData {
  id?: string;
  field_id: string;
  field_name: string;
  type: 'text' | 'number' | 'date' | 'datetime' | 'select';
  value?: string;
  options?: string[];
  mask_type?: 'cpf' | 'cnpj' | 'phone' | 'cep' | 'rg' | 'custom';
  custom_mask?: string;
  description?: string;
  isNew?: boolean;
  slug?: string;
}

// Appointment (Agendamento)
export interface Appointment {
  id: string;
  schedule_id: Schedule;
  provider_id: string;
  provider?: Profile; // Não está no banco, mas útil para UI
  service_id?: string;
  service?: ScheduleService; // Não está no banco, mas útil para UI
  customer_id?: string;
  customer?: Customer; // Não está no banco, mas útil para UI
  customer_name?: string; // Não está no banco, mas útil para UI
  status: 'scheduled' | 'confirmed' | 'completed' | 'canceled' | 'no_show';
  date: string; // Formato YYYY-MM-DD
  start_time: string; // Formato HH:MM:SS
  end_time: string; // Formato HH:MM:SS
  time_slot?: string; // Faixa de horário para agendamentos por ordem de chegada
  notes?: string;
  metadata?: Record<string, unknown>;
  calendar_event_id?: string;
  calendar_event_link?: string;
  has_videoconference: boolean;
  chat_id?: Chat;
  videoconference_link?: string;
  videoconference_provider?: 'google_meet' | 'zoom' | 'teams' | 'other';
  created_at: string;
  updated_at: string;
  
  // Campos médicos adicionados na migração
  consultation_type?: 'initial' | 'follow_up' | 'emergency' | 'routine' | string;
  chief_complaint?: string;
  vital_signs?: {
    temperature?: number;
    heart_rate?: number;
    blood_pressure?: string;
    respiratory_rate?: number;
    oxygen_saturation?: number;
    height?: number;
    weight?: number;
    bmi?: number;
    [key: string]: unknown;
  };
  diagnosis?: string;
  medical_notes?: string;
  follow_up_recommendations?: string;
  is_medical_appointment?: boolean;
}

// Schedule Service (Serviço)
export interface ScheduleService {
  id: string;
  schedule_id: Schedule;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  duration: string; // formato interval do PostgreSQL
  color: string | null;
  status: 'active' | 'inactive';
  capacity: number; // Novos campos para suportar múltiplos atendimentos
  by_arrival_time: boolean; // Indica se o serviço opera por ordem de chegada
  created_at: string;
  updated_at: string;
}

// Schedule (Agenda)
export interface Schedule {
  id: string;
  organization_id: string;
  organization?: Organization; // Não está no banco, mas útil para UI
  title: string;
  description: string | null;
  type: 'service' | 'meeting';
  color: string;
  timezone: string;
  status: 'active' | 'inactive';
  is_public: boolean;
  requires_confirmation: boolean;
  enable_ai_agent: boolean;
  created_at: string;
  updated_at: string;
  services: ScheduleService[]; // Não está no banco, mas útil para UI
  providers: ScheduleProvider[]; // Não está no banco, mas útil para UI
  default_slot_duration: number;
}

// Schedule Provider (Profissional)
export interface ScheduleProvider {
  id: string;
  schedule_id: string;
  schedule?: Schedule; // Não está no banco, mas útil para UI
  profile_id: string;
  profile?: Profile; // Não está no banco, mas útil para UI
  name?: string; // Não está no banco, mas útil para UI
  avatar_url?: string; // Não está no banco, mas útil para UI
  status: 'active' | 'inactive';
  available_services: ScheduleService[];
  color?: string; // Não está no banco, mas útil para UI
  created_at: string;
  updated_at: string;
}

// Schedule Availability (Disponibilidade)
export interface ScheduleAvailability {
  id: string;
  provider_id: string;
  day_of_week: number; // 0-6 para Domingo-Sábado
  start_time: string; // Formato HH:MM:SS
  end_time: string; // Formato HH:MM:SS
  created_at: string;
  updated_at: string;
}

// Schedule Holiday (Feriado/Folga)
export interface ScheduleHoliday {
  id: string;
  schedule_id: string;
  provider_id?: string;
  title: string;
  date: string; // Formato YYYY-MM-DD
  all_day: boolean;
  start_time?: string; // Formato HH:MM:SS, obrigatório se all_day = false
  end_time?: string; // Formato HH:MM:SS, obrigatório se all_day = false
  recurring: boolean;
  created_at: string;
  updated_at: string;
}

// Appointment Reminder (Lembrete de Agendamento)
export interface AppointmentReminder {
  id: string;
  appointment_id: string;
  type: 'email' | 'sms' | 'whatsapp';
  status: 'pending' | 'sent' | 'failed';
  scheduled_for: string; // ISO DateTime
  sent_at?: string; // ISO DateTime
  template_id?: string; // Referência ao template usado
  created_at: string;
  updated_at: string;
}

// Template de Notificação para Agendamento
export interface ScheduleNotificationTemplate {
  id: string;
  schedule_id: string;
  organization_id: string;
  name: string;
  channel_id?: string; // Referência ao canal de envio (email, whatsapp, etc)
  channel?: ChatChannel; // Não está no banco de dados, mas útil para UI
  trigger_type: 'before_appointment' | 'on_confirmation' | 'on_cancellation' | 'after_appointment' | 'on_reschedule' | 'on_no_show';
  content: string;
  subject?: string; // Obrigatório apenas para emails
  active: boolean;
  created_at: string;
  updated_at: string;
  settings?: ScheduleNotificationSetting[]; // Configurações associadas, preenchido pelo useScheduleTemplates
}

// Configuração de Notificação para Agendamento
export interface ScheduleNotificationSetting {
  id: string;
  schedule_id: string;
  organization_id: string;
  template_id: string;
  template?: ScheduleNotificationTemplate; // Referência ao template (não está no banco)
  time_before?: string; // Intervalo como string (ex: '30 minutes', '1 day')
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ==========================================
// TASK INTERFACES
// ==========================================

/**
 * Represents a task in the system
 * Tasks can be associated with customers, chats, and appointments
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  user_id: string;
  customer_id: string;
  chat_id: string;
  appointment_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  customer: {
    name: string;
  };
  chat: {
    id: string;
  };
  appointment: {
    id: string;
    date: string;
  };
}

// Vamos renomear a interface existente para evitar conflito
export interface ExistingTables {
  // Definindo uma interface específica para tabelas já existentes
  // para evitar erro de interfaces vazias
  [key: string]: {
    Row: Record<string, unknown>;
    Insert: Record<string, unknown>;
    Update: Record<string, unknown>;
  };
}

// Adicionar as tabelas relacionadas ao blog
export interface BlogTables {
  blog_posts: {
    Row: {
      id: string;
      slug: string;
      author_id: string | null;
      featured: boolean;
      status: 'draft' | 'published' | 'archived';
      published_at: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      slug: string;
      author_id?: string | null;
      featured?: boolean;
      status?: 'draft' | 'published' | 'archived';
      published_at?: string | null;
      metadata?: Record<string, unknown> | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      slug?: string;
      author_id?: string | null;
      featured?: boolean;
      status?: 'draft' | 'published' | 'archived';
      published_at?: string | null;
      metadata?: Record<string, unknown> | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  blog_post_translations: {
    Row: {
      id: string;
      post_id: string;
      language: string;
      title: string;
      excerpt: string;
      content: string;
      image_url: string | null;
      seo_title: string | null;
      seo_description: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      post_id: string;
      language: string;
      title: string;
      excerpt: string;
      content: string;
      image_url?: string | null;
      seo_title?: string | null;
      seo_description?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      post_id?: string;
      language?: string;
      title?: string;
      excerpt?: string;
      content?: string;
      image_url?: string | null;
      seo_title?: string | null;
      seo_description?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  blog_categories: {
    Row: {
      id: string;
      slug: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      slug: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      slug?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
  blog_category_translations: {
    Row: {
      id: string;
      category_id: string;
      language: string;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      category_id: string;
      language: string;
      name: string;
      description?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      category_id?: string;
      language?: string;
      name?: string;
      description?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  blog_tags: {
    Row: {
      id: string;
      slug: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      slug: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      slug?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
  blog_tag_translations: {
    Row: {
      id: string;
      tag_id: string;
      language: string;
      name: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      tag_id: string;
      language: string;
      name: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      tag_id?: string;
      language?: string;
      name?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
  blog_post_categories: {
    Row: {
      post_id: string;
      category_id: string;
      created_at: string;
    };
    Insert: {
      post_id: string;
      category_id: string;
      created_at?: string;
    };
    Update: {
      post_id?: string;
      category_id?: string;
      created_at?: string;
    };
  };
  blog_post_tags: {
    Row: {
      post_id: string;
      tag_id: string;
      created_at: string;
    };
    Insert: {
      post_id: string;
      tag_id: string;
      created_at?: string;
    };
    Update: {
      post_id?: string;
      tag_id?: string;
      created_at?: string;
    };
  };
}

// Interface simplificada para o Database
export interface Database {
  public: ExistingTables & BlogTables & MedicalRecordsTables;
}

// Adicionar as tabelas relacionadas ao sistema de prontuários médicos
export interface MedicalRecordsTables {
  // A tabela emr_consultations será mantida por enquanto, mas está depreciada
  // Novos registros devem usar a tabela appointments com is_medical_appointment = true
  emr_consultations: {
    Row: {
      id: string;
      organization_id: string;
      appointment_id: string | null;
      customer_id: string;
      provider_id: string;
      chat_id: string | null;
      consultation_type: string;
      status: string;
      start_time: string | null;
      end_time: string | null;
      chief_complaint: string | null;
      vital_signs: Record<string, unknown> | null;
      diagnosis: string | null;
      notes: string | null;
      follow_up_recommendations: string | null;
      metadata: Record<string, unknown> | null;
      deleted_at: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      // ... manter conforme está, mas marcar como depreciado
      // @deprecated Usar appointments com is_medical_appointment = true
      id?: string;
      organization_id: string;
      appointment_id?: string | null;
      customer_id: string;
      provider_id: string;
      chat_id?: string | null;
      consultation_type: string;
      status?: string;
      start_time?: string | null;
      end_time?: string | null;
      chief_complaint?: string | null;
      vital_signs?: Record<string, unknown> | null;
      diagnosis?: string | null;
      notes?: string | null;
      follow_up_recommendations?: string | null;
      metadata?: Record<string, unknown> | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      // ... manter conforme está, mas marcar como depreciado
      // @deprecated Usar appointments com is_medical_appointment = true
      id?: string;
      organization_id?: string;
      appointment_id?: string | null;
      customer_id?: string;
      provider_id?: string;
      chat_id?: string | null;
      consultation_type?: string;
      status?: string;
      start_time?: string | null;
      end_time?: string | null;
      chief_complaint?: string | null;
      vital_signs?: Record<string, unknown> | null;
      diagnosis?: string | null;
      notes?: string | null;
      follow_up_recommendations?: string | null;
      metadata?: Record<string, unknown> | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  
  // Atualizar as interfaces das outras tabelas para incluir appointment_id
  emr_prescriptions: {
    Row: {
      id: string;
      organization_id: string;
      consultation_id: string | null;
      appointment_id: string | null; // Novo campo
      customer_id: string;
      provider_id: string;
      prescription_date: string;
      valid_until: string | null;
      medications: Record<string, unknown>;
      instructions: string | null;
      notes: string | null;
      is_controlled_substance: boolean;
      controlled_substance_type: string | null;
      document_url: string | null;
      document_generated_at: string | null;
      metadata: Record<string, unknown> | null;
      deleted_at: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      consultation_id?: string | null;
      appointment_id?: string | null; // Novo campo
      customer_id: string;
      provider_id: string;
      prescription_date?: string;
      valid_until?: string | null;
      medications: Record<string, unknown>;
      instructions?: string | null;
      notes?: string | null;
      is_controlled_substance?: boolean;
      controlled_substance_type?: string | null;
      document_url?: string | null;
      document_generated_at?: string | null;
      metadata?: Record<string, unknown> | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      consultation_id?: string | null;
      appointment_id?: string | null; // Novo campo
      customer_id?: string;
      provider_id?: string;
      prescription_date?: string;
      valid_until?: string | null;
      medications?: Record<string, unknown>;
      instructions?: string | null;
      notes?: string | null;
      is_controlled_substance?: boolean;
      controlled_substance_type?: string | null;
      document_url?: string | null;
      document_generated_at?: string | null;
      metadata?: Record<string, unknown> | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  
  emr_certificates: {
    Row: {
      id: string;
      organization_id: string;
      consultation_id: string | null;
      appointment_id: string | null; // Novo campo
      customer_id: string;
      provider_id: string;
      certificate_type: string;
      issue_date: string;
      start_date: string | null;
      end_date: string | null;
      days_of_leave: number | null;
      reason: string | null;
      recommendations: string | null;
      document_url: string | null;
      document_generated_at: string | null;
      metadata: Record<string, unknown> | null;
      deleted_at: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      consultation_id?: string | null;
      appointment_id?: string | null; // Novo campo
      customer_id: string;
      provider_id: string;
      certificate_type: string;
      issue_date?: string;
      start_date?: string | null;
      end_date?: string | null;
      days_of_leave?: number | null;
      reason?: string | null;
      recommendations?: string | null;
      document_url?: string | null;
      document_generated_at?: string | null;
      metadata?: Record<string, unknown> | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      consultation_id?: string | null;
      appointment_id?: string | null; // Novo campo
      customer_id?: string;
      provider_id?: string;
      certificate_type?: string;
      issue_date?: string;
      start_date?: string | null;
      end_date?: string | null;
      days_of_leave?: number | null;
      reason?: string | null;
      recommendations?: string | null;
      document_url?: string | null;
      document_generated_at?: string | null;
      metadata?: Record<string, unknown> | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  
  emr_attachments: {
    Row: {
      id: string;
      organization_id: string;
      medical_record_id: string | null;
      consultation_id: string | null;
      appointment_id: string | null; // Novo campo
      customer_id: string;
      file_id: string | null;
      attachment_type: string;
      title: string;
      description: string | null;
      file_url: string | null;
      file_name: string | null;
      file_type: string | null;
      file_size: number | null;
      is_highlighted: boolean;
      metadata: Record<string, unknown> | null;
      deleted_at: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      medical_record_id?: string | null;
      consultation_id?: string | null;
      appointment_id?: string | null; // Novo campo
      customer_id: string;
      file_id?: string | null;
      attachment_type: string;
      title: string;
      description?: string | null;
      file_url?: string | null;
      file_name?: string | null;
      file_type?: string | null;
      file_size?: number | null;
      is_highlighted?: boolean;
      metadata?: Record<string, unknown> | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      medical_record_id?: string | null;
      consultation_id?: string | null;
      appointment_id?: string | null; // Novo campo
      customer_id?: string;
      file_id?: string | null;
      attachment_type?: string;
      title?: string;
      description?: string | null;
      file_url?: string | null;
      file_name?: string | null;
      file_type?: string | null;
      file_size?: number | null;
      is_highlighted?: boolean;
      metadata?: Record<string, unknown> | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  
  // Manter as outras tabelas como estão (emr_medical_records, emr_document_templates)
  emr_medical_records: {
    Row: {
      id: string;
      organization_id: string;
      customer_id: string;
      record_type: string;
      allergies: string[] | null;
      chronic_conditions: string[] | null;
      current_medications: Record<string, unknown> | null;
      family_history: string | null;
      medical_history: string | null;
      specialized_data: Record<string, unknown> | null;
      is_active: boolean;
      last_updated_by: string | null;
      metadata: Record<string, unknown> | null;
      deleted_at: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      customer_id: string;
      record_type: string;
      allergies?: string[] | null;
      chronic_conditions?: string[] | null;
      current_medications?: Record<string, unknown> | null;
      family_history?: string | null;
      medical_history?: string | null;
      specialized_data?: Record<string, unknown> | null;
      is_active?: boolean;
      last_updated_by?: string | null;
      metadata?: Record<string, unknown> | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      customer_id?: string;
      record_type?: string;
      allergies?: string[] | null;
      chronic_conditions?: string[] | null;
      current_medications?: Record<string, unknown> | null;
      family_history?: string | null;
      medical_history?: string | null;
      specialized_data?: Record<string, unknown> | null;
      is_active?: boolean;
      last_updated_by?: string | null;
      metadata?: Record<string, unknown> | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  
  emr_document_templates: {
    Row: {
      id: string;
      organization_id: string;
      name: string;
      description: string | null;
      document_type: string;
      content: string;
      format: string;
      is_default: boolean;
      is_active: boolean;
      variables_schema: Record<string, unknown> | null;
      metadata: Record<string, unknown> | null;
      deleted_at: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      name: string;
      description?: string | null;
      document_type: string;
      content: string;
      format?: string;
      is_default?: boolean;
      is_active?: boolean;
      variables_schema?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      name?: string;
      description?: string | null;
      document_type?: string;
      content?: string;
      format?: string;
      is_default?: boolean;
      is_active?: boolean;
      variables_schema?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
      deleted_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
}


