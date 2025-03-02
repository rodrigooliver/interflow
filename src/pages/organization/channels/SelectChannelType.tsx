import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getChannelIcon } from '../../../utils/channel';

export default function SelectChannelType() {
  const { t } = useTranslation(['channels', 'common']);
  const navigate = useNavigate();

  const channelTypes = [
    { 
      id: 'whatsapp_official', 
      name: t('types.whatsapp_official'),
      description: t('descriptions.whatsapp_official'),
      icon: getChannelIcon('whatsapp_official')
    },
    { 
      id: 'whatsapp_wapi', 
      name: t('types.whatsapp_wapi'),
      description: t('descriptions.whatsapp_wapi'),
      icon: getChannelIcon('whatsapp_wapi')
    },
    { 
      id: 'whatsapp_zapi', 
      name: t('types.whatsapp_zapi'),
      description: t('descriptions.whatsapp_zapi'),
      icon: getChannelIcon('whatsapp_zapi')
    },
    { 
      id: 'whatsapp_evo', 
      name: t('types.whatsapp_evo'),
      description: t('descriptions.whatsapp_evo'),
      icon: getChannelIcon('whatsapp_evo')
    },
    { 
      id: 'instagram', 
      name: t('types.instagram'),
      description: t('descriptions.instagram'),
      icon: getChannelIcon('instagram')
    },
    { 
      id: 'facebook', 
      name: t('types.facebook'),
      description: t('descriptions.facebook'),
      icon: getChannelIcon('facebook')
    },
    {
      id: 'email',
      name: t('types.email'),
      description: t('descriptions.email'),
      icon: getChannelIcon('email')
    }
  ];

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/app/channels')}
            className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('form.title.create')}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channelTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => navigate(`/app/channels/new/${type.id}`)}
              className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
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