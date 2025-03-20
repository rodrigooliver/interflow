import { ToolExample } from '../types/prompts';

export const toolExamples: Record<string, Record<string, ToolExample>> = {
  pt: {
    weather: {
      label: "Clima (get_weather)",
      name: "get_weather",
      description: "Obtém informações sobre o clima atual para uma localização específica",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "Cidade ou localização para obter o clima"
          },
          unit: {
            type: "enum",
            description: "Unidade de temperatura",
            enum: ["celsius", "fahrenheit"]
          }
        },
        required: ["location"]
      }
    },
    search: {
      label: "Busca (web_search)",
      name: "web_search",
      description: "Realiza uma busca na web e retorna os resultados mais relevantes",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Termos de busca"
          },
          max_results: {
            type: "number",
            description: "Número máximo de resultados",
            default: 5
          }
        },
        required: ["query"]
      }
    },
    calculator: {
      label: "Calculadora (calculate)",
      name: "calculate",
      description: "Realiza cálculos matemáticos simples",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "Expressão matemática para calcular"
          }
        },
        required: ["expression"]
      }
    },
    schedule: {
      label: "Agendamento (agendar_consulta)",
      name: "agendar_consulta",
      description: "Gerencia agendamentos médicos para um médico, informando horários disponíveis e registrando consultas e cirurgias.",
      parameters: {
        type: "object",
        required: ["operacao"],
        properties: {
          data: {
            type: "string",
            format: "date",
            description: "Data da consulta ou cirurgia, conforme agenda do médico. Formato YYYY-MM-DD"
          },
          hora: {
            type: "string",
            description: "Horário previsto, lembrando que é por ordem de chegada. Formato HH:MM"
          },
          operacao: {
            enum: [
              "Consultar Disponibilidade",
              "Criar Agendamento",
              "Consultar Agendamento",
              "Cancelar Agendamento"
            ],
            type: "string",
            description: "Operação a ser realizada: verificar disponibilidade, criar, consultar ou cancelar um agendamento."
          },
          id_consulta: {
            type: "string",
            description: "Identificador consulta para operações de consulta ou cancelamento. Formato YYYY-MM-DD-HH:II "
          },
          observacoes: {
            type: "string",
            description: "Informações extras fornecidas pelo paciente, como sintomas, histórico ou qualquer detalhe relevante."
          },
          plano_saude: {
            type: "string",
            description: "Plano de saúde do paciente ou indicação de que a consulta será particular."
          },
          nome_paciente: {
            type: "string",
            description: "Nome completo do paciente que deseja agendar uma consulta ou cirurgia."
          },
          tipo_atendimento: {
            enum: [
              "Consulta",
              "Pequenas cirurgias",
              "Hérnia",
              "Pedra na vesícula",
              "Endoscopia",
              "Colonoscopia",
              "Urgência"
            ],
            type: "string",
            description: "Tipo de atendimento necessário, incluindo consultas, cirurgias e urgências."
          }
        }
      }
    }
  },
  en: {
    weather: {
      label: "Weather (get_weather)",
      name: "get_weather",
      description: "Gets current weather information for a specific location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City or location to get weather for"
          },
          unit: {
            type: "enum",
            description: "Temperature unit",
            enum: ["celsius", "fahrenheit"]
          }
        },
        required: ["location"]
      }
    },
    search: {
      label: "Search (web_search)",
      name: "web_search",
      description: "Performs a web search and returns the most relevant results",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search terms"
          },
          max_results: {
            type: "number",
            description: "Maximum number of results",
            default: 5
          }
        },
        required: ["query"]
      }
    },
    calculator: {
      label: "Calculator (calculate)",
      name: "calculate",
      description: "Performs simple mathematical calculations",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "Mathematical expression to calculate"
          }
        },
        required: ["expression"]
      }
    },
    schedule: {
      label: "Schedule (schedule_appointment)",
      name: "schedule_appointment",
      description: "Manages medical appointments for a doctor, informing available times and recording consultations and surgeries.",
      parameters: {
        type: "object",
        required: ["operation"],
        properties: {
          date: {
            type: "string",
            format: "date",
            description: "Date of the appointment or surgery, according to the doctor's schedule. Formato YYYY-MM-DD"
          },
          time: {
            type: "string",
            description: "Expected time, remembering it's first come first served. Formato HH:MM"
          },
          operation: {
            enum: [
              "checkAvailability",
              "createAppointment",
              "checkAppointment",
              "deleteAppointment"
            ],
            type: "string",
            description: "Operation to be performed: check availability, create, check or cancel an appointment."
          },
          appointment_id: {
            type: "string",
            description: "Appointment identifier for check or cancel operations. Format YYYY-MM-DD-HH:MM"
          },
          notes: {
            type: "string",
            description: "Extra information provided by the patient, such as symptoms, history or any relevant details."
          },
          health_plan: {
            type: "string",
            description: "Patient's health plan or indication that it's a private consultation."
          },
          name: {
            type: "string",
            description: "Full name of the patient who wants to schedule an appointment or surgery."
          },
          service_type: {
            enum: [
              "Consultation",
              "Minor surgeries",
              "Hernia",
              "Gallbladder stone",
              "Endoscopy",
              "Colonoscopy",
              "Emergency"
            ],
            type: "string",
            description: "Type of service needed, including consultations, surgeries and emergencies."
          }
        }
      }
    }
  }
}; 