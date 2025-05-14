import { useState, useEffect } from 'react';
import { useFinancial } from '../../hooks/useFinancial';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { CardTitle, CardHeader, CardContent, Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Switch } from "../../components/ui/switch";
import { Button } from "../../components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";
import { Label } from "../../components/ui/Label";
import { useAgents } from '../../hooks/useQueryes';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Users,
  Receipt,
} from 'lucide-react';

// Interface para o tipo Cashier
interface Cashier {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  balance?: number;
  created_at: string;
  updated_at: string;
}

interface CashierOperator {
  id: string;
  cashier_id: string;
  profile_id: string;
  is_active: boolean;
  is_admin?: boolean;
  can_view?: boolean;
  can_create?: boolean;
  can_edit_any?: boolean;
  can_edit_own?: boolean;
  can_delete_any?: boolean;
  can_delete_own?: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface CashierFormData {
  name: string;
  description: string | null;
  is_active: boolean;
}

interface OrganizationProfileUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

// O componente principal
export function FinancialCashiers() {
  const { t } = useTranslation('financial');
  const { currentOrganizationMember } = useAuthContext();
  const toast = useToast();
  const navigate = useNavigate();
  const { 
    cashiers, 
    isLoading, 
    invalidateCache, 
    cashierOperators, 
    removeCashierOperator
  } = useFinancial();
  
  // Usar o hook useAgents diretamente para obter os usuários da organização
  const { data: agentsData = [] } = useAgents(
    currentOrganizationMember?.organization?.id
  );

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
  
  // Estados para operadores
  const [isOperatorsModalOpen, setIsOperatorsModalOpen] = useState(false);
  const [operators, setOperators] = useState<CashierOperator[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<OrganizationProfileUser[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [addingOperator, setAddingOperator] = useState(false);
  // Adicionando estado para as permissões do operador
  const [operatorPermissions, setOperatorPermissions] = useState({
    isAdmin: false,
    canView: true,
    canCreate: false,
    canEditAny: false,
    canEditOwn: false,
    canDeleteAny: false,
    canDeleteOwn: false
  });

  // Adicionar novos estados para o modal de edição de permissões
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<CashierOperator | null>(null);
  const [updatingPermissions, setUpdatingPermissions] = useState(false);
  
  // Mapear os agentes para o formato de perfis da organização
  useEffect(() => {
    if (agentsData.length > 0) {
      const profilesFromAgents = agentsData.map(agent => ({
        id: agent.id,
        email: agent.profile?.email || '',
        full_name: agent.profile?.full_name || '',
        avatar_url: agent.profile?.avatar_url || null,
        role: agent.role
      }));
      
      // Se já temos operadores, filtra os perfis já adicionados
      if (operators.length > 0) {
        loadAvailableProfiles(operators, profilesFromAgents);
      } else {
        setAvailableProfiles(profilesFromAgents);
      }
    }
  }, [agentsData, operators]);

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
    setIsCreateModalOpen(false);
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
        const { data: newCashier, error } = await supabase
          .from('financial_cashiers')
          .insert([cashierData])
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        // Adicionar o usuário atual como operador administrador do caixa
        if (newCashier?.id && currentOrganizationMember?.profile_id) {
          const operatorData = {
            cashier_id: newCashier.id,
            profile_id: currentOrganizationMember.profile_id,
            is_active: true,
            can_view: true,
            can_create: true,
            can_edit_any: true,
            can_edit_own: true,
            can_delete_any: true,
            can_delete_own: true,
            is_admin: true
          };
          
          const { error: operatorError } = await supabase
            .from('financial_cashier_operators')
            .insert([operatorData]);
            
          if (operatorError) {
            console.error('Erro ao adicionar operador automático:', operatorError);
            // Continuar mesmo se houver erro ao adicionar o operador
          }
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

  // Função para abrir o modal de operadores
  const handleManageOperators = async (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setIsOperatorsModalOpen(true);
    await loadCashierOperators(cashier.id);
  };

  // Função para carregar operadores de um caixa
  const loadCashierOperators = async (cashierId: string) => {
    setLoadingOperators(true);
    try {
      const data = await cashierOperators(cashierId);
      setOperators(data);
      
      // Perfis disponíveis serão atualizados pelo useEffect quando operators mudar
    } catch (error) {
      console.error('Erro ao carregar operadores:', error);
      toast.show({
        title: t('error'),
        description: t('errorLoadingOperators'),
        variant: 'destructive'
      });
    } finally {
      setLoadingOperators(false);
    }
  };

  // Função para filtrar perfis disponíveis baseado nos operadores atuais
  const loadAvailableProfiles = (currentOperators: CashierOperator[] = [], allProfiles = agentsData.map(agent => ({
    id: agent.id,
    email: agent.profile?.email || '',
    full_name: agent.profile?.full_name || '',
    avatar_url: agent.profile?.avatar_url || null,
    role: agent.role
  }))) => {
    // Obter IDs dos perfis que já são operadores
    const currentOperatorProfileIds = currentOperators.map(op => op.profile_id);
    
    // Filtrar apenas os perfis que não são operadores
    const filteredProfiles = allProfiles.filter(profile => 
      !currentOperatorProfileIds.includes(profile.id)
    );
    
    setAvailableProfiles(filteredProfiles);
  };

  // Função para adicionar um operador
  const handleAddOperator = async () => {
    if (!selectedCashier || !selectedProfileId) return;
    
    setAddingOperator(true);
    try {
      // Criar objeto de dados do operador com base nas permissões selecionadas
      const operatorData = {
        cashier_id: selectedCashier.id,
        profile_id: selectedProfileId,
        is_active: true,
        is_admin: operatorPermissions.isAdmin,
        can_view: operatorPermissions.isAdmin ? true : operatorPermissions.canView,
        can_create: operatorPermissions.isAdmin ? true : operatorPermissions.canCreate,
        can_edit_any: operatorPermissions.isAdmin ? true : operatorPermissions.canEditAny,
        can_edit_own: operatorPermissions.isAdmin ? true : operatorPermissions.canEditOwn,
        can_delete_any: operatorPermissions.isAdmin ? true : operatorPermissions.canDeleteAny,
        can_delete_own: operatorPermissions.isAdmin ? true : operatorPermissions.canDeleteOwn
      };
      
      const { error } = await supabase
        .from('financial_cashier_operators')
        .insert([operatorData]);
        
      if (error) {
        throw error;
      }
      
      // Atualizar a lista de operadores
      const updatedOperators = await cashierOperators(selectedCashier.id);
      setOperators(updatedOperators);
      
      // Atualizar a lista de perfis disponíveis com base nos operadores atualizados
      loadAvailableProfiles(updatedOperators);
      
      setSelectedProfileId('');
      // Resetar as permissões para o valor padrão
      setOperatorPermissions({
        isAdmin: false,
        canView: true,
        canCreate: false,
        canEditAny: false,
        canEditOwn: false,
        canDeleteAny: false,
        canDeleteOwn: false
      });
      
      toast.show({
        title: t('success'),
        description: t('operatorAdded'),
        variant: 'success'
      });
    } catch (error) {
      console.error('Erro ao adicionar operador:', error);
      toast.show({
        title: t('error'),
        description: t('errorAddingOperator'),
        variant: 'destructive'
      });
    } finally {
      setAddingOperator(false);
    }
  };

  // Função para remover um operador
  const handleRemoveOperator = async (operatorId: string) => {
    if (!selectedCashier) return;
    
    try {
      const result = await removeCashierOperator(operatorId);
      
      if (!result.success) {
        throw result.error;
      }
      
      // Atualizar a lista de operadores
      const updatedOperators = await cashierOperators(selectedCashier.id);
      setOperators(updatedOperators);
      
      // Atualizar a lista de perfis disponíveis com base nos operadores atualizados
      loadAvailableProfiles(updatedOperators);
      
      toast.show({
        title: t('success'),
        description: t('operatorRemoved'),
        variant: 'success'
      });
    } catch (error) {
      console.error('Erro ao remover operador:', error);
      toast.show({
        title: t('error'),
        description: t('errorRemovingOperator'),
        variant: 'destructive'
      });
    }
  };

  // Função para navegar para as transações do caixa
  const handleViewTransactions = (cashierId: string) => {
    navigate(`/app/financial/transactions?cashier=${cashierId}`);
  };

  // Função para abrir o modal de edição de permissões
  const handleEditPermissions = async (operator: CashierOperator) => {
    setSelectedOperator(operator);
    
    // Carregar as permissões atuais do operador
    setOperatorPermissions({
      isAdmin: operator.is_admin || false,
      canView: operator.can_view || true,
      canCreate: operator.can_create || false,
      canEditAny: operator.can_edit_any || false,
      canEditOwn: operator.can_edit_own || false,
      canDeleteAny: operator.can_delete_any || false,
      canDeleteOwn: operator.can_delete_own || false
    });
    
    setIsPermissionsModalOpen(true);
  };

  // Função para salvar as permissões atualizadas
  const handleSavePermissions = async () => {
    if (!selectedOperator) return;
    
    setUpdatingPermissions(true);
    try {
      // Atualizar as permissões no banco de dados
      const updateData = {
        is_admin: operatorPermissions.isAdmin,
        can_view: operatorPermissions.isAdmin ? true : operatorPermissions.canView,
        can_create: operatorPermissions.isAdmin ? true : operatorPermissions.canCreate,
        can_edit_any: operatorPermissions.isAdmin ? true : operatorPermissions.canEditAny,
        can_edit_own: operatorPermissions.isAdmin ? true : operatorPermissions.canEditOwn,
        can_delete_any: operatorPermissions.isAdmin ? true : operatorPermissions.canDeleteAny,
        can_delete_own: operatorPermissions.isAdmin ? true : operatorPermissions.canDeleteOwn
      };
      
      const { error } = await supabase
        .from('financial_cashier_operators')
        .update(updateData)
        .eq('id', selectedOperator.id);
        
      if (error) {
        throw error;
      }
      
      // Recarregar os operadores após a atualização
      if (selectedCashier) {
        await loadCashierOperators(selectedCashier.id);
      }
      
      setIsPermissionsModalOpen(false);
      setSelectedOperator(null);
      
      toast.show({
        title: t('success'),
        description: t('permissionsUpdated'),
        variant: 'success'
      });
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      toast.show({
        title: t('error'),
        description: t('errorUpdatingPermissions'),
        variant: 'destructive'
      });
    } finally {
      setUpdatingPermissions(false);
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
                  <TableHead className="text-foreground dark:text-foreground/90 font-semibold">{t('balance')}</TableHead>
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
                    <TableCell colSpan={5} className="text-center py-12">
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
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground dark:text-muted-foreground/80">
                      {searchQuery ? t('noSearchResults') : t('noCashiers')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCashiers.map((cashier) => (
                    <TableRow key={cashier.id} className="hover:bg-muted/50 dark:hover:bg-muted/20">
                      <TableCell className="font-medium text-foreground dark:text-foreground/90">{cashier.name}</TableCell>
                      <TableCell className="text-foreground/80 dark:text-foreground/70">{cashier.description || '-'}</TableCell>
                      <TableCell className="text-foreground/80 dark:text-foreground/70">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(cashier.balance || 0)}
                      </TableCell>
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
                            onClick={() => handleViewTransactions(cashier.id)}
                            className="h-8 w-8 p-0 hover:bg-muted dark:hover:bg-muted/20"
                            title={t('viewTransactions')}
                          >
                            <span className="sr-only">{t('viewTransactions')}</span>
                            <Receipt className="h-4 w-4 text-primary dark:text-primary/80" />
                          </Button>
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
                            onClick={() => handleManageOperators(cashier)}
                            className="h-8 w-8 p-0 hover:bg-muted dark:hover:bg-muted/20"
                            title={t('manageOperators')}
                          >
                            <span className="sr-only">{t('manageOperators')}</span>
                            <Users className="h-4 w-4 text-blue-500 dark:text-blue-400" />
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
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) handleCloseModal();
      }}>
        <DialogContent className="max-w-lg bg-background dark:bg-gray-800 dark:border-border/20 p-6">
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
            <DialogDescription>
              {selectedCashier ? t('editCashierDescription') : t('addCashierDescription')}
            </DialogDescription>
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
            <DialogDescription>
              {t('confirmDeleteCashier')}
            </DialogDescription>
          </DialogHeader>
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

      {/* Modal de operadores */}
      <Dialog open={isOperatorsModalOpen} onOpenChange={setIsOperatorsModalOpen}>
        <DialogContent className="max-w-3xl bg-background dark:bg-gray-800/95 dark:border-border/30 dark:text-foreground/90">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground/90">
              {selectedCashier && `${t('cashierOperators')}: ${selectedCashier.name}`}
            </DialogTitle>
            <DialogDescription>
              {t('manageOperatorsDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-6 flex flex-col md:flex-row gap-2 justify-between items-start md:items-end">
              <div className="w-full md:w-2/3 grid gap-1.5">
                <Label htmlFor="profile-select" className="text-foreground dark:text-foreground/90">{t('selectOperator')}</Label>
                <div className="flex gap-2">
                  <select
                    id="profile-select"
                    className="w-full p-2 rounded-md border border-border/40 dark:border-border/30 bg-background dark:bg-gray-900 text-foreground dark:text-foreground/90"
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    disabled={addingOperator}
                  >
                    <option value="">{t('selectAnOperator')}</option>
                    {availableProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name} ({profile.email})
                      </option>
                    ))}
                  </select>
                </div>
                {availableProfiles.length === 0 && (
                  <div className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    {t('noAvailableProfiles')}
                  </div>
                )}
              </div>
            </div>

            {selectedProfileId && (
              <div className="mb-6 border p-4 rounded-md dark:border-border/30 bg-card/40 dark:bg-gray-700/30">
                <h3 className="font-medium mb-3 text-foreground dark:text-foreground/90">{t('operatorPermissions')}</h3>
                
                <div className="flex items-center space-x-2 mb-4">
                  <Switch
                    id="is-admin"
                    checked={operatorPermissions.isAdmin}
                    onCheckedChange={(checked) => setOperatorPermissions({
                      ...operatorPermissions,
                      isAdmin: checked
                    })}
                    className="dark:bg-gray-800"
                  />
                  <Label htmlFor="is-admin" className="text-foreground dark:text-foreground/90 font-medium">
                    {t('isAdministrator')}
                  </Label>
                </div>
                
                {!operatorPermissions.isAdmin && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="can-view"
                        checked={operatorPermissions.canView}
                        onCheckedChange={(checked) => setOperatorPermissions({
                          ...operatorPermissions,
                          canView: checked
                        })}
                        className="dark:bg-gray-800"
                      />
                      <Label htmlFor="can-view" className="text-foreground dark:text-foreground/90">
                        {t('canView')}
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="can-create"
                        checked={operatorPermissions.canCreate}
                        onCheckedChange={(checked) => setOperatorPermissions({
                          ...operatorPermissions,
                          canCreate: checked
                        })}
                        className="dark:bg-gray-800"
                      />
                      <Label htmlFor="can-create" className="text-foreground dark:text-foreground/90">
                        {t('canCreate')}
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="can-edit-any"
                        checked={operatorPermissions.canEditAny}
                        onCheckedChange={(checked) => setOperatorPermissions({
                          ...operatorPermissions,
                          canEditAny: checked
                        })}
                        className="dark:bg-gray-800"
                      />
                      <Label htmlFor="can-edit-any" className="text-foreground dark:text-foreground/90">
                        {t('canEditAny')}
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="can-edit-own"
                        checked={operatorPermissions.canEditOwn}
                        onCheckedChange={(checked) => setOperatorPermissions({
                          ...operatorPermissions,
                          canEditOwn: checked
                        })}
                        className="dark:bg-gray-800"
                      />
                      <Label htmlFor="can-edit-own" className="text-foreground dark:text-foreground/90">
                        {t('canEditOwn')}
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="can-delete-any"
                        checked={operatorPermissions.canDeleteAny}
                        onCheckedChange={(checked) => setOperatorPermissions({
                          ...operatorPermissions,
                          canDeleteAny: checked
                        })}
                        className="dark:bg-gray-800"
                      />
                      <Label htmlFor="can-delete-any" className="text-foreground dark:text-foreground/90">
                        {t('canDeleteAny')}
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="can-delete-own"
                        checked={operatorPermissions.canDeleteOwn}
                        onCheckedChange={(checked) => setOperatorPermissions({
                          ...operatorPermissions,
                          canDeleteOwn: checked
                        })}
                        className="dark:bg-gray-800"
                      />
                      <Label htmlFor="can-delete-own" className="text-foreground dark:text-foreground/90">
                        {t('canDeleteOwn')}
                      </Label>
                    </div>
                  </div>
                )}
                
                <div className="mt-4">
                  <Button
                    onClick={handleAddOperator}
                    disabled={!selectedProfileId || addingOperator}
                    className="bg-primary hover:bg-primary/90 dark:bg-primary/90 dark:hover:bg-primary/80"
                  >
                    {addingOperator ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-white/80" />
                        <span>{t('adding')}</span>
                      </div>
                    ) : (
                      <span>{t('add')}</span>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-md border dark:border-border/30">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-muted/50 dark:hover:bg-muted/20">
                    <TableHead className="text-foreground dark:text-foreground/90 font-semibold">
                      {t('name')}
                    </TableHead>
                    <TableHead className="text-foreground dark:text-foreground/90 font-semibold">
                      {t('email')}
                    </TableHead>
                    <TableHead className="text-foreground dark:text-foreground/90 font-semibold">
                      {t('status')}
                    </TableHead>
                    <TableHead className="text-foreground dark:text-foreground/90 font-semibold">
                      {t('actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingOperators ? (
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
                  ) : operators.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground dark:text-muted-foreground/80">
                        {t('noOperators')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    operators.map((operator) => (
                      <TableRow key={operator.id} className="hover:bg-muted/50 dark:hover:bg-muted/20">
                        <TableCell className="font-medium text-foreground dark:text-foreground/90">
                          {operator.profile?.full_name || t('unknownUser')}
                        </TableCell>
                        <TableCell className="text-foreground/80 dark:text-foreground/70">
                          {operator.profile?.email || '-'}
                        </TableCell>
                        <TableCell>
                          {operator.is_active ? (
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
                              onClick={() => handleEditPermissions(operator)}
                              className="h-8 w-8 p-0 hover:bg-muted dark:hover:bg-muted/20"
                              title={t('editPermissions')}
                            >
                              <span className="sr-only">{t('editPermissions')}</span>
                              <Edit className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOperator(operator.id)}
                              className="h-8 w-8 p-0 hover:bg-muted dark:hover:bg-muted/20"
                              title={t('remove')}
                            >
                              <span className="sr-only">{t('remove')}</span>
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
          </div>
          
          <DialogFooter>
            <Button
              onClick={() => setIsOperatorsModalOpen(false)}
              className="border-border/40 dark:border-border/30 hover:bg-muted dark:hover:bg-muted/20 text-foreground dark:text-foreground/90"
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de edição de permissões */}
      <Dialog open={isPermissionsModalOpen} onOpenChange={setIsPermissionsModalOpen}>
        <DialogContent className="max-w-md bg-background dark:bg-gray-800/95 dark:border-border/30 dark:text-foreground/90">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground/90">
              {t('editOperatorPermissions')}
            </DialogTitle>
            <DialogDescription>
              {t('editOperatorPermissionsDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedOperator && (
              <>
                <div className="mb-4">
                  <div className="text-sm font-medium text-muted-foreground dark:text-muted-foreground/80 mb-1">
                    {t('operator')}:
                  </div>
                  <div className="font-semibold text-foreground dark:text-foreground/90">
                    {selectedOperator.profile?.full_name || t('unknownUser')}
                  </div>
                  <div className="text-sm text-muted-foreground dark:text-muted-foreground/80">
                    {selectedOperator.profile?.email || '-'}
                  </div>
                </div>

                <div className="border p-4 rounded-md dark:border-border/30 bg-card/40 dark:bg-gray-700/30">
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="edit-is-admin"
                      checked={operatorPermissions.isAdmin}
                      onCheckedChange={(checked) => setOperatorPermissions({
                        ...operatorPermissions,
                        isAdmin: checked
                      })}
                      className="dark:bg-gray-800"
                    />
                    <Label htmlFor="edit-is-admin" className="text-foreground dark:text-foreground/90 font-medium">
                      {t('isAdministrator')}
                    </Label>
                  </div>
                  
                  {!operatorPermissions.isAdmin && (
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="edit-can-view"
                          checked={operatorPermissions.canView}
                          onCheckedChange={(checked) => setOperatorPermissions({
                            ...operatorPermissions,
                            canView: checked
                          })}
                          className="dark:bg-gray-800"
                        />
                        <Label htmlFor="edit-can-view" className="text-foreground dark:text-foreground/90">
                          {t('canView')}
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="edit-can-create"
                          checked={operatorPermissions.canCreate}
                          onCheckedChange={(checked) => setOperatorPermissions({
                            ...operatorPermissions,
                            canCreate: checked
                          })}
                          className="dark:bg-gray-800"
                        />
                        <Label htmlFor="edit-can-create" className="text-foreground dark:text-foreground/90">
                          {t('canCreate')}
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="edit-can-edit-any"
                          checked={operatorPermissions.canEditAny}
                          onCheckedChange={(checked) => setOperatorPermissions({
                            ...operatorPermissions,
                            canEditAny: checked
                          })}
                          className="dark:bg-gray-800"
                        />
                        <Label htmlFor="edit-can-edit-any" className="text-foreground dark:text-foreground/90">
                          {t('canEditAny')}
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="edit-can-edit-own"
                          checked={operatorPermissions.canEditOwn}
                          onCheckedChange={(checked) => setOperatorPermissions({
                            ...operatorPermissions,
                            canEditOwn: checked
                          })}
                          className="dark:bg-gray-800"
                        />
                        <Label htmlFor="edit-can-edit-own" className="text-foreground dark:text-foreground/90">
                          {t('canEditOwn')}
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="edit-can-delete-any"
                          checked={operatorPermissions.canDeleteAny}
                          onCheckedChange={(checked) => setOperatorPermissions({
                            ...operatorPermissions,
                            canDeleteAny: checked
                          })}
                          className="dark:bg-gray-800"
                        />
                        <Label htmlFor="edit-can-delete-any" className="text-foreground dark:text-foreground/90">
                          {t('canDeleteAny')}
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="edit-can-delete-own"
                          checked={operatorPermissions.canDeleteOwn}
                          onCheckedChange={(checked) => setOperatorPermissions({
                            ...operatorPermissions,
                            canDeleteOwn: checked
                          })}
                          className="dark:bg-gray-800"
                        />
                        <Label htmlFor="edit-can-delete-own" className="text-foreground dark:text-foreground/90">
                          {t('canDeleteOwn')}
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPermissionsModalOpen(false)}
              disabled={updatingPermissions}
              className="border-border/40 dark:border-border/30 hover:bg-muted dark:hover:bg-muted/20 text-foreground dark:text-foreground/90"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={updatingPermissions || !selectedOperator}
              className="bg-primary hover:bg-primary/90 dark:bg-primary/90 dark:hover:bg-primary/80"
            >
              {updatingPermissions ? (
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
    </div>
  );
}

export default FinancialCashiers; 