import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinancial } from '../../hooks/useFinancial';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
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
import { Label } from '../../components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Save,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

interface CategoryFormData {
  id?: string;
  name: string;
  type: 'income' | 'expense';
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  created_at: string;
}

const FinancialCategories: React.FC = () => {
  const { t } = useTranslation('financial');
  const { currentOrganizationMember } = useAuthContext();
  const { categories, isLoading, invalidateCache } = useFinancial();
  const toast = useToast();

  // Estado para busca
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  // Agrupar por tipo
  const incomeCategories = filteredCategories.filter(cat => cat.type === 'income');
  const expenseCategories = filteredCategories.filter(cat => cat.type === 'expense');

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setCurrentCategory({
        id: category.id,
        name: category.name,
        type: category.type,
      });
    } else {
      setCurrentCategory({
        name: '',
        type: 'expense',
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (category: Category) => {
    setCurrentCategory({
      id: category.id,
      name: category.name,
      type: category.type,
    });
    setIsDeleteModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentCategory((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTypeChange = (value: string) => {
    setCurrentCategory((prev) => ({
      ...prev,
      type: value as 'income' | 'expense',
    }));
  };

  const handleSaveCategory = async () => {
    if (!currentCategory.name.trim()) {
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
        name: currentCategory.name.trim(),
        type: currentCategory.type,
        organization_id: currentOrganizationMember?.organization.id,
      };

      if (currentCategory.id) {
        // Atualizar categoria existente
        const { error } = await supabase
          .from('financial_categories')
          .update(categoryData)
          .eq('id', currentCategory.id);

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
      setIsModalOpen(false);
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

  const handleDeleteCategory = async () => {
    if (!currentCategory.id) return;

    try {
      setIsDeleting(true);
      
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
                {expenseCategories.length}
              </Badge>
            </CardTitle>
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
                  {expenseCategories.map((category) => (
                    <TableRow 
                      key={category.id} 
                      className="border-b dark:border-gray-700/50 hover:bg-muted/50 dark:hover:bg-muted/20"
                    >
                      <TableCell className="font-medium text-foreground dark:text-foreground/90 py-3">
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-red-500 dark:bg-red-400 mr-2"></div>
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex justify-end items-center space-x-2">
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
                  ))}
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
                {incomeCategories.length}
              </Badge>
            </CardTitle>
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
                  {incomeCategories.map((category) => (
                    <TableRow 
                      key={category.id} 
                      className="border-b dark:border-gray-700/50 hover:bg-muted/50 dark:hover:bg-muted/20"
                    >
                      <TableCell className="font-medium text-foreground dark:text-foreground/90 py-3">
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-400 mr-2"></div>
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex justify-end items-center space-x-2">
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
                  ))}
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
        <DialogContent className="bg-background ">
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
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground dark:text-foreground/90">
                {t('name')} *
              </Label>
              <Input
                id="name"
                name="name"
                value={currentCategory.name}
                onChange={handleInputChange}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-foreground/90"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type" className="text-foreground dark:text-foreground/90">
                {t('type')} *
              </Label>
              <Select
                value={currentCategory.type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger
                  id="type"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-foreground/90"
                >
                  <SelectValue placeholder={t('selectType')}>
                    {currentCategory.type === 'expense' ? t('expense') : t('income')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="expense" className="dark:text-foreground/90">
                    {t('expense')}
                  </SelectItem>
                  <SelectItem value="income" className="dark:text-foreground/90">
                    {t('income')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="text-foreground dark:text-foreground/90 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveCategory}
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
          </DialogFooter>
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