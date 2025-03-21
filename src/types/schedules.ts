// Tipos principais para o sistema de agendamentos
import { Appointment, Schedule, ScheduleProvider, ScheduleService } from './database';

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