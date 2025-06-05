import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, Package, Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Calendar, Phone, Hash, Eye, X, Copy, ExternalLink, EyeOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';

interface WapiInstance {
  instanceId: string;
  token: string;
  created: number;
  instanceName: string;
  connected: boolean;
  connectedPhone: string;
  contacts: number;
  chats: number;
  messagesSent: number;
  messagesReceived: number;
  webhookConnectedUrl: string;
  webhookDeliveryUrl: string;
  webhookDisconnectedUrl: string;
  webhookStatusUrl: string;
  webhookPresenceUrl: string;
  webhookReceivedUrl: string;
  automaticReading: boolean;
  rejectCalls: boolean;
  callMessage: string;
}

interface WapiResponse {
  success: boolean;
  data: WapiInstance[];
  pagination: {
    total: number;
    totalPage: number;
    pageSize: number;
    page: number;
  };
}

export default function WapiInstances() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [instances, setInstances] = useState<WapiInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadingRef = useRef(false);
  
  // Estados para o modal de detalhes
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WapiInstance | null>(null);
  const [showToken, setShowToken] = useState(false);
  
  // Estados para paginação
  const [pagination, setPagination] = useState({
    total: 0,
    totalPage: 0,
    pageSize: 10,
    page: 1
  });
  
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Funções de navegação
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPage) {
      const newSearchParams = new URLSearchParams(searchParams);
      if (page === 1) {
        newSearchParams.delete('page');
      } else {
        newSearchParams.set('page', page.toString());
      }
      setSearchParams(newSearchParams);
    }
  };

  const handleGoBack = () => {
    navigate('/app/admin/organizations');
  };

  const loadInstances = useCallback(async () => {
    // Evita chamadas duplas usando ref
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (currentPage > 1) {
        params.append('page', currentPage.toString());
      }

      const response = await api.get(`/api/organizations/wapi-channels${params.toString() ? '?' + params.toString() : ''}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao carregar instâncias WAPI');
      }

      const data: WapiResponse = response.data;
      setInstances(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Erro ao carregar instâncias WAPI:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar instâncias WAPI');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [currentPage]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConnectionColor = (connected: boolean) => {
    return connected
      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400';
  };

  const getConnectionText = (connected: boolean) => {
    return connected ? 'Conectado' : 'Desconectado';
  };

  const handleShowDetails = (instance: WapiInstance) => {
    setSelectedInstance(instance);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedInstance(null);
    setShowToken(false); // Reset token visibility when closing modal
  };

  const toggleTokenVisibility = () => {
    setShowToken(!showToken);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Você pode adicionar um toast aqui se quiser
    } catch (error) {
      console.error('Erro ao copiar para área de transferência:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={handleGoBack}
            className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Instâncias WAPI</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={handleGoBack}
          className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Instâncias WAPI</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {error && (
          <div className="p-6 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 border-b dark:border-gray-700">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {error}
            </div>
          </div>
        )}

        {instances.length === 0 && !error ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>Nenhuma instância WAPI encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Instância
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Conexão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estatísticas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Configurações
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {instances.map((instance) => (
                  <tr key={instance.instanceId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {instance.instanceName || 'Sem nome'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <Hash className="h-3 w-3 mr-1" />
                            {instance.instanceId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-y-1 flex-col">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConnectionColor(instance.connected)}`}>
                          {instance.connected ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {getConnectionText(instance.connected)}
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              {getConnectionText(instance.connected)}
                            </>
                          )}
                        </span>
                        {instance.connectedPhone && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {instance.connectedPhone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs space-y-1">
                        <div className="text-gray-500 dark:text-gray-400">
                          Contatos: {instance.contacts.toLocaleString()}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          Chats: {instance.chats.toLocaleString()}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          Enviadas: {instance.messagesSent.toLocaleString()}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          Recebidas: {instance.messagesReceived.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs space-y-1">
                        <div className={`flex items-center ${instance.rejectCalls ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {instance.rejectCalls ? '✓' : '✗'} Rejeitar ligações
                        </div>
                        <div className={`flex items-center ${instance.automaticReading ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {instance.automaticReading ? '✓' : '✗'} Leitura automática
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(instance.created)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleShowDetails(instance)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {pagination.totalPage > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPage}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Mostrando {((currentPage - 1) * pagination.pageSize) + 1} até {Math.min(currentPage * pagination.pageSize, pagination.total)} de {pagination.total} instâncias
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {/* Números das páginas */}
                  {Array.from({ length: Math.min(5, pagination.totalPage) }).map((_, idx) => {
                    let pageNumber;
                    
                    if (pagination.totalPage <= 5) {
                      pageNumber = idx + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = idx + 1;
                    } else if (currentPage >= pagination.totalPage - 2) {
                      pageNumber = pagination.totalPage - 4 + idx;
                    } else {
                      pageNumber = currentPage - 2 + idx;
                    }
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNumber
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-500'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Próximo</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedInstance && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900" onClick={handleCloseDetails}></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Detalhes da Instância: {selectedInstance.instanceName}
                  </h3>
                  <button
                    onClick={handleCloseDetails}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Informações Básicas */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Informações Básicas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID da Instância</label>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900 dark:text-white font-mono">{selectedInstance.instanceId}</span>
                          <button
                            onClick={() => copyToClipboard(selectedInstance.instanceId)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            title="Copiar"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Token</label>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900 dark:text-white font-mono">
                            {showToken ? selectedInstance.token : '•'.repeat(selectedInstance.token.length)}
                          </span>
                          <button
                            onClick={toggleTokenVisibility}
                            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            title={showToken ? "Ocultar token" : "Revelar token"}
                          >
                            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(selectedInstance.token)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            title="Copiar"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status de Conexão</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConnectionColor(selectedInstance.connected)}`}>
                          {selectedInstance.connected ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {getConnectionText(selectedInstance.connected)}
                        </span>
                      </div>
                      {selectedInstance.connectedPhone && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone Conectado</label>
                          <span className="text-sm text-gray-900 dark:text-white">{selectedInstance.connectedPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estatísticas */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Estatísticas</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{selectedInstance.contacts}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Contatos</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{selectedInstance.chats}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Chats</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedInstance.messagesSent}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Enviadas</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedInstance.messagesReceived}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Recebidas</div>
                      </div>
                    </div>
                  </div>

                  {/* Configurações */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Configurações</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Leitura Automática</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedInstance.automaticReading
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                        }`}>
                          {selectedInstance.automaticReading ? 'Ativada' : 'Desativada'}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rejeitar Chamadas</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedInstance.rejectCalls
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                        }`}>
                          {selectedInstance.rejectCalls ? 'Ativado' : 'Desativado'}
                        </span>
                      </div>
                      {selectedInstance.callMessage && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mensagem de Chamada</label>
                          <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <span className="text-sm text-gray-900 dark:text-white">{selectedInstance.callMessage}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Webhooks */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Webhooks</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Conectado', url: selectedInstance.webhookConnectedUrl },
                        { label: 'Desconectado', url: selectedInstance.webhookDisconnectedUrl },
                        { label: 'Mensagem Recebida', url: selectedInstance.webhookReceivedUrl },
                        { label: 'Entrega', url: selectedInstance.webhookDeliveryUrl },
                        { label: 'Status', url: selectedInstance.webhookStatusUrl },
                        { label: 'Presença', url: selectedInstance.webhookPresenceUrl }
                      ].map((webhook, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{webhook.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                              {webhook.url && webhook.url.trim() !== '' ? webhook.url : (
                                <span className="italic text-gray-400 dark:text-gray-500">Não configurado</span>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            {webhook.url && webhook.url.trim() !== '' ? (
                              <>
                                <button
                                  onClick={() => copyToClipboard(webhook.url)}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                  title="Copiar URL"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <a
                                  href={webhook.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-800 dark:text-green-400"
                                  title="Abrir URL"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </>
                            ) : (
                              <div className="w-8 h-4"></div> // Espaço vazio para manter alinhamento
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCloseDetails}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 