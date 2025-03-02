import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Mail, Phone, Instagram, Facebook, ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ContactType } from '../../types/database';
import { countryCodes } from '../../utils/countryCodes';

export interface ContactFormData {
  id?: string;
  type: ContactType;
  value: string;
  label?: string | null;
  isNew?: boolean;
  countryCode?: string;
  showTypeDropdown?: boolean;
}

interface ContactsFormSectionProps {
  contacts: ContactFormData[];
  setContacts: React.Dispatch<React.SetStateAction<ContactFormData[]>>;
  dropdownRef?: React.RefObject<HTMLDivElement>;
}

export function ContactsFormSection({ 
  contacts, 
  setContacts,
  dropdownRef
}: ContactsFormSectionProps) {
  const { t } = useTranslation(['customers', 'common']);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState<number | null>(null);
  
  // Criar um ref local se não for fornecido um
  const localDropdownRef = useRef<HTMLDivElement>(null);
  const effectiveDropdownRef = dropdownRef || localDropdownRef;
  
  // Ref específico para o dropdown de países
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  
  // Ref específico para o dropdown de tipos de contato
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  
  // Ref para armazenar o índice do dropdown de tipo de contato aberto
  const [activeTypeDropdownIndex, setActiveTypeDropdownIndex] = useState<number | null>(null);

  // Efeito para fechar dropdowns quando clicar fora deles
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Verificar se o clique foi fora do dropdown de tipo de contato
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setContacts(prevContacts => 
          prevContacts.map(contact => ({
            ...contact,
            showTypeDropdown: false
          }))
        );
        setActiveTypeDropdownIndex(null);
      }
      
      // Verificar se o clique foi fora do dropdown de países
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(null);
        setCountrySearch('');
      }
    }

    // Adicionar event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Limpar event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setContacts]);

  const handleAddContact = () => {
    setContacts([...contacts, { 
      type: ContactType.WHATSAPP, 
      value: '', 
      label: null, 
      isNew: true, 
      countryCode: 'BR',
      showTypeDropdown: false 
    }]);
  };

  const handleRemoveContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const getContactIcon = (type: ContactType) => {
    switch (type) {
      case ContactType.EMAIL:
        return <Mail className="w-5 h-5 text-blue-500" />;
      case ContactType.WHATSAPP:
        return <img src="/images/logos/whatsapp.svg" alt="WhatsApp" className="w-5 h-5" />;
      case ContactType.PHONE:
        return <Phone className="w-5 h-5 text-purple-500" />;
      case ContactType.INSTAGRAM:
        return <Instagram className="w-5 h-5 text-pink-500" />;
      case ContactType.INSTAGRAM_ID:
        return <Instagram className="w-5 h-5 text-pink-500" />;
      case ContactType.FACEBOOK:
        return <Facebook className="w-5 h-5 text-blue-600" />;
      case ContactType.FACEBOOK_ID:
        return <Facebook className="w-5 h-5 text-blue-600" />;
      case ContactType.TELEGRAM:
        return <img src="/images/logos/telegram.svg" alt="Telegram" className="w-5 h-5" />;
      default:
        return <Mail className="w-5 h-5 text-gray-500" />;
    }
  };

  const needsCountryCode = (type: ContactType): boolean => {
    return type === ContactType.WHATSAPP || type === ContactType.PHONE || type === ContactType.TELEGRAM;
  };

  // Filtrar países com base na pesquisa
  const filteredCountries = countrySearch 
    ? countryCodes.filter(country => 
        country.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
        country.dial_code.includes(countrySearch) ||
        country.code.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : countryCodes;

  return (
    <div className="border-t dark:border-gray-700 pt-4" ref={localDropdownRef}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handleAddContact}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          {t('customers:addContact')}
        </button>
      </div>

      {contacts.map((contact, index) => (
        <div key={index} className="flex items-start mb-3 gap-2">
          <div className={`${contact.showTypeDropdown ? 'w-full sm:w-auto flex-1 min-w-[120px]' : 'w-auto'} relative`}>
            {/* Dropdown personalizado com ícones */}
            <div className="relative" ref={activeTypeDropdownIndex === index ? typeDropdownRef : null}>
              <button
                type="button"
                onClick={() => {
                  // Fechar todos os outros dropdowns primeiro
                  const newContacts = [...contacts].map(c => ({
                    ...c,
                    showTypeDropdown: false
                  }));
                  // Abrir/fechar o dropdown atual
                  newContacts[index].showTypeDropdown = !contacts[index].showTypeDropdown;
                  setContacts(newContacts);
                  
                  // Atualizar o índice do dropdown ativo
                  setActiveTypeDropdownIndex(newContacts[index].showTypeDropdown ? index : null);
                  
                  // Fechar dropdown de países se estiver aberto
                  setShowCountryDropdown(null);
                }}
                className={`h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:border-blue-500 focus:border-blue-500 focus:ring-blue-500 px-3 flex items-center justify-between ${contact.showTypeDropdown ? 'w-full' : 'w-12'} transition-all duration-200`}
              >
                <span className="flex items-center">
                  {getContactIcon(contact.type)}
                  {contact.showTypeDropdown && (
                    <span className="ml-2 text-sm">
                      {contact.type === ContactType.WHATSAPP ? 'WhatsApp' :
                       contact.type === ContactType.EMAIL ? 'Email' :
                       contact.type === ContactType.PHONE ? 'Telefone' :
                       contact.type === ContactType.INSTAGRAM ? 'Instagram' :
                       contact.type === ContactType.FACEBOOK ? 'Facebook' :
                       contact.type === ContactType.TELEGRAM ? 'Telegram' : 'Outro'}
                    </span>
                  )}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
              
              {contact.showTypeDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                    onClick={() => {
                      const newContacts = [...contacts];
                      newContacts[index].type = ContactType.WHATSAPP;
                      newContacts[index].showTypeDropdown = false;
                      if (needsCountryCode(ContactType.WHATSAPP) && !newContacts[index].countryCode) {
                        newContacts[index].countryCode = 'BR';
                      }
                      setContacts(newContacts);
                      setActiveTypeDropdownIndex(null);
                    }}
                  >
                    <img src="/images/logos/whatsapp.svg" alt="WhatsApp" className="w-5 h-5 mr-2" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                    onClick={() => {
                      const newContacts = [...contacts];
                      newContacts[index].type = ContactType.EMAIL;
                      newContacts[index].showTypeDropdown = false;
                      setContacts(newContacts);
                      setActiveTypeDropdownIndex(null);
                    }}
                  >
                    <Mail className="w-5 h-5 mr-2 text-blue-500" />
                    <span>Email</span>
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                    onClick={() => {
                      const newContacts = [...contacts];
                      newContacts[index].type = ContactType.PHONE;
                      newContacts[index].showTypeDropdown = false;
                      if (needsCountryCode(ContactType.PHONE) && !newContacts[index].countryCode) {
                        newContacts[index].countryCode = 'BR';
                      }
                      setContacts(newContacts);
                      setActiveTypeDropdownIndex(null);
                    }}
                  >
                    <Phone className="w-5 h-5 mr-2 text-purple-500" />
                    <span>Telefone</span>
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                    onClick={() => {
                      const newContacts = [...contacts];
                      newContacts[index].type = ContactType.INSTAGRAM;
                      newContacts[index].showTypeDropdown = false;
                      setContacts(newContacts);
                      setActiveTypeDropdownIndex(null);
                    }}
                  >
                    <Instagram className="w-5 h-5 mr-2 text-pink-500" />
                    <span>Instagram</span>
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                    onClick={() => {
                      const newContacts = [...contacts];
                      newContacts[index].type = ContactType.FACEBOOK;
                      newContacts[index].showTypeDropdown = false;
                      setContacts(newContacts);
                      setActiveTypeDropdownIndex(null);
                    }}
                  >
                    <Facebook className="w-5 h-5 mr-2 text-blue-600" />
                    <span>Facebook</span>
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                    onClick={() => {
                      const newContacts = [...contacts];
                      newContacts[index].type = ContactType.TELEGRAM;
                      newContacts[index].showTypeDropdown = false;
                      if (needsCountryCode(ContactType.TELEGRAM) && !newContacts[index].countryCode) {
                        newContacts[index].countryCode = 'BR';
                      }
                      setContacts(newContacts);
                      setActiveTypeDropdownIndex(null);
                    }}
                  >
                    <img src="/images/logos/telegram.svg" alt="Telegram" className="w-5 h-5 mr-2" />
                    <span>Telegram</span>
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                    onClick={() => {
                      const newContacts = [...contacts];
                      newContacts[index].type = ContactType.OTHER;
                      newContacts[index].showTypeDropdown = false;
                      setContacts(newContacts);
                      setActiveTypeDropdownIndex(null);
                    }}
                  >
                    <span className="ml-7">Outro</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className={`${contact.showTypeDropdown ? 'flex-[2] min-w-[200px]' : 'flex-1'}`}>
            <div className="flex items-center">
              {needsCountryCode(contact.type) && (
                <div className="relative" ref={showCountryDropdown === index ? countryDropdownRef : null}>
                  <button
                    type="button"
                    className="h-10 rounded-l-md border-r-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 flex items-center"
                    onClick={() => {
                      // Fechar dropdown de tipo de contato se estiver aberto
                      if (contacts[index].showTypeDropdown) {
                        const newContacts = [...contacts];
                        newContacts[index].showTypeDropdown = false;
                        setContacts(newContacts);
                        setActiveTypeDropdownIndex(null);
                      }
                      
                      // Alternar dropdown de países
                      setShowCountryDropdown(showCountryDropdown === index ? null : index);
                      setCountrySearch('');
                    }}
                  >
                    {countryCodes.find(country => country.code === contact.countryCode)?.dial_code || '+55'}
                  </button>
                  
                  {showCountryDropdown === index && (
                    <div className="absolute z-10 mt-1 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto">
                      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                          <input
                            type="text"
                            className="w-full h-8 pl-8 pr-3 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Pesquisar país..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            autoFocus
                          />
                          <Search className="absolute left-2 top-1.5 h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredCountries.map(country => (
                          <button
                            key={country.code}
                            type="button"
                            className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                            onClick={() => {
                              const newContacts = [...contacts];
                              newContacts[index].countryCode = country.code;
                              setContacts(newContacts);
                              setShowCountryDropdown(null);
                              setCountrySearch('');
                            }}
                          >
                            <span>{country.name}</span>
                            <span className="text-gray-500 dark:text-gray-400">{country.dial_code}</span>
                          </button>
                        ))}
                        {filteredCountries.length === 0 && (
                          <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
                            Nenhum país encontrado
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <input
                type={contact.type === ContactType.EMAIL ? 'email' : 'text'}
                className={`flex-1 h-10 ${needsCountryCode(contact.type) ? 'rounded-r-md rounded-l-none' : 'rounded-md'} border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-1`}
                value={contact.value}
                onChange={(e) => {
                  const newContacts = [...contacts];
                  newContacts[index].value = e.target.value;
                  setContacts(newContacts);
                }}
                placeholder={
                  contact.type === ContactType.EMAIL ? 'email@exemplo.com' :
                  contact.type === ContactType.WHATSAPP ? '99999-9999' :
                  contact.type === ContactType.PHONE ? '99999-9999' :
                  contact.type === ContactType.INSTAGRAM ? '@usuario' :
                  contact.type === ContactType.FACEBOOK ? '@usuario' :
                  contact.type === ContactType.TELEGRAM ? '@usuario' : ''
                }
              />
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => handleRemoveContact(index)}
            className="inline-flex items-center justify-center h-10 w-10 rounded-md text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            disabled={contacts.length === 1}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Função utilitária para formatar valores de contato
export const formatContactValue = (contact: ContactFormData): string => {
  if (needsCountryCode(contact.type) && contact.countryCode) {
    const countryCode = countryCodes.find(cc => cc.code === contact.countryCode);
    if (countryCode && contact.value) {
      return `${countryCode.dial_code}${contact.value.replace(/\D/g, '')}`;
    }
  }
  return contact.value;
};

// Função utilitária para verificar se um tipo de contato precisa de código de país
export const needsCountryCode = (type: ContactType): boolean => {
  return type === ContactType.WHATSAPP || type === ContactType.PHONE || type === ContactType.TELEGRAM;
}; 