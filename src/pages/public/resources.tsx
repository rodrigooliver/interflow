import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../../layouts/PublicLayout';

interface Resource {
  title: string;
  description: string;
  imageUrl?: string;
  link: string;
  type: string;
}

interface ResourcesSection {
  title: string;
  description?: string;
  resources: Resource[];
}

export default function Resources() {
  const { t } = useTranslation('resources');

  const renderResource = (resource: Resource) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
        {resource.imageUrl && (
          <div className="w-full pt-[56.25%] relative overflow-hidden">
            <img 
              src={resource.imageUrl} 
              alt={resource.title}
              className="absolute top-0 left-0 w-full h-full object-cover" 
            />
          </div>
        )}
        <div className="p-5">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-full mb-2">
            {resource.type}
          </span>
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            {resource.title}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {resource.description}
          </p>
          <a 
            href={resource.link} 
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300"
          >
            {t('viewResource')}
          </a>
        </div>
      </div>
    );
  };

  const renderSection = (section: ResourcesSection) => {
    return (
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
          {section.title}
        </h2>
        {section.description && (
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            {section.description}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {section.resources.map((resource, index) => (
            <div key={index}>
              {renderResource(resource)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <PublicLayout>
      <div className="pt-4 pb-8">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-12">
              {t('intro')}
            </p>

            {Object.entries(t('sections', { returnObjects: true })).map(([key, section]) => (
              <div key={key}>
                {renderSection(section as ResourcesSection)}
              </div>
            ))}
          </div>
        </main>
      </div>
    </PublicLayout>
  );
} 