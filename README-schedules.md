# Sistema de Agendamentos - Interflow

## Visão Geral

O sistema de agendamentos do Interflow permite que as organizações gerenciem múltiplas agendas, prestadores de serviços, serviços, disponibilidades e agendamentos com clientes. O sistema também oferece integração com o Google Calendar para sincronização de eventos e criação de reuniões online.

## Estrutura do Banco de Dados

### Tabelas Principais

1. **Agendas (`schedules`)**
   - Armazena informações sobre as agendas das organizações
   - Cada organização pode ter múltiplas agendas
   - Suporta agendas de tipo "serviço" ou "reunião"
   - Inclui configurações de fuso horário

2. **Prestadores (`schedule_providers`)**
   - Vincula profissionais/prestadores às agendas
   - Cada prestador pode oferecer um conjunto específico de serviços
   - Associado a um perfil de usuário na plataforma

3. **Serviços (`schedule_services`)**
   - Define os serviços oferecidos em cada agenda
   - Inclui preço, duração e descrição

4. **Disponibilidade (`schedule_availability`)**
   - Configura os horários disponíveis para cada prestador
   - Organizados por dia da semana e horário de início/fim

5. **Feriados/Folgas (`schedule_holidays`)**
   - Registra períodos indisponíveis (feriados, férias, etc.)
   - Pode ser aplicado a toda a agenda ou a prestadores específicos

6. **Agendamentos (`appointments`)**
   - Armazena os agendamentos realizados
   - Registra cliente, prestador, serviço e horário
   - Suporta diferentes status (agendado, confirmado, completado, cancelado)
   - Pode incluir links para videoconferência

7. **Lembretes (`appointment_reminders`)**
   - Gerencia lembretes para os agendamentos
   - Suporta diferentes canais (e-mail, SMS, WhatsApp)

8. **Configuração de Calendário (`schedule_provider_calendar_config`)**
   - Configurações para integração com Google Calendar
   - Permite sincronização bidirecional e criação automática de reuniões

### Funções Especiais

- **`find_available_slots`**: Função que calcula automaticamente os horários disponíveis com base nas disponibilidades dos prestadores, serviços e agendamentos existentes

## Frontend

### Páginas

1. **Página Principal de Agendamentos (`SchedulesPage`)**
   - Lista as agendas disponíveis
   - Mostra uma visualização de calendário com os agendamentos
   - Permite filtrar por agenda, prestador e período

2. **Página de Detalhes da Agenda (`ScheduleDetailsPage`)**
   - Interface com abas para gerenciar diferentes aspectos:
     - Prestadores
     - Serviços
     - Disponibilidade
     - Configurações gerais

### Componentes

1. **Calendário de Agendamentos (`ScheduleCalendar`)**
   - Visualização interativa de agendamentos
   - Suporta diferentes visões (mês, semana, dia, agenda)
   - Permite criar novos agendamentos ao clicar em horários disponíveis

2. **Formulário de Agenda (`ScheduleForm`)**
   - Interface para criação e edição de agendas
   - Configuração de tipo, nome, descrição, cor e outras propriedades

## Hooks e Funções

Hooks React para manipulação dos dados:
- `useSchedule`: Busca detalhes de uma agenda específica
- `useSchedules`: Lista as agendas de uma organização
- `useAppointments`: Obtém agendamentos com filtros
- `useScheduleById`: Busca uma agenda pelo ID

## Integrações

- **Google Calendar**: Sincronização bidirecional de eventos e agendamentos
- **Google Meet**: Criação automática de videoconferências para agendamentos

## Segurança

- Implementação de Row Level Security (RLS) em todas as tabelas
- Políticas de acesso baseadas no perfil do usuário e organização
- Validação de dados em nível de banco de dados

## Próximos Passos

1. Implementar interface de criação de novos agendamentos
2. Desenvolver páginas para gerenciamento de prestadores, serviços e disponibilidade
3. Criar página pública para agendamentos de clientes
4. Implementar sistema de notificações para lembretes
5. Finalizar integração com Google Calendar/Meet

## Tecnologias Utilizadas

- Frontend: React, TypeScript, TailwindCSS
- Backend: Supabase (PostgreSQL, Row Level Security)
- Integrações: Google Calendar API 