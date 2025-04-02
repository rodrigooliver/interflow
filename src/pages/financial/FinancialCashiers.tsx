import { useState } from 'react';
import { useFinancial } from '../../hooks/useFinancial';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import { CardTitle, CardHeader, CardContent, Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Switch } from "../../components/ui/switch";
import { Button } from "../../components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";
import { Label } from "../../components/ui/Label";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// Interface para o tipo Cashier
interface Cashier {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CashierFormData {
  name: string;
  description: string | null;
  is_active: boolean;
}

// O componente principal
export function FinancialCashiers() {
  const { t } = useTranslation('financial');
  const { currentOrganizationMember } = useAuthContext();
  const toast = useToast();
  const { cashiers, isLoading, invalidateCache } = useFinancial();

  // Estados
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CashierFormData>({
    name: '',
    description: '',
    is_active: true
  });

  const filteredCashiers = cashiers.filter(cashier =>
    cashier.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSort = () => {
    // Implemente a lógica para ordenar os caixas com base no campo fornecido
  };

  // Função para abrir o modal com os dados do caixa (edição)
  const handleEdit = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setFormData({
      name: cashier.name,
      description: cashier.description || '',
      is_active: cashier.is_active
    });
    setIsEditModalOpen(true);
  };

  // Função para abrir o modal para criar novo caixa
  const handleAddNew = () => {
    setSelectedCashier(null);
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
    setIsCreateModalOpen(true);
  };

  // Função para fechar o modal
  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setSelectedCashier(null);
  };

  // Função para confirmar a exclusão
  const handleConfirmDelete = (id: string) => {
    setSelectedCashier({ id } as Cashier);
    setIsDeleteModalOpen(true);
  };

  // Função para excluir o caixa
  const handleDelete = async () => {
    if (!selectedCashier) return;
    
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('financial_cashiers')
        .delete()
        .eq('id', selectedCashier.id);
      
      if (error) {
        throw error;
      }
      
      invalidateCache();
      
      toast.show({
        title: t('success'),
        description: t('cashierDeleted'),
        variant: 'success'
      });
    } catch (error) {
      console.error('Erro ao excluir caixa:', error);
      toast.show({
        title: t('error'),
        description: t('errorDeletingCashier'),
        variant: 'destructive'
      });
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedCashier(null);
      setIsSubmitting(false);
    }
  };

  // Função para salvar o caixa (criar ou atualizar)
  const handleSave = async () => {
    // Validação básica
    if (!formData.name.trim()) {
      toast.show({
        title: t('validationError'),
        description: t('nameRequired'),
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const cashierData = {
        organization_id: currentOrganizationMember?.organization.id,
        name: formData.name.trim(),
        description: formData.description || null,
        is_active: formData.is_active
      };

      if (selectedCashier) {
        // Atualizar caixa existente
        const { error } = await supabase
          .from('financial_cashiers')
          .update(cashierData)
          .eq('id', selectedCashier.id)
          .eq('organization_id', currentOrganizationMember?.organization.id);

        if (error) {
          throw error;
        }

        invalidateCache();
        toast.show({
          title: t('success'),
          description: t('cashierUpdated'),
          variant: 'success'
        });
        setIsEditModalOpen(false);
      } else {
        // Criar novo caixa
        const { error } = await supabase
          .from('financial_cashiers')
          .insert([cashierData]);

        if (error) {
          throw error;
        }

        invalidateCache();
        toast.show({
          title: t('success'),
          description: t('cashierCreated'),
          variant: 'success'
        });
        setIsCreateModalOpen(false);
      }
    } catch (error) {
      console.error('Erro ao salvar caixa:', error);
      toast.show({
        title: t('error'),
        description: t('errorSavingCashier'),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="border-border/40 dark:border-border/20 bg-card dark:bg-card/95">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-2xl text-foreground dark:text-foreground/90">{t('financialCashiers')}</CardTitle>
            <Button className="flex items-center bg-primary hover:bg-primary/90 dark:bg-primary/90 dark:hover:bg-primary/80" onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              {t('addCashier')}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Barra de pesquisa */}
          <div className="mb-6">
            <div className="flex items-center border rounded-md px-3 py-2 bg-background dark:bg-background/95 dark:border-border/20">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('searchCashiers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent dark:text-foreground/90"
              />
            </div>
          </div>

          {/* Tabela de caixas */}
          <div className="overflow-x-auto rounded-md border dark:border-border/20">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-muted/50 dark:hover:bg-muted/20">
                  <TableHead
                    className="cursor-pointer text-foreground dark:text-foreground/90 font-semibold"
                    onClick={() => handleSort()}
                  >
                    <div className="flex items-center">
                      {t('name')}
                      {/* Add sorting icon */}
                    </div>
                  </TableHead>
                  <TableHead className="text-foreground dark:text-foreground/90 font-semibold">{t('description')}</TableHead>
                  <TableHead
                    className="cursor-pointer text-foreground dark:text-foreground/90 font-semibold"
                    onClick={() => handleSort()}
                  >
                    <div className="flex items-center">
                      {t('status')}
                      {/* Add sorting icon */}
                    </div>
                  </TableHead>
                  <TableHead className="text-foreground dark:text-foreground/90 font-semibold">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="flex justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-white/80" />
                        </div>
                        <div className="text-foreground dark:text-foreground/90 font-medium text-sm">
                          {t('loading')}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCashiers.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground dark:text-muted-foreground/80">
                      {searchQuery ? t('noSearchResults') : t('noCashiers')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCashiers.map((cashier) => (
                    <TableRow key={cashier.id} className="hover:bg-muted/50 dark:hover:bg-muted/20">
                      <TableCell className="font-medium text-foreground dark:text-foreground/90">{cashier.name}</TableCell>
                      <TableCell className="text-foreground/80 dark:text-foreground/70">{cashier.description || '-'}</TableCell>
                      <TableCell>
                        {cashier.is_active ? (
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            <span>{t('active')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600 dark:text-red-400">
                            <XCircle className="mr-2 h-4 w-4" />
                            <span>{t('inactive')}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(cashier)}
                            className="h-8 w-8 p-0 hover:bg-muted dark:hover:bg-muted/20"
                          >
                            <span className="sr-only">{t('edit')}</span>
                            <Edit className="h-4 w-4 text-muted-foreground dark:text-muted-foreground/80" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConfirmDelete(cashier.id)}
                            className="h-8 w-8 p-0 hover:bg-muted dark:hover:bg-muted/20"
                          >
                            <span className="sr-only">{t('delete')}</span>
                            <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal para criar/editar caixa */}
      <Dialog open={isCreateModalOpen || isEditModalOpen}>
        <DialogContent className="max-w-lg bg-background dark:bg-gray-800 dark:border-border/20">
          <button 
            onClick={handleCloseModal} 
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground/90">
              {selectedCashier ? t('editCashier') : t('addCashier')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="name" className="text-foreground dark:text-foreground/90">{t('name')} *</Label>
              <Input
                id="name"
                placeholder={t('enterCashierName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-background dark:bg-gray-900 dark:border-border/20 dark:text-foreground/90"
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="description" className="text-foreground dark:text-foreground/90">{t('description')}</Label>
              <Textarea
                id="description"
                placeholder={t('enterDescription')}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="bg-background dark:bg-gray-900 dark:border-border/20 dark:text-foreground/90"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={formData.is_active}
                onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_active: checked })}
                className="dark:bg-gray-900"
              />
              <Label htmlFor="is-active" className="text-foreground dark:text-foreground/90">{t('active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              className="border-border/40 dark:border-border/20 hover:bg-muted dark:hover:bg-muted/20 text-foreground dark:text-foreground/90"
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 dark:bg-primary/90 dark:hover:bg-primary/80"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white/80" />
                  <span>{t('saving')}</span>
                </div>
              ) : (
                <span>{t('save')}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-background dark:bg-gray-800 dark:border-border/20">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground/90">{t('confirmDeleteTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-foreground dark:text-foreground/90">
            <p>{t('confirmDeleteCashier')}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isSubmitting}
              className="border-border/40 dark:border-border/20 hover:bg-muted dark:hover:bg-muted/20 text-foreground dark:text-foreground/90"
            >
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white/80" />
                  <span>{t('deleting')}</span>
                </div>
              ) : (
                <span>{t('delete')}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FinancialCashiers; 