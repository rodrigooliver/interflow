export interface CountryCode {
  code: string;
  name: string;
  dial_code: string;
}

export const countryCodes: CountryCode[] = [
  { code: 'AF', name: 'Afeganistão', dial_code: '+93' },
  { code: 'ZA', name: 'África do Sul', dial_code: '+27' },
  { code: 'AL', name: 'Albânia', dial_code: '+355' },
  { code: 'DE', name: 'Alemanha', dial_code: '+49' },
  { code: 'AD', name: 'Andorra', dial_code: '+376' },
  { code: 'AO', name: 'Angola', dial_code: '+244' },
  { code: 'AI', name: 'Anguilla', dial_code: '+1264' },
  { code: 'AQ', name: 'Antártida', dial_code: '+672' },
  { code: 'AG', name: 'Antígua e Barbuda', dial_code: '+1268' },
  { code: 'SA', name: 'Arábia Saudita', dial_code: '+966' },
  { code: 'DZ', name: 'Argélia', dial_code: '+213' },
  { code: 'AR', name: 'Argentina', dial_code: '+54' },
  { code: 'AM', name: 'Armênia', dial_code: '+374' },
  { code: 'AW', name: 'Aruba', dial_code: '+297' },
  { code: 'AU', name: 'Austrália', dial_code: '+61' },
  { code: 'AT', name: 'Áustria', dial_code: '+43' },
  { code: 'AZ', name: 'Azerbaijão', dial_code: '+994' },
  { code: 'BS', name: 'Bahamas', dial_code: '+1242' },
  { code: 'BH', name: 'Bahrein', dial_code: '+973' },
  { code: 'BD', name: 'Bangladesh', dial_code: '+880' },
  { code: 'BB', name: 'Barbados', dial_code: '+1246' },
  { code: 'BE', name: 'Bélgica', dial_code: '+32' },
  { code: 'BZ', name: 'Belize', dial_code: '+501' },
  { code: 'BJ', name: 'Benin', dial_code: '+229' },
  { code: 'BM', name: 'Bermudas', dial_code: '+1441' },
  { code: 'BY', name: 'Bielorrússia', dial_code: '+375' },
  { code: 'BO', name: 'Bolívia', dial_code: '+591' },
  { code: 'BA', name: 'Bósnia e Herzegovina', dial_code: '+387' },
  { code: 'BW', name: 'Botswana', dial_code: '+267' },
  { code: 'BR', name: 'Brasil', dial_code: '+55' },
  { code: 'BN', name: 'Brunei', dial_code: '+673' },
  { code: 'BG', name: 'Bulgária', dial_code: '+359' },
  { code: 'BF', name: 'Burkina Faso', dial_code: '+226' },
  { code: 'BI', name: 'Burundi', dial_code: '+257' },
  { code: 'BT', name: 'Butão', dial_code: '+975' },
  { code: 'CV', name: 'Cabo Verde', dial_code: '+238' },
  { code: 'CM', name: 'Camarões', dial_code: '+237' },
  { code: 'KH', name: 'Camboja', dial_code: '+855' },
  { code: 'CA', name: 'Canadá', dial_code: '+1' },
  { code: 'QA', name: 'Catar', dial_code: '+974' },
  { code: 'KZ', name: 'Cazaquistão', dial_code: '+7' },
  { code: 'TD', name: 'Chade', dial_code: '+235' },
  { code: 'CL', name: 'Chile', dial_code: '+56' },
  { code: 'CN', name: 'China', dial_code: '+86' },
  { code: 'CY', name: 'Chipre', dial_code: '+357' },
  { code: 'CO', name: 'Colômbia', dial_code: '+57' },
  { code: 'KM', name: 'Comores', dial_code: '+269' },
  { code: 'CG', name: 'Congo', dial_code: '+242' },
  { code: 'CD', name: 'Congo (RDC)', dial_code: '+243' },
  { code: 'KR', name: 'Coreia do Sul', dial_code: '+82' },
  { code: 'KP', name: 'Coreia do Norte', dial_code: '+850' },
  { code: 'CI', name: 'Costa do Marfim', dial_code: '+225' },
  { code: 'CR', name: 'Costa Rica', dial_code: '+506' },
  { code: 'HR', name: 'Croácia', dial_code: '+385' },
  { code: 'CU', name: 'Cuba', dial_code: '+53' },
  { code: 'DK', name: 'Dinamarca', dial_code: '+45' },
  { code: 'DJ', name: 'Djibuti', dial_code: '+253' },
  { code: 'DM', name: 'Dominica', dial_code: '+1767' },
  { code: 'EG', name: 'Egito', dial_code: '+20' },
  { code: 'SV', name: 'El Salvador', dial_code: '+503' },
  { code: 'AE', name: 'Emirados Árabes Unidos', dial_code: '+971' },
  { code: 'EC', name: 'Equador', dial_code: '+593' },
  { code: 'ER', name: 'Eritreia', dial_code: '+291' },
  { code: 'SK', name: 'Eslováquia', dial_code: '+421' },
  { code: 'SI', name: 'Eslovênia', dial_code: '+386' },
  { code: 'ES', name: 'Espanha', dial_code: '+34' },
  { code: 'US', name: 'Estados Unidos', dial_code: '+1' },
  { code: 'EE', name: 'Estônia', dial_code: '+372' },
  { code: 'ET', name: 'Etiópia', dial_code: '+251' },
  { code: 'FJ', name: 'Fiji', dial_code: '+679' },
  { code: 'PH', name: 'Filipinas', dial_code: '+63' },
  { code: 'FI', name: 'Finlândia', dial_code: '+358' },
  { code: 'FR', name: 'França', dial_code: '+33' },
  { code: 'GA', name: 'Gabão', dial_code: '+241' },
  { code: 'GM', name: 'Gâmbia', dial_code: '+220' },
  { code: 'GH', name: 'Gana', dial_code: '+233' },
  { code: 'GE', name: 'Geórgia', dial_code: '+995' },
  { code: 'GI', name: 'Gibraltar', dial_code: '+350' },
  { code: 'GD', name: 'Granada', dial_code: '+1473' },
  { code: 'GR', name: 'Grécia', dial_code: '+30' },
  { code: 'GL', name: 'Groenlândia', dial_code: '+299' },
  { code: 'GP', name: 'Guadalupe', dial_code: '+590' },
  { code: 'GU', name: 'Guam', dial_code: '+1671' },
  { code: 'GT', name: 'Guatemala', dial_code: '+502' },
  { code: 'GG', name: 'Guernsey', dial_code: '+44' },
  { code: 'GY', name: 'Guiana', dial_code: '+592' },
  { code: 'GF', name: 'Guiana Francesa', dial_code: '+594' },
  { code: 'GN', name: 'Guiné', dial_code: '+224' },
  { code: 'GQ', name: 'Guiné Equatorial', dial_code: '+240' },
  { code: 'GW', name: 'Guiné-Bissau', dial_code: '+245' },
  { code: 'HT', name: 'Haiti', dial_code: '+509' },
  { code: 'NL', name: 'Holanda', dial_code: '+31' },
  { code: 'HN', name: 'Honduras', dial_code: '+504' },
  { code: 'HK', name: 'Hong Kong', dial_code: '+852' },
  { code: 'HU', name: 'Hungria', dial_code: '+36' },
  { code: 'YE', name: 'Iêmen', dial_code: '+967' },
  { code: 'IN', name: 'Índia', dial_code: '+91' },
  { code: 'ID', name: 'Indonésia', dial_code: '+62' },
  { code: 'IQ', name: 'Iraque', dial_code: '+964' },
  { code: 'IR', name: 'Irã', dial_code: '+98' },
  { code: 'IE', name: 'Irlanda', dial_code: '+353' },
  { code: 'IS', name: 'Islândia', dial_code: '+354' },
  { code: 'IL', name: 'Israel', dial_code: '+972' },
  { code: 'IT', name: 'Itália', dial_code: '+39' },
  { code: 'JM', name: 'Jamaica', dial_code: '+1876' },
  { code: 'JP', name: 'Japão', dial_code: '+81' },
  { code: 'JE', name: 'Jersey', dial_code: '+44' },
  { code: 'JO', name: 'Jordânia', dial_code: '+962' },
  { code: 'KW', name: 'Kuwait', dial_code: '+965' },
  { code: 'LA', name: 'Laos', dial_code: '+856' },
  { code: 'LS', name: 'Lesoto', dial_code: '+266' },
  { code: 'LV', name: 'Letônia', dial_code: '+371' },
  { code: 'LB', name: 'Líbano', dial_code: '+961' },
  { code: 'LR', name: 'Libéria', dial_code: '+231' },
  { code: 'LY', name: 'Líbia', dial_code: '+218' },
  { code: 'LI', name: 'Liechtenstein', dial_code: '+423' },
  { code: 'LT', name: 'Lituânia', dial_code: '+370' },
  { code: 'LU', name: 'Luxemburgo', dial_code: '+352' },
  { code: 'MO', name: 'Macau', dial_code: '+853' },
  { code: 'MK', name: 'Macedônia do Norte', dial_code: '+389' },
  { code: 'MG', name: 'Madagascar', dial_code: '+261' },
  { code: 'MY', name: 'Malásia', dial_code: '+60' },
  { code: 'MW', name: 'Malawi', dial_code: '+265' },
  { code: 'MV', name: 'Maldivas', dial_code: '+960' },
  { code: 'ML', name: 'Mali', dial_code: '+223' },
  { code: 'MT', name: 'Malta', dial_code: '+356' },
  { code: 'MA', name: 'Marrocos', dial_code: '+212' },
  { code: 'MQ', name: 'Martinica', dial_code: '+596' },
  { code: 'MU', name: 'Maurício', dial_code: '+230' },
  { code: 'MR', name: 'Mauritânia', dial_code: '+222' },
  { code: 'YT', name: 'Mayotte', dial_code: '+262' },
  { code: 'MX', name: 'México', dial_code: '+52' },
  { code: 'MM', name: 'Mianmar', dial_code: '+95' },
  { code: 'FM', name: 'Micronésia', dial_code: '+691' },
  { code: 'MZ', name: 'Moçambique', dial_code: '+258' },
  { code: 'MD', name: 'Moldávia', dial_code: '+373' },
  { code: 'MC', name: 'Mônaco', dial_code: '+377' },
  { code: 'MN', name: 'Mongólia', dial_code: '+976' },
  { code: 'ME', name: 'Montenegro', dial_code: '+382' },
  { code: 'MS', name: 'Montserrat', dial_code: '+1664' },
  { code: 'NA', name: 'Namíbia', dial_code: '+264' },
  { code: 'NR', name: 'Nauru', dial_code: '+674' },
  { code: 'NP', name: 'Nepal', dial_code: '+977' },
  { code: 'NI', name: 'Nicarágua', dial_code: '+505' },
  { code: 'NE', name: 'Níger', dial_code: '+227' },
  { code: 'NG', name: 'Nigéria', dial_code: '+234' },
  { code: 'NU', name: 'Niue', dial_code: '+683' },
  { code: 'NO', name: 'Noruega', dial_code: '+47' },
  { code: 'NC', name: 'Nova Caledônia', dial_code: '+687' },
  { code: 'NZ', name: 'Nova Zelândia', dial_code: '+64' },
  { code: 'OM', name: 'Omã', dial_code: '+968' },
  { code: 'PW', name: 'Palau', dial_code: '+680' },
  { code: 'PA', name: 'Panamá', dial_code: '+507' },
  { code: 'PG', name: 'Papua-Nova Guiné', dial_code: '+675' },
  { code: 'PK', name: 'Paquistão', dial_code: '+92' },
  { code: 'PY', name: 'Paraguai', dial_code: '+595' },
  { code: 'PE', name: 'Peru', dial_code: '+51' },
  { code: 'PF', name: 'Polinésia Francesa', dial_code: '+689' },
  { code: 'PL', name: 'Polônia', dial_code: '+48' },
  { code: 'PR', name: 'Porto Rico', dial_code: '+1' },
  { code: 'PT', name: 'Portugal', dial_code: '+351' },
  { code: 'KE', name: 'Quênia', dial_code: '+254' },
  { code: 'KG', name: 'Quirguistão', dial_code: '+996' },
  { code: 'KI', name: 'Quiribati', dial_code: '+686' },
  { code: 'GB', name: 'Reino Unido', dial_code: '+44' },
  { code: 'CF', name: 'República Centro-Africana', dial_code: '+236' },
  { code: 'CZ', name: 'República Tcheca', dial_code: '+420' },
  { code: 'DO', name: 'República Dominicana', dial_code: '+1' },
  { code: 'RE', name: 'Reunião', dial_code: '+262' },
  { code: 'RO', name: 'Romênia', dial_code: '+40' },
  { code: 'RW', name: 'Ruanda', dial_code: '+250' },
  { code: 'RU', name: 'Rússia', dial_code: '+7' },
  { code: 'EH', name: 'Saara Ocidental', dial_code: '+212' },
  { code: 'WS', name: 'Samoa', dial_code: '+685' },
  { code: 'AS', name: 'Samoa Americana', dial_code: '+1684' },
  { code: 'SM', name: 'San Marino', dial_code: '+378' },
  { code: 'SH', name: 'Santa Helena', dial_code: '+290' },
  { code: 'LC', name: 'Santa Lúcia', dial_code: '+1758' },
  { code: 'BL', name: 'São Bartolomeu', dial_code: '+590' },
  { code: 'KN', name: 'São Cristóvão e Nevis', dial_code: '+1869' },
  { code: 'MF', name: 'São Martinho', dial_code: '+590' },
  { code: 'PM', name: 'São Pedro e Miquelão', dial_code: '+508' },
  { code: 'VC', name: 'São Vicente e Granadinas', dial_code: '+1784' },
  { code: 'ST', name: 'São Tomé e Príncipe', dial_code: '+239' },
  { code: 'SN', name: 'Senegal', dial_code: '+221' },
  { code: 'SL', name: 'Serra Leoa', dial_code: '+232' },
  { code: 'RS', name: 'Sérvia', dial_code: '+381' },
  { code: 'SC', name: 'Seychelles', dial_code: '+248' },
  { code: 'SG', name: 'Singapura', dial_code: '+65' },
  { code: 'SY', name: 'Síria', dial_code: '+963' },
  { code: 'SO', name: 'Somália', dial_code: '+252' },
  { code: 'LK', name: 'Sri Lanka', dial_code: '+94' },
  { code: 'SZ', name: 'Suazilândia', dial_code: '+268' },
  { code: 'SD', name: 'Sudão', dial_code: '+249' },
  { code: 'SS', name: 'Sudão do Sul', dial_code: '+211' },
  { code: 'SE', name: 'Suécia', dial_code: '+46' },
  { code: 'CH', name: 'Suíça', dial_code: '+41' },
  { code: 'SR', name: 'Suriname', dial_code: '+597' },
  { code: 'SJ', name: 'Svalbard e Jan Mayen', dial_code: '+47' },
  { code: 'TH', name: 'Tailândia', dial_code: '+66' },
  { code: 'TW', name: 'Taiwan', dial_code: '+886' },
  { code: 'TJ', name: 'Tajiquistão', dial_code: '+992' },
  { code: 'TZ', name: 'Tanzânia', dial_code: '+255' },
  { code: 'TL', name: 'Timor-Leste', dial_code: '+670' },
  { code: 'TG', name: 'Togo', dial_code: '+228' },
  { code: 'TK', name: 'Tokelau', dial_code: '+690' },
  { code: 'TO', name: 'Tonga', dial_code: '+676' },
  { code: 'TT', name: 'Trinidad e Tobago', dial_code: '+1868' },
  { code: 'TN', name: 'Tunísia', dial_code: '+216' },
  { code: 'TM', name: 'Turcomenistão', dial_code: '+993' },
  { code: 'TR', name: 'Turquia', dial_code: '+90' },
  { code: 'TV', name: 'Tuvalu', dial_code: '+688' },
  { code: 'UA', name: 'Ucrânia', dial_code: '+380' },
  { code: 'UG', name: 'Uganda', dial_code: '+256' },
  { code: 'UY', name: 'Uruguai', dial_code: '+598' },
  { code: 'UZ', name: 'Uzbequistão', dial_code: '+998' },
  { code: 'VU', name: 'Vanuatu', dial_code: '+678' },
  { code: 'VA', name: 'Vaticano', dial_code: '+39' },
  { code: 'VE', name: 'Venezuela', dial_code: '+58' },
  { code: 'VN', name: 'Vietnã', dial_code: '+84' },
  { code: 'VI', name: 'Ilhas Virgens Americanas', dial_code: '+1340' },
  { code: 'VG', name: 'Ilhas Virgens Britânicas', dial_code: '+1284' },
  { code: 'WF', name: 'Wallis e Futuna', dial_code: '+681' },
  { code: 'ZM', name: 'Zâmbia', dial_code: '+260' },
  { code: 'ZW', name: 'Zimbábue', dial_code: '+263' }
];

// Função auxiliar para obter o código do país a partir do código de discagem
export const getCountryCodeFromDialCode = (dialCode: string): string | undefined => {
  const country = countryCodes.find(c => dialCode.startsWith(c.dial_code));
  return country?.code;
};

// Função auxiliar para formatar números de telefone
export const formatPhoneNumber = (value: string): string => {
  // Remove todos os caracteres não numéricos
  const numericValue = value.replace(/\D/g, '');
  
  // Formata o número de acordo com o padrão brasileiro (exemplo)
  if (numericValue.length <= 2) {
    return numericValue;
  } else if (numericValue.length <= 7) {
    return `${numericValue.slice(0, 2)} ${numericValue.slice(2)}`;
  } else if (numericValue.length <= 11) {
    return `${numericValue.slice(0, 2)} ${numericValue.slice(2, 7)}-${numericValue.slice(7)}`;
  } else {
    return `${numericValue.slice(0, 2)} ${numericValue.slice(2, 7)}-${numericValue.slice(7, 11)}`;
  }
};

// Função para extrair o código do país e o número de um valor completo
export const extractPhoneComponents = (fullNumber: string): { countryCode: string, phoneNumber: string } => {
  // Valor padrão
  let result = { countryCode: 'BR', phoneNumber: fullNumber };
  
  // Procura por um código de discagem no início do número
  for (const country of countryCodes) {
    if (fullNumber.startsWith(country.dial_code)) {
      result = {
        countryCode: country.code,
        phoneNumber: fullNumber.substring(country.dial_code.length)
      };
      break;
    }
  }
  
  return result;
}; 