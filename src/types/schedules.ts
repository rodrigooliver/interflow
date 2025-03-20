// Tipos principais para o sistema de agendamentos

// Schedule (Agenda)
export interface Schedule {
  id: string;
  organization_id: string;
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
  services: ScheduleService[];
  default_slot_duration: number;
}

// Schedule Provider (Profissional)
export interface ScheduleProvider {
  id: string;
  schedule_id: string;
  profile_id: string;
  name?: string; // Não está no banco, mas útil para UI
  avatar_url?: string; // Não está no banco, mas útil para UI
  status: 'active' | 'inactive';
  available_services: string[];
  color?: string; // Não está no banco, mas útil para UI
  created_at: string;
  updated_at: string;
}

// Schedule Service (Serviço)
export interface ScheduleService {
  id: string;
  schedule_id: string;
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

// Appointment (Agendamento)
export interface Appointment {
  id: string;
  schedule_id: string;
  provider_id: string;
  service_id?: string;
  customer_id?: string;
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
  videoconference_link?: string;
  videoconference_provider?: 'google_meet' | 'zoom' | 'teams' | 'other';
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
  created_at: string;
  updated_at: string;
}

// Provider Calendar Config (Configuração do Calendário do Profissional)
export interface ProviderCalendarConfig {
  id: string;
  provider_id: string;
  integration_id: string;
  calendar_id?: string;
  sync_enabled: boolean;
  auto_create_meet: boolean;
  created_at: string;
  updated_at: string;
}

// Tipos para consulta de slots disponíveis
export interface AvailableSlot {
  date: string; // Formato YYYY-MM-DD
  start_time: string; // Formato HH:MM:SS
  end_time: string; // Formato HH:MM:SS
  provider_id: string;
  service_id: string;
}

// Parâmetros para busca de slots disponíveis
export interface FindAvailableSlotsParams {
  schedule_id: string;
  provider_id: string;
  service_id: string;
  start_date: string; // Formato YYYY-MM-DD
  end_date: string; // Formato YYYY-MM-DD
  slot_duration?: string; // Representação de intervalo como string
}

// Filtros para busca de agendamentos
export interface AppointmentFilters {
  schedule_id?: string;
  provider_id?: string;
  service_id?: string;
  customer_id?: string;
  status?: ('scheduled' | 'confirmed' | 'completed' | 'canceled' | 'no_show')[];
  start_date?: string; // Formato YYYY-MM-DD
  end_date?: string; // Formato YYYY-MM-DD
}

// Formulário de agendamento
export interface AppointmentFormData {
  id?: string; // Para edição
  schedule_id: string;
  provider_id: string;
  service_id?: string;
  customer_id?: string;
  customer_name?: string; // Para agendamentos sem cliente cadastrado
  customer_email?: string; // Para agendamentos sem cliente cadastrado
  customer_phone?: string; // Para agendamentos sem cliente cadastrado
  status: 'scheduled' | 'confirmed' | 'completed' | 'canceled' | 'no_show';
  date: string; // Formato YYYY-MM-DD
  start_time: string; // Formato HH:MM:SS
  end_time: string; // Formato HH:MM:SS
  time_slot?: string; // Faixa de horário para agendamentos por ordem de chegada
  notes?: string;
  create_videoconference?: boolean;
  send_reminders?: boolean;
  reminder_types?: ('email' | 'sms' | 'whatsapp')[];
}

// Tipo de erro da API
export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

// Respostas da API
export interface SchedulesApiResponse {
  data: Schedule[] | null;
  error: ApiError | null;
}

export interface ScheduleApiResponse {
  data: Schedule | null;
  error: ApiError | null;
}

export interface ProvidersApiResponse {
  data: ScheduleProvider[] | null;
  error: ApiError | null;
}

export interface ServicesApiResponse {
  data: ScheduleService[] | null;
  error: ApiError | null;
}

export interface AppointmentsApiResponse {
  data: Appointment[] | null;
  error: ApiError | null;
}

export interface AppointmentApiResponse {
  data: Appointment | null;
  error: ApiError | null;
}

export interface AvailableSlotsApiResponse {
  data: AvailableSlot[] | null;
  error: ApiError | null;
}

// Configurações de integração
export interface GoogleCalendarConfig {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  access_token?: string;
  token_expiry?: string;
  scopes?: string[];
} 