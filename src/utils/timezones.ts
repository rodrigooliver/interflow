export interface Timezone {
  value: string;       // Valor que será armazenado (ex: 'America/Sao_Paulo')
  offset: string;      // Offset em relação ao UTC (ex: 'UTC-03:00')
  label: string;       // Nome de exibição (ex: 'São Paulo')
  description: string; // Descrição completa (ex: 'Brasília, São Paulo')
}

// Lista completa de fusos horários organizados por regiões
export const timezones: Timezone[] = [
  // América do Sul - Brasil (adicionados mais fusos brasileiros)
  { value: 'America/Sao_Paulo', offset: 'UTC-03:00', label: 'São Paulo', description: 'Brasília, São Paulo, Rio de Janeiro (Hora de Brasília)' },
  { value: 'America/Manaus', offset: 'UTC-04:00', label: 'Manaus', description: 'Amazonas (exceto extremo oeste)' },
  { value: 'America/Belem', offset: 'UTC-03:00', label: 'Belém', description: 'Pará, Amapá' },
  { value: 'America/Fortaleza', offset: 'UTC-03:00', label: 'Fortaleza', description: 'Ceará, Nordeste' },
  { value: 'America/Recife', offset: 'UTC-03:00', label: 'Recife', description: 'Pernambuco' },
  { value: 'America/Bahia', offset: 'UTC-03:00', label: 'Salvador', description: 'Bahia' },
  { value: 'America/Maceio', offset: 'UTC-03:00', label: 'Maceió', description: 'Alagoas' },
  { value: 'America/Cuiaba', offset: 'UTC-04:00', label: 'Cuiabá', description: 'Mato Grosso, Mato Grosso do Sul' },
  { value: 'America/Campo_Grande', offset: 'UTC-04:00', label: 'Campo Grande', description: 'Mato Grosso do Sul' },
  { value: 'America/Rio_Branco', offset: 'UTC-05:00', label: 'Rio Branco', description: 'Acre' },
  { value: 'America/Boa_Vista', offset: 'UTC-04:00', label: 'Boa Vista', description: 'Roraima' },
  { value: 'America/Porto_Velho', offset: 'UTC-04:00', label: 'Porto Velho', description: 'Rondônia' },
  { value: 'America/Noronha', offset: 'UTC-02:00', label: 'Fernando de Noronha', description: 'Fernando de Noronha, Atol das Rocas' },
  
  // América do Sul - Outros países
  { value: 'America/Argentina/Buenos_Aires', offset: 'UTC-03:00', label: 'Buenos Aires', description: 'Argentina' },
  { value: 'America/Santiago', offset: 'UTC-04:00', label: 'Santiago', description: 'Chile' },
  { value: 'America/Caracas', offset: 'UTC-04:00', label: 'Caracas', description: 'Venezuela' },
  { value: 'America/Lima', offset: 'UTC-05:00', label: 'Lima', description: 'Peru' },
  { value: 'America/Bogota', offset: 'UTC-05:00', label: 'Bogotá', description: 'Colômbia' },
  { value: 'America/Montevideo', offset: 'UTC-03:00', label: 'Montevidéu', description: 'Uruguai' },
  { value: 'America/Asuncion', offset: 'UTC-04:00', label: 'Assunção', description: 'Paraguai' },
  { value: 'America/La_Paz', offset: 'UTC-04:00', label: 'La Paz', description: 'Bolívia' },
  { value: 'America/Guayaquil', offset: 'UTC-05:00', label: 'Guayaquil', description: 'Equador' },
  { value: 'America/Cayenne', offset: 'UTC-03:00', label: 'Caiena', description: 'Guiana Francesa' },
  { value: 'America/Paramaribo', offset: 'UTC-03:00', label: 'Paramaribo', description: 'Suriname' },
  { value: 'America/Guyana', offset: 'UTC-04:00', label: 'Georgetown', description: 'Guiana' },
  
  // América do Norte
  { value: 'America/New_York', offset: 'UTC-05:00', label: 'Nova York', description: 'Leste dos EUA e Canadá' },
  { value: 'America/Chicago', offset: 'UTC-06:00', label: 'Chicago', description: 'Centro dos EUA e Canadá' },
  { value: 'America/Denver', offset: 'UTC-07:00', label: 'Denver', description: 'Montanhas dos EUA e Canadá' },
  { value: 'America/Los_Angeles', offset: 'UTC-08:00', label: 'Los Angeles', description: 'Pacífico dos EUA e Canadá' },
  { value: 'America/Anchorage', offset: 'UTC-09:00', label: 'Anchorage', description: 'Alasca' },
  { value: 'America/Adak', offset: 'UTC-10:00', label: 'Adak', description: 'Ilhas Aleutas' },
  { value: 'America/Mexico_City', offset: 'UTC-06:00', label: 'Cidade do México', description: 'México' },
  { value: 'America/Toronto', offset: 'UTC-05:00', label: 'Toronto', description: 'Leste do Canadá' },
  { value: 'America/Vancouver', offset: 'UTC-08:00', label: 'Vancouver', description: 'Oeste do Canadá' },
  
  // Europa
  { value: 'Europe/London', offset: 'UTC+00:00', label: 'Londres', description: 'Reino Unido, Portugal' },
  { value: 'Europe/Paris', offset: 'UTC+01:00', label: 'Paris', description: 'França, Espanha, Alemanha' },
  { value: 'Europe/Berlin', offset: 'UTC+01:00', label: 'Berlim', description: 'Alemanha, Itália' },
  { value: 'Europe/Athens', offset: 'UTC+02:00', label: 'Atenas', description: 'Grécia, Turquia, Finlândia' },
  { value: 'Europe/Moscow', offset: 'UTC+03:00', label: 'Moscou', description: 'Rússia Ocidental' },
  { value: 'Europe/Lisbon', offset: 'UTC+00:00', label: 'Lisboa', description: 'Portugal' },
  { value: 'Europe/Dublin', offset: 'UTC+00:00', label: 'Dublin', description: 'Irlanda' },
  
  // Ásia
  { value: 'Asia/Tokyo', offset: 'UTC+09:00', label: 'Tóquio', description: 'Japão' },
  { value: 'Asia/Shanghai', offset: 'UTC+08:00', label: 'Xangai', description: 'China, Taiwan, Singapura' },
  { value: 'Asia/Kolkata', offset: 'UTC+05:30', label: 'Kolkata', description: 'Índia' },
  { value: 'Asia/Dubai', offset: 'UTC+04:00', label: 'Dubai', description: 'Emirados Árabes, Omã' },
  { value: 'Asia/Bangkok', offset: 'UTC+07:00', label: 'Bangkok', description: 'Tailândia, Vietnã, Camboja' },
  { value: 'Asia/Seoul', offset: 'UTC+09:00', label: 'Seul', description: 'Coreia do Sul' },
  { value: 'Asia/Tehran', offset: 'UTC+03:30', label: 'Teerã', description: 'Irã' },
  { value: 'Asia/Jerusalem', offset: 'UTC+02:00', label: 'Jerusalém', description: 'Israel' },
  
  // Oceania
  { value: 'Australia/Sydney', offset: 'UTC+10:00', label: 'Sydney', description: 'Austrália Oriental' },
  { value: 'Australia/Perth', offset: 'UTC+08:00', label: 'Perth', description: 'Austrália Ocidental' },
  { value: 'Australia/Brisbane', offset: 'UTC+10:00', label: 'Brisbane', description: 'Queensland' },
  { value: 'Pacific/Auckland', offset: 'UTC+12:00', label: 'Auckland', description: 'Nova Zelândia' },
  { value: 'Pacific/Fiji', offset: 'UTC+12:00', label: 'Fiji', description: 'Ilhas Fiji' },
  
  // África
  { value: 'Africa/Cairo', offset: 'UTC+02:00', label: 'Cairo', description: 'Egito' },
  { value: 'Africa/Johannesburg', offset: 'UTC+02:00', label: 'Joanesburgo', description: 'África do Sul' },
  { value: 'Africa/Nairobi', offset: 'UTC+03:00', label: 'Nairóbi', description: 'Quênia, Tanzânia' },
  { value: 'Africa/Lagos', offset: 'UTC+01:00', label: 'Lagos', description: 'Nigéria' },
  { value: 'Africa/Casablanca', offset: 'UTC+00:00', label: 'Casablanca', description: 'Marrocos' },
  
  // UTC/GMT
  { value: 'UTC', offset: 'UTC+00:00', label: 'UTC', description: 'Tempo Universal Coordenado' },
];

// Função para obter o offset a partir do valor do timezone
export function getTimezoneOffset(timezoneValue: string): string {
  const timezone = timezones.find(tz => tz.value === timezoneValue);
  return timezone?.offset || 'UTC+00:00';
}

// Função para obter o timezone a partir do offset
export function getTimezoneByOffset(offset: string): Timezone[] {
  return timezones.filter(tz => tz.offset === offset);
}

// Função para obter o timezone a partir do label
export function getTimezoneByLabel(label: string): Timezone | undefined {
  return timezones.find(tz => tz.label.toLowerCase().includes(label.toLowerCase()));
}

// Lista de timezones agrupados por offset
export const timezonesByOffset: Record<string, Timezone[]> = timezones.reduce((acc, timezone) => {
  if (!acc[timezone.offset]) {
    acc[timezone.offset] = [];
  }
  acc[timezone.offset].push(timezone);
  return acc;
}, {} as Record<string, Timezone[]>);

// Lista de offsets numéricos para facilitar a conversão
export const offsetsMap: Record<string, number> = {
  'UTC-12:00': -12,
  'UTC-11:00': -11,
  'UTC-10:00': -10,
  'UTC-09:30': -9.5,
  'UTC-09:00': -9,
  'UTC-08:00': -8,
  'UTC-07:00': -7,
  'UTC-06:00': -6,
  'UTC-05:00': -5,
  'UTC-04:00': -4,
  'UTC-03:30': -3.5,
  'UTC-03:00': -3,
  'UTC-02:00': -2,
  'UTC-01:00': -1,
  'UTC+00:00': 0,
  'UTC+01:00': 1,
  'UTC+02:00': 2,
  'UTC+03:00': 3,
  'UTC+03:30': 3.5,
  'UTC+04:00': 4,
  'UTC+04:30': 4.5,
  'UTC+05:00': 5,
  'UTC+05:30': 5.5,
  'UTC+05:45': 5.75,
  'UTC+06:00': 6,
  'UTC+06:30': 6.5,
  'UTC+07:00': 7,
  'UTC+08:00': 8,
  'UTC+08:45': 8.75,
  'UTC+09:00': 9,
  'UTC+09:30': 9.5,
  'UTC+10:00': 10,
  'UTC+10:30': 10.5,
  'UTC+11:00': 11,
  'UTC+12:00': 12,
  'UTC+12:45': 12.75,
  'UTC+13:00': 13,
  'UTC+14:00': 14
}; 