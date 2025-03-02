import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag } from 'lucide-react';

interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

interface CustomerTagsProps {
  tags?: CustomerTag[];
}

export function CustomerTags({ tags }: CustomerTagsProps) {
  const { t } = useTranslation(['customers', 'common']);
  
  if (!tags || tags.length === 0) {
    return <span className="text-gray-400 dark:text-gray-500 text-xs md:text-sm italic">{t('customers:noTags')}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => {
        // Verificar se a tag é válida
        if (!tag || typeof tag !== 'object' || !('id' in tag)) {
          return null;
        }
        
        return (
          <span
            key={tag.id}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium truncate max-w-[100px] md:max-w-[150px]"
            style={{ 
              backgroundColor: `${tag.color}30`,
              color: tag.color,
              border: `1px solid ${tag.color}`
            }}
          >
            <Tag className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1 flex-shrink-0" />
            <span className="truncate">{tag.name}</span>
          </span>
        );
      })}
    </div>
  );
}

export default CustomerTags; 