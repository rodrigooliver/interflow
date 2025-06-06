import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getChannelIcon } from '../../utils/channel';
import { useAuthContext } from '../../contexts/AuthContext';
import { useOrganizationById } from '../../hooks/useQueryes';

export default function SelectChannelType() {
  const { t } = useTranslation(['channels', 'common']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showWapi = searchParams.get('n') === '1';
  const queryOrganizationId = searchParams.get('organizationId');
  const { currentOrganizationMember } = useAuthContext();

  // Buscar dados da organização específica se vier da URL
  const { data: urlOrganization } = useOrganizationById(queryOrganizationId || undefined);

  // Verificar limite de canais - usar dados da URL se disponível, senão usar currentOrganizationMember
  const organizationData = urlOrganization || currentOrganizationMember?.organization;
  const channelUsage = organizationData?.usage?.channels;
  const isChannelLimitReached = channelUsage && channelUsage.used >= channelUsage.limit;

  // Adicionar função para voltar usando a history do navegador
  const handleGoBack = () => {
    window.history.back();
  };

  const handleChannelTypeClick = (typeId: string) => {
    if (isChannelLimitReached) {
      return; // Não navega se o limite foi atingido
    }
    navigate(`/app/channels/new/${typeId}${queryOrganizationId ? `?organizationId=${queryOrganizationId}` : ''}`);
  };

  const channelTypes = [
    // { 
    //   id: 'whatsapp_official', 
    //   name: t('types.whatsapp_official'),
    //   description: t('descriptions.whatsapp_official'),
    //   icon: getChannelIcon('whatsapp_official')
    // },
    ...(showWapi ? [{
      id: 'whatsapp_wapi', 
      name: t('types.whatsapp_wapi'),
      description: t('descriptions.whatsapp_wapi'),
      icon: getChannelIcon('whatsapp_wapi')
    }] : []),
    {
      id: 'whatsapp_wapi', 
      name: t('types.whatsapp_wapi'),
      description: t('descriptions.whatsapp_wapi'),
      icon: getChannelIcon('whatsapp_wapi')
    },
    // { 
    //   id: 'whatsapp_zapi', 
    //   name: t('types.whatsapp_zapi'),
    //   description: t('descriptions.whatsapp_zapi'),
    //   icon: getChannelIcon('whatsapp_zapi')
    // },
    // { 
    //   id: 'whatsapp_evo', 
    //   name: t('types.whatsapp_evo'),
    //   description: t('descriptions.whatsapp_evo'),
    //   icon: getChannelIcon('whatsapp_evo')
    // },
    { 
      id: 'instagram', 
      name: t('types.instagram'),
      description: t('descriptions.instagram'),
      icon: getChannelIcon('instagram')
    },
    // { 
    //   id: 'facebook', 
    //   name: t('types.facebook'),
    //   description: t('descriptions.facebook'),
    //   icon: getChannelIcon('facebook')
    // },
    {
      id: 'email',
      name: t('types.email'),
      description: t('descriptions.email'),
      icon: getChannelIcon('email')
    }
  ];

  return (
    <div className="p-3 md:p-6 pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={handleGoBack}
            className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-1xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {t('form.title.create')}
            {channelUsage && (
              <span className="ml-3 text-sm font-normal text-gray-500 dark:text-gray-400">
                ({channelUsage.used}/{channelUsage.limit} canais)
              </span>
            )}
          </h1>
        </div>

        {/* Mensagem de limite atingido */}
        {isChannelLimitReached && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-4 rounded-md flex items-start justify-between">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium">
                  {t('limit.title', 'Limite de canais atingido')}
                </h3>
                <p className="text-sm mt-1">
                  {t('limit.message', 'Você atingiu o limite de {{limit}} canais do seu plano atual. Para adicionar mais canais, faça upgrade do seu plano.', { limit: channelUsage?.limit })}
                </p>
              </div>
            </div>
            <div className="ml-4">
              <RouterLink
                to="/app/settings/billing"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                {t('limit.upgrade', 'Trocar Plano')}
              </RouterLink>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channelTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => handleChannelTypeClick(type.id)}
              disabled={isChannelLimitReached}
              className={`text-left p-6 rounded-lg shadow transition-colors ${
                isChannelLimitReached
                  ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center mb-4">
                <img src={type.icon} alt={type.name} className="w-8 h-8 mr-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {type.name}
                </h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {type.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}