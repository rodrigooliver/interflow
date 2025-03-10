import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../../layouts/PublicLayout';
interface TermsSection {
  title: string;
  content?: string;
  items?: string[];
  subsections?: {
    title: string;
    content?: string;
    items?: string[];
  }[];
  contact?: string;
  email?: string;
  address?: string;
}

export default function TermsOfService() {
  const { t } = useTranslation('terms');

  const renderSubsection = (subsection: { title: string; content?: string; items?: string[] }) => {
    return (
      <div className="mb-4 ml-4">
        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
          {subsection.title}
        </h3>
        {subsection.content && (
          <p className="text-gray-700 dark:text-gray-300 mb-2">{subsection.content}</p>
        )}
        {subsection.items && (
          <ul className="list-disc pl-6 space-y-2">
            {subsection.items.map((item: string, index: number) => (
              <li key={index} className="text-gray-700 dark:text-gray-300">
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderSection = (section: TermsSection) => {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {section.title}
        </h2>
        {section.content && (
          <p className="text-gray-700 dark:text-gray-300 mb-4">{section.content}</p>
        )}
        {section.items && (
          <ul className="list-disc pl-6 space-y-2">
            {section.items.map((item: string, index: number) => (
              <li key={index} className="text-gray-700 dark:text-gray-300">
                {item}
              </li>
            ))}
          </ul>
        )}
        {section.subsections && section.subsections.map((subsection, index) => (
          <div key={index}>
            {renderSubsection(subsection)}
          </div>
        ))}
        {section.contact && (
          <p className="text-gray-700 dark:text-gray-300 mt-4">{section.contact}</p>
        )}
        {section.email && (
          <p className="text-gray-700 dark:text-gray-300">{section.email}</p>
        )}
        {section.address && (
          <p className="text-gray-700 dark:text-gray-300">{section.address}</p>
        )}
      </div>
    );
  };

  return (
    <PublicLayout>
      
      <div className="pt-4 pb-8">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('effectiveDate')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-12">
              {t('intro')}
            </p>

            {Object.entries(t('sections', { returnObjects: true })).map(([key, section]) => (
              <div key={key}>
                {renderSection(section as TermsSection)}
              </div>
            ))}
          </div>
        </main>
      </div>
    </PublicLayout>
  );
} 