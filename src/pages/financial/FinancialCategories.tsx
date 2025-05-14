import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinancial } from '../../hooks/useFinancial';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import CategoryForm, { CategoryFormData } from '../../components/financial/CategoryForm';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '../../components/ui/Table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { Badge } from '../../components/ui/Badge';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronRight,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parent_id: string | null;
  created_at: string;
}

interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
}

const FinancialCategories: React.FC = () => {
  const { t } = useTranslation('financial');
  const { categories, isLoading, invalidateCache } = useFinancial();
  const toast = useToast();

  // Estado para busca
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryFormData>({
    name: '',
    type: 'expense',
  });
  
  // Filtrar categorias pela busca
  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para construir a hierarquia de categorias
  const buildCategoryHierarchy = (
    cats: Category[],
    parentId: string | null = null
  ): CategoryWithChildren[] => {
    return cats
      .filter((cat) => cat.parent_id === parentId)
      .map((cat) => ({
        ...cat,
        children: buildCategoryHierarchy(cats, cat.id),
      }));
  };

  // Agrupar por tipo e construir hierarquia
  const incomeCategories = buildCategoryHierarchy(
    filteredCategories.filter((cat) => cat.type === 'income')
  );
  const expenseCategories = buildCategoryHierarchy(
    filteredCategories.filter((cat) => cat.type === 'expense')
  );

  // Renderizar categoria com seu recuo e filhos
  const renderCategory = (category: CategoryWithChildren, indentLevel = 0) => {
    return (
      <React.Fragment key={category.id}>
        <TableRow className="border-b dark:border-gray-700/50 hover:bg-muted/50 dark:hover:bg-muted/20">
          <TableCell className="font-medium text-foreground dark:text-foreground/90 py-3">
            <div
              className="flex items-center"
              style={{ paddingLeft: `${indentLevel * 20}px` }}
            >
              {indentLevel > 0 && (
                <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground" />
              )}
              <div
                className={`h-2 w-2 rounded-full mr-2 ${
                  category.type === 'expense'
                    ? 'bg-red-500 dark:bg-red-400'
                    : 'bg-green-500 dark:bg-green-400'
                }`}
              ></div>
              {category.name}
            </div>
          </TableCell>
          <TableCell className="text-right py-3">
            <div className="flex justify-end items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenAddSubcategory(category)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground dark:text-muted-foreground/80 dark:hover:text-foreground/90 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full"
                title={t('addSubcategory')}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenModal(category)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground dark:text-muted-foreground/80 dark:hover:text-foreground/90 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full"
                title={t('edit')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenDeleteModal(category)}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                title={t('delete')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {category.children.map((child) => renderCategory(child, indentLevel + 1))}
      </React.Fragment>
    );
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setCurrentCategory({
        id: category.id,
        name: category.name,
        type: category.type,
        parent_id: category.parent_id,
      });
    } else {
      setCurrentCategory({
        name: '',
        type: 'expense',
        parent_id: null,
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenAddSubcategory = (parentCategory: Category) => {
    setCurrentCategory({
      name: '',
      type: parentCategory.type,
      parent_id: parentCategory.id,
    });
    setIsModalOpen(true);
  };

  const handleAddCategoryByType = (type: 'income' | 'expense') => {
    setCurrentCategory({
      name: '',
      type: type,
      parent_id: null,
    });
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (category: Category) => {
    setCurrentCategory({
      id: category.id,
      name: category.name,
      type: category.type,
      parent_id: category.parent_id,
    });
    setIsDeleteModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
  };

  const handleDeleteCategory = async () => {
    if (!currentCategory.id) return;

    try {
      setIsDeleting(true);
      
      // Verificar se a categoria tem filhos
      const { data: childCategories, error: checkError } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('parent_id', currentCategory.id);
        
      if (checkError) throw checkError;
      
      if (childCategories && childCategories.length > 0) {
        toast.show({
          title: t('error'),
          description: t('cannotDeleteCategoryWithChildren'),
          variant: 'destructive',
        });
        setIsDeleting(false);
        return;
      }
      
      const { error } = await supabase
        .from('financial_categories')
        .delete()
        .eq('id', currentCategory.id);

      if (error) throw error;
      
      toast.show({
        title: t('success'),
        description: t('categoryDeleted'),
      });

      // Invalidar cache para recarregar categorias
      invalidateCache();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast.show({
        title: t('error'),
        description: t('errorDeletingCategory'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Contar o total de categorias, incluindo subcategorias
  const countCategories = (cats: CategoryWithChildren[]): number => {
    return cats.reduce((count, cat) => {
      return count + 1 + countCategories(cat.children);
    }, 0);
  };

  const totalIncomeCategories = countCategories(incomeCategories);
  const totalExpenseCategories = countCategories(expenseCategories);

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground dark:text-foreground/90 mb-4 md:mb-0">
          {t('financialCategories')}
        </h1>
        <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground dark:text-muted-foreground/80" />
            <Input
              placeholder={t('searchCategories')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background dark:bg-background/90 dark:border-gray-700 dark:text-foreground/90"
            />
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="flex items-center bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('newCategory')}
          </Button>
        </div>
      </div>

      <Card className="bg-card dark:bg-background/90 dark:border-gray-700 shadow-sm">
        <CardHeader className="border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center text-foreground dark:text-foreground/90">
              <ArrowDownCircle className="h-5 w-5 mr-2 text-red-500 dark:text-red-400" />
              {t('expenseCategories')}
              <Badge className="ml-3 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">
                {totalExpenseCategories}
              </Badge>
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAddCategoryByType('expense')}
              className="flex items-center h-8 text-sm text-muted-foreground hover:text-foreground dark:text-muted-foreground/80 dark:hover:text-foreground/90 hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('addCategory')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-white/80" />
              <p className="mt-2 text-foreground dark:text-foreground/90 font-medium text-sm">
                {t('loading')}
              </p>
            </div>
          ) : expenseCategories.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableBody>
                  {expenseCategories.map((category) => renderCategory(category))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground dark:text-foreground/70">
              {searchTerm
                ? t('noSearchResults')
                : t('noExpenseCategories')}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card dark:bg-background/90 dark:border-gray-700 shadow-sm mt-6">
        <CardHeader className="border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center text-foreground dark:text-foreground/90">
              <ArrowUpCircle className="h-5 w-5 mr-2 text-green-500 dark:text-green-400" />
              {t('incomeCategories')}
              <Badge className="ml-3 bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">
                {totalIncomeCategories}
              </Badge>
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAddCategoryByType('income')}
              className="flex items-center h-8 text-sm text-muted-foreground hover:text-foreground dark:text-muted-foreground/80 dark:hover:text-foreground/90 hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('addCategory')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-white/80" />
              <p className="mt-2 text-foreground dark:text-foreground/90 font-medium text-sm">
                {t('loading')}
              </p>
            </div>
          ) : incomeCategories.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableBody>
                  {incomeCategories.map((category) => renderCategory(category))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground dark:text-foreground/70">
              {searchTerm
                ? t('noSearchResults')
                : t('noIncomeCategories')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de criar/editar categoria */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground/90">
              {currentCategory.id ? t('editCategory') : t('newCategory')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-foreground/70">
              {currentCategory.id
                ? t('editCategoryDescription')
                : t('newCategoryDescription')}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            initialData={currentCategory}
            onSuccess={handleModalSuccess}
            onCancel={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-background dark:bg-background/90 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground/90">
              {t('deleteCategory')}
            </DialogTitle>
            <DialogDescription className="text-foreground dark:text-foreground/90">
              {t('deleteCategoryConfirmation', { name: currentCategory.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-foreground dark:text-foreground/90 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleDeleteCategory}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600"
            >
              {isDeleting ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-white/80" />
                  <span>{t('deleting')}</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>{t('delete')}</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialCategories; 