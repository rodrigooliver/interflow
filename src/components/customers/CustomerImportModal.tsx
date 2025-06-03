import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useCustomFieldDefinitions } from '../../hooks/useQueryes';
import { ContactType } from '../../types/database';
import api from '../../lib/api';

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

interface ImportResult {
  success: boolean;
  customer_id: string | null;
  name: string;
  error_message: string | null;
}

interface CustomerImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface CustomerImportData {
  name: string;
  stage_id?: string;
  contacts?: Array<{
    type: ContactType;
    value: string;
    label: string | null;
  }>;
  custom_fields?: Record<string, string>;
}

export function CustomerImportModal({ onClose, onSuccess }: CustomerImportModalProps) {
  const { currentOrganizationMember } = useAuthContext();
  const { data: customFieldDefinitions = [] } = useCustomFieldDefinitions(currentOrganizationMember?.organization.id);
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para gerar CSV de exemplo
  const generateSampleCSV = () => {
    // Campos padrão principais
    const headers = ['name', 'whatsapp', 'email'];
    
    // Adicionar campos personalizados como slugs
    customFieldDefinitions.forEach(field => {
      if (field.slug) {
        headers.push(field.slug);
      }
    });

    const sampleData = [
      ['João Silva', '+5511999999999', 'joao@email.com'],
      ['Maria Santos', '+5511888887777', 'maria@email.com'],
      ['Pedro Costa', '+5511777776666', 'pedro@email.com']
    ];

    // Adicionar valores de exemplo para campos personalizados
    customFieldDefinitions.forEach((field) => {
      sampleData.forEach((row, rowIndex) => {
        if (field.type === 'text') {
          row.push(`Valor ${rowIndex + 1}`);
        } else if (field.type === 'number') {
          row.push(String((rowIndex + 1) * 100));
        } else if (field.type === 'date') {
          const date = new Date();
          date.setDate(date.getDate() + rowIndex);
          row.push(date.toISOString().split('T')[0]);
        } else if (field.type === 'select' && field.options && field.options.length > 0) {
          row.push(field.options[rowIndex % field.options.length]);
        } else {
          row.push(`Exemplo ${rowIndex + 1}`);
        }
      });
    });

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_clientes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para processar o arquivo CSV
  const parseCSV = (csvText: string): Record<string, string>[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.replace(/"/g, '').trim());
    const data: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.replace(/"/g, '').trim());
      const row: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }

    return data;
  };

  // Função para determinar o tipo de contato baseado no nome da coluna
  const getContactType = (columnName: string): ContactType | null => {
    const name = columnName.toLowerCase();
    if (name.includes('whatsapp')) return ContactType.WHATSAPP;
    if (name.includes('email')) return ContactType.EMAIL;
    return null;
  };

  // Função para processar a importação
  const processImport = async () => {
    if (!file || !currentOrganizationMember) return;

    setIsProcessing(true);
    setResults([]);
    setShowResults(false);

    try {
      const csvText = await file.text();
      const csvData = parseCSV(csvText);

      if (csvData.length === 0) {
        throw new Error('Arquivo CSV vazio ou inválido');
      }

      // Converter dados CSV para formato esperado pela função
      const customersData: CustomerImportData[] = csvData.map((row) => {
        const customerData: CustomerImportData = {
          name: row.name || row.nome || 'Cliente sem nome'
        };

        // Processar contatos
        const contacts: Array<{
          type: ContactType;
          value: string;
          label: string | null;
        }> = [];
        
        Object.keys(row).forEach(key => {
          const contactType = getContactType(key);
          if (contactType && row[key] && row[key].trim()) {
            contacts.push({
              type: contactType,
              value: row[key].trim(),
              label: null
            });
          }
        });

        if (contacts.length > 0) {
          customerData.contacts = contacts;
        }

        // Processar campos personalizados
        const customFields: Record<string, string> = {};
        customFieldDefinitions.forEach(fieldDef => {
          if (fieldDef.slug && row[fieldDef.slug]) {
            customFields[fieldDef.slug] = row[fieldDef.slug];
          }
        });

        if (Object.keys(customFields).length > 0) {
          customerData.custom_fields = customFields;
        }

        return customerData;
      });

      // Enviar dados para o backend
      const response = await api.post(`/api/${currentOrganizationMember.organization.id}/customers/import`, {
        customers: customersData
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao importar clientes');
      }

      setResults(response.data.data || []);
      setShowResults(true);

      // Se houve sucessos, chamar onSuccess
      const successCount = response.data.summary?.success || 0;
      if (successCount > 0) {
        onSuccess();
      }

    } catch (error) {
      const apiError = error as ApiError;
      console.error('Erro ao processar importação:', error);
      
      // Extrair mensagem de erro do backend
      const errorMessage = apiError.response?.data?.error || apiError.message || 'Erro desconhecido';
      
      setResults([{
        success: false,
        customer_id: null,
        name: 'Erro geral',
        error_message: errorMessage
      }]);
      setShowResults(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Função para lidar com a seleção de arquivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setShowResults(false);
      setResults([]);
    } else {
      alert('Por favor, selecione um arquivo CSV válido.');
    }
  };

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Importar Clientes via CSV
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!showResults ? (
            <>
              {/* Instructions */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Como importar seus clientes:
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200">
                  <li>Baixe o modelo CSV clicando no botão abaixo</li>
                  <li>Preencha o arquivo com os dados dos seus clientes</li>
                  <li>Para campos personalizados, use o slug como nome da coluna</li>
                  <li>
                    <strong>Números de telefone/WhatsApp:</strong> Use preferencialmente o formato internacional
                    <br />
                    <span className="text-sm">
                      Exemplos: +5511999999999, +5545987654321, 11999999999
                      <br />
                      (números serão automaticamente formatados pelo sistema)
                    </span>
                  </li>
                  <li>Faça upload do arquivo preenchido</li>
                  <li>Clique em "Processar Importação"</li>
                </ol>
              </div>

              {/* Download sample button */}
              <div className="mb-6">
                <button
                  onClick={generateSampleCSV}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Modelo CSV
                </button>
              </div>

              {/* Available fields info */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Campos Disponíveis para Importação:
                </h4>
                
                {/* Campos padrão */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Campos Padrão:
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div className="text-sm">
                      <span className="font-mono bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                        name
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        (Nome do cliente)
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-mono bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                        whatsapp
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        (WhatsApp)
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-mono bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                        email
                      </span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        (E-mail)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Campos personalizados */}
                {customFieldDefinitions.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Campos Personalizados:
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {customFieldDefinitions.map(field => (
                        <div key={field.id} className="text-sm">
                          <span className="font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            {field.slug}
                          </span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">
                            ({field.name})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* File upload */}
              <div className="mb-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {file ? file.name : 'Clique para selecionar arquivo CSV'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ou arraste e solte seu arquivo aqui
                  </p>
                </div>
              </div>

              {/* Process button */}
              {file && (
                <div className="flex justify-end">
                  <button
                    onClick={processImport}
                    disabled={isProcessing}
                    className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Processar Importação
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Results */
            <div>
              {/* Summary */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {successCount}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Clientes importados
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                        {errorCount}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Erros encontrados
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed results */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg flex items-center justify-between ${
                      result.success
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-3" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" />
                      )}
                      <span className={`font-medium ${
                        result.success 
                          ? 'text-green-900 dark:text-green-100' 
                          : 'text-red-900 dark:text-red-100'
                      }`}>
                        {result.name}
                      </span>
                    </div>
                    {result.error_message && (
                      <span className="text-sm text-red-700 dark:text-red-300">
                        {result.error_message}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => {
                    setShowResults(false);
                    setFile(null);
                    setResults([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                >
                  Importar Mais Arquivos
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 