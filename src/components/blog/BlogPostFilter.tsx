import React from 'react';
import { useTranslation } from 'react-i18next';

interface BlogCategory {
  id: string;
  slug: string;
  translations: { language: string; name: string }[];
}

interface BlogTag {
  id: string;
  slug: string;
  translations: { language: string; name: string }[];
}

interface FilterOptions {
  search: string;
  status: string;
  category: string;
  tag: string;
  language: string;
}

interface BlogPostFilterProps {
  filter: FilterOptions;
  setFilter: React.Dispatch<React.SetStateAction<FilterOptions>>;
  categories: BlogCategory[];
  tags: BlogTag[];
}

const BlogPostFilter: React.FC<BlogPostFilterProps> = ({
  filter,
  setFilter,
  categories,
  tags,
}) => {
  const { t, i18n } = useTranslation(['common', 'blog']);
  const currentLanguage = i18n.language || 'pt';

  // Função para obter nome traduzido da categoria
  const getCategoryName = (category: BlogCategory) => {
    const translation = category.translations.find(t => t.language === currentLanguage);
    return translation ? translation.name : category.slug;
  };

  // Função para obter nome traduzido da tag
  const getTagName = (tag: BlogTag) => {
    const translation = tag.translations.find(t => t.language === currentLanguage);
    return translation ? translation.name : tag.slug;
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setFilter({
      ...filter,
      status: '',
      category: '',
      tag: '',
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Filtro de Status */}
      <div>
        <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('blog:status.label')}
        </label>
        <select
          id="status-filter"
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">{t('common:all')}</option>
          <option value="draft">{t('blog:status.draft')}</option>
          <option value="published">{t('blog:status.published')}</option>
          <option value="archived">{t('blog:status.archived')}</option>
        </select>
      </div>

      {/* Filtro de Idioma */}
      <div>
        <label htmlFor="language-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('common:language')}
        </label>
        <select
          id="language-filter"
          value={filter.language}
          onChange={(e) => setFilter({ ...filter, language: e.target.value })}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="pt">{t('common:languages.pt')}</option>
          <option value="en">{t('common:languages.en')}</option>
          <option value="es">{t('common:languages.es')}</option>
        </select>
      </div>

      {/* Filtro de Categoria */}
      <div>
        <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('blog:category')}
        </label>
        <select
          id="category-filter"
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">{t('common:all')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {getCategoryName(category)}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro de Tag */}
      <div>
        <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('blog:tag')}
        </label>
        <select
          id="tag-filter"
          value={filter.tag}
          onChange={(e) => setFilter({ ...filter, tag: e.target.value })}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">{t('common:all')}</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.slug}>
              {getTagName(tag)}
            </option>
          ))}
        </select>
      </div>

      {/* Botão para limpar filtros */}
      {(filter.status || filter.category || filter.tag) && (
        <div className="col-span-full mt-2 flex justify-end">
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            {t('common:clearFilters')}
          </button>
        </div>
      )}
    </div>
  );
};

export default BlogPostFilter; 