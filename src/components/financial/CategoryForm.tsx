import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { useFinancial } from '../../hooks/useFinancial';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Loader2, Save } from 'lucide-react';
import SearchableSelectField from './SearchableSelectField';

interface CategoryFormProps {
  categoryId?: string;
  initialData?: CategoryFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export interface CategoryFormData {
  id?: string;
  name: string;
  type: 'income' | 'expense';
  parent_id?: string | null;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parent_id: string | null;
}

interface CategoryWithLevel extends Category {
  level: number;
  path?: string;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ 
  categoryId, 
  initialData, 
  onSuccess, 
  onCancel 
}) => {
  const { t } = useTranslation('financial');
  const { currentOrganizationMember } = useAuthContext();
  const { invalidateCache, categories } = useFinancial();
  const toast = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    type: 'expense',
    parent_id: null,
    ...initialData,
  });

  // Atualiza o formulário se as props mudarem
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Função para construir a hierarquia de categorias com níveis
  const buildCategoryHierarchy = (cats: Category[], parentId: string | null = null, level = 0, parentPath = ''): CategoryWithLevel[] => {
    return cats
      .filter(cat => cat.parent_id === parentId)
      .reduce((acc: CategoryWithLevel[], category) => {
        // Adicionar a categoria atual com seu nível e caminho
        const path = parentPath ? `${parentPath} > ${category.name}` : category.name;
        const categoryWithLevel: CategoryWithLevel = { ...category, level, path };
        
        // Não incluir a própria categoria em edição na lista de possíveis pais
        if (formData.id && categoryWithLevel.id === formData.id) {
          return acc;
        }
        
        // Obter subcategorias recursivamente
        const children = buildCategoryHierarchy(cats, category.id, level + 1, path);
        
        return [...acc, categoryWithLevel, ...children];
      }, []);
  };

  // Filtra as categorias do mesmo tipo e constrói a hierarquia com níveis
  const availableParentCategories = useMemo(() => {
    return buildCategoryHierarchy(
      categories.filter(cat => cat.type === formData.type) as Category[]
    );
  }, [categories, formData.type]);

  // Encontrar o caminho da categoria pai selecionada
  const selectedParentPath = useMemo(() => {
    if (!formData.parent_id) return '';
    const parentCategory = availableParentCategories.find(cat => cat.id === formData.parent_id);
    return parentCategory?.path || '';
  }, [availableParentCategories, formData.parent_id]);

  // Opções para o select de tipo
  const typeOptions = [
    { value: 'expense', label: t('expense') },
    { value: 'income', label: t('income') }
  ];

  // Opções para o select de categoria pai com indentação para mostrar a hierarquia
  const parentOptions = [
    { value: 'none', label: `${t('noParent')} (${t('isMainCategory')})` },
    ...availableParentCategories.map(cat => ({
      value: cat.id,
      label: cat.level > 0 ? 
        `${'&nbsp;&nbsp;'.repeat(cat.level)} ${cat.level > 0 ? '&#8212;' : ''} ${cat.name}` : 
        cat.name,
      isHtml: cat.level > 0,
      description: cat.path
    }))
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTypeChange = (value: string | null) => {
    if (!value) return;
    
    setFormData((prev) => ({
      ...prev,
      type: value as 'income' | 'expense',
      parent_id: null, // Reseta o parent_id quando muda o tipo
    }));
  };

  const handleParentChange = (value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      parent_id: !value || value === "none" ? null : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.show({
        title: t('validationError'),
        description: t('categoryNameRequired'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      
      const categoryData = {
        name: formData.name.trim(),
        type: formData.type,
        parent_id: formData.parent_id,
        organization_id: currentOrganizationMember?.organization.id,
      };

      if (categoryId || formData.id) {
        // Atualizar categoria existente
        const { error } = await supabase
          .from('financial_categories')
          .update(categoryData)
          .eq('id', categoryId || formData.id);

        if (error) throw error;
        
        toast.show({
          title: t('success'),
          description: t('categoryUpdated'),
        });
      } else {
        // Criar nova categoria
        const { error } = await supabase
          .from('financial_categories')
          .insert(categoryData);

        if (error) throw error;
        
        toast.show({
          title: t('success'),
          description: t('categoryCreated'),
        });
      }

      // Invalidar cache para recarregar categorias
      invalidateCache();
      
      // Callback de sucesso
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast.show({
        title: t('error'),
        description: t('errorSavingCategory'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-foreground dark:text-foreground/90">
          {t('name')} *
        </Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className="dark:bg-gray-700 dark:border-gray-600 dark:text-foreground/90"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="type" className="text-foreground dark:text-foreground/90">
          {t('type')} *
        </Label>
        <SearchableSelectField
          id="type"
          options={typeOptions}
          value={formData.type}
          onChange={handleTypeChange}
          placeholder={t('selectType')}
          className="dark:bg-gray-700 dark:border-gray-600 dark:text-foreground/90"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="parent_id" className="text-foreground dark:text-foreground/90">
          {t('parentCategory')}
        </Label>
        <SearchableSelectField
          id="parent_id"
          options={parentOptions}
          value={formData.parent_id || "none"}
          onChange={handleParentChange}
          placeholder={t('selectParentCategory')}
          className="dark:bg-gray-700 dark:border-gray-600 dark:text-foreground/90"
        />
        {selectedParentPath && (
          <p className="text-xs text-muted-foreground mt-1 truncate dark:text-gray-400">
            {selectedParentPath}
          </p>
        )}
      </div>
      
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="text-foreground dark:text-foreground/90 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            {t('cancel')}
          </Button>
        )}
        
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90"
        >
          {isSaving ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-white/80" />
              <span>{t('saving')}</span>
            </div>
          ) : (
            <div className="flex items-center">
              <Save className="h-4 w-4 mr-2" />
              <span>{t('save')}</span>
            </div>
          )}
        </Button>
      </div>
    </form>
  );
};

export default CategoryForm; 