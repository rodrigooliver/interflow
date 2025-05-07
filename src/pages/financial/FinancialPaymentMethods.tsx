import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useFinancial } from '../../hooks/useFinancial';
import { useToast } from '../../hooks/useToast';
import { PostgrestError } from '@supabase/supabase-js';
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
  TableHead,
  TableHeader,
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
import { Textarea } from '../../components/ui/Textarea';
import { Switch } from '../../components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/DropdownMenu';
import { Badge } from '../../components/ui/Badge';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  MoreHorizontal,
  CreditCard,
  Eye
} from 'lucide-react';

// Interface para os métodos de pagamento
interface PaymentMethod {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  requires_confirmation: boolean;
  is_credit: boolean;
  installments_allowed: boolean;
  max_installments: number | null;
  fee_percentage: number | null;
  is_active: boolean;
  key: string | null;
  created_at: string;
  updated_at: string;
}

// Interface para os dados do formulário
interface PaymentMethodFormData {
  id?: string;
  name: string;
  description: string;
  requires_confirmation: boolean;
  is_credit: boolean;
  installments_allowed: boolean;
  max_installments: number | null;
  fee_percentage: number | null;
  key: string;
  is_active: boolean;
}

const FinancialPaymentMethods: React.FC = () => {
  const { t } = useTranslation('financial');
  const { show } = useToast();
  const { currentOrganizationMember } = useAuthContext();
  const { invalidateCache } = useFinancial();
  
  // Estados
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredMethods, setFilteredMethods] = useState<PaymentMethod[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [methodToDelete, setMethodToDelete] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  
  // Dados do formulário
  const emptyFormData: PaymentMethodFormData = {
    name: '',
    description: '',
    requires_confirmation: false,
    is_credit: false,
    installments_allowed: false,
    max_installments: null,
    fee_percentage: null,
    key: '',
    is_active: true,
  };
  
  const [currentMethod, setCurrentMethod] = useState<PaymentMethodFormData>(emptyFormData);
  
  // Carregar os métodos de pagamento
  const loadPaymentMethods = async () => {
    if (!currentOrganizationMember?.organization.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_payment_methods')
        .select('*')
        .eq('organization_id', currentOrganizationMember.organization.id)
        .order('name');
        
      if (error) throw error;
      
      setPaymentMethods(data || []);
    } catch (error: PostgrestError | any) {
      console.error('Erro ao carregar métodos de pagamento:', error);
      show({
        title: t('error'),
        description: t('errorLoadingPaymentMethods'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Efeito para carregar os dados iniciais
  useEffect(() => {
    if (currentOrganizationMember?.organization.id) {
      loadPaymentMethods();
    }
  }, [currentOrganizationMember?.organization.id]);
  
  // Efeito para filtrar os métodos com base na pesquisa
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMethods(paymentMethods);
    } else {
      const filtered = paymentMethods.filter(method => 
        method.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (method.key && method.key.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredMethods(filtered);
    }
  }, [searchTerm, paymentMethods]);
  
  // Abrir o modal para edição
  const handleEdit = (method: PaymentMethod) => {
    setCurrentMethod({
      id: method.id,
      name: method.name,
      description: method.description || '',
      requires_confirmation: method.requires_confirmation,
      is_credit: method.is_credit,
      installments_allowed: method.installments_allowed,
      max_installments: method.max_installments,
      fee_percentage: method.fee_percentage,
      key: method.key || '',
      is_active: method.is_active,
    });
    setIsModalOpen(true);
  };
  
  // Abrir o modal para novo método
  const handleAdd = () => {
    setCurrentMethod(emptyFormData);
    setIsModalOpen(true);
  };
  
  // Abrir o modal para visualização
  const handleView = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setIsViewModalOpen(true);
  };
  
  // Salvar o método de pagamento
  const handleSave = async () => {
    if (!currentOrganizationMember?.organization.id) return;
    
    // Validações
    if (!currentMethod.name.trim()) {
      show({
        title: t('error'),
        description: t('nameRequired'),
        variant: 'destructive',
      });
      return;
    }
    
    // Se permite parcelamento, precisa ter um número máximo de parcelas
    if (currentMethod.installments_allowed && 
        (!currentMethod.max_installments || currentMethod.max_installments <= 0)) {
      show({
        title: t('error'),
        description: t('maxInstallmentsRequired'),
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const methodData = {
        organization_id: currentOrganizationMember.organization.id,
        name: currentMethod.name.trim(),
        description: currentMethod.description.trim() || null,
        requires_confirmation: currentMethod.requires_confirmation,
        is_credit: currentMethod.is_credit,
        installments_allowed: currentMethod.installments_allowed,
        max_installments: currentMethod.installments_allowed ? currentMethod.max_installments : null,
        fee_percentage: currentMethod.fee_percentage || null,
        key: currentMethod.key.trim() || null,
        is_active: currentMethod.is_active,
      };
      
      let response;
      
      if (currentMethod.id) {
        // Atualização
        response = await supabase
          .from('financial_payment_methods')
          .update(methodData)
          .eq('id', currentMethod.id);
      } else {
        // Inserção
        response = await supabase
          .from('financial_payment_methods')
          .insert(methodData);
      }
      
      if (response.error) throw response.error;
      
      show({
        title: t('success'),
        description: currentMethod.id ? t('paymentMethodUpdated') : t('paymentMethodAdded'),
      });
      
      setIsModalOpen(false);
      invalidateCache();
      loadPaymentMethods();
    } catch (error: PostgrestError | any) {
      console.error('Erro ao salvar método de pagamento:', error);
      
      let errorMessage = t('errorSavingPaymentMethod');
      
      // Verificar erros de constraint
      if ('code' in error && 'detail' in error) {
        if (error.code === '23505') {
          if (error.detail?.includes('key')) {
            errorMessage = t('paymentMethodKeyAlreadyExists');
          } else if (error.detail?.includes('name')) {
            errorMessage = t('paymentMethodNameAlreadyExists');
          }
        }
      }
      
      show({
        title: t('error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Preparar exclusão
  const handleDeleteConfirm = (id: string) => {
    setMethodToDelete(id);
    setDeleteConfirmOpen(true);
  };
  
  // Realizar exclusão
  const handleDelete = async () => {
    if (!methodToDelete) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('financial_payment_methods')
        .delete()
        .eq('id', methodToDelete);
        
      if (error) throw error;
      
      show({
        title: t('success'),
        description: t('paymentMethodDeleted'),
      });
      
      invalidateCache();
      loadPaymentMethods();
    } catch (error) {
      console.error('Erro ao excluir método de pagamento:', error);
      show({
        title: t('error'),
        description: t('errorDeletingPaymentMethod'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setDeleteConfirmOpen(false);
      setMethodToDelete(null);
    }
  };
  
  // Manipular mudanças no input do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentMethod({
      ...currentMethod,
      [name]: value,
    });
  };
  
  // Manipular mudanças nos checkboxes
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setCurrentMethod({
      ...currentMethod,
      [name]: checked,
    });
    
    // Se desabilitar parcelamento, limpar o número máximo de parcelas
    if (name === 'installments_allowed' && !checked) {
      setCurrentMethod(prev => ({
        ...prev,
        max_installments: null,
      }));
    }
  };
  
  // Manipular mudanças nos campos numéricos
  const handleNumberChange = (name: string, value: string) => {
    const numValue = value === '' ? null : Number(value);
    setCurrentMethod({
      ...currentMethod,
      [name]: numValue,
    });
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0 dark:text-white">{t('financialPaymentMethods')}</h1>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              type="search"
              placeholder={t('search')}
              className="pl-9 dark:bg-gray-800 dark:border-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} className="dark:bg-blue-600 dark:hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            {t('add')}
          </Button>
        </div>
      </div>
      
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl dark:text-white">{t('paymentMethodsList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-blue-400" />
            </div>
          ) : filteredMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-1">
                {searchTerm ? t('noSearchResults') : t('noPaymentMethodsYet')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm ? t('tryAnotherSearch') : t('addYourFirstPaymentMethod')}
              </p>
              {!searchTerm && (
                <Button onClick={handleAdd} variant="outline" className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('addPaymentMethod')}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border dark:border-gray-700">
              <Table>
                <TableHeader>
                  <TableRow className="dark:bg-gray-800 dark:hover:bg-gray-800">
                    <TableHead className="dark:text-gray-300">{t('name')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('key')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('installmentsInfo')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('feePercentage')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('status')}</TableHead>
                    <TableHead className="text-right dark:text-gray-300">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMethods.map((method) => (
                    <TableRow key={method.id} className="dark:bg-gray-800 dark:hover:bg-gray-700">
                      <TableCell className="font-medium dark:text-gray-200">
                        {method.name}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">
                        {method.key || '-'}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">
                        {method.installments_allowed 
                          ? t('installmentsUpTo', { max: method.max_installments })
                          : t('noInstallments')}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">
                        {method.fee_percentage ? `${method.fee_percentage}%` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={method.is_active ? "success" : "error"}
                          className={`${method.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}
                        >
                          {method.is_active ? t('active') : t('inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                            onClick={() => handleView(method)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">{t('view')}</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            onClick={() => handleEdit(method)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">{t('edit')}</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            onClick={() => handleDeleteConfirm(method.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">{t('delete')}</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 dark:text-gray-300 dark:hover:bg-gray-700">
                                <span className="sr-only">{t('openMenu')}</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                              <DropdownMenuItem 
                                onClick={() => handleEdit(method)}
                                className="cursor-pointer dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteConfirm(method.id)}
                                className="cursor-pointer text-red-600 dark:text-red-400 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal para visualização */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-white">
              {selectedMethod?.name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-gray-400">
              {t('paymentMethodDetails')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedMethod && (
            <div className="space-y-6 py-4">
              {/* Informações principais */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('key')}
                  </h3>
                  <p className="mt-1 text-sm dark:text-white">
                    {selectedMethod.key || '-'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('description')}
                  </h3>
                  <p className="mt-1 text-sm dark:text-white">
                    {selectedMethod.description || '-'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t('status')}
                    </h3>
                    <Badge 
                      variant={selectedMethod.is_active ? "success" : "error"}
                      className={`mt-1 ${selectedMethod.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}
                    >
                      {selectedMethod.is_active ? t('active') : t('inactive')}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t('feePercentage')}
                    </h3>
                    <p className="mt-1 text-sm dark:text-white">
                      {selectedMethod.fee_percentage ? `${selectedMethod.fee_percentage}%` : '-'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Propriedades do método de pagamento */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {t('properties')}
                </h3>
                <div className="rounded-md border dark:border-gray-700 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm dark:text-gray-300">{t('isCreditPayment')}</span>
                    <Badge 
                      variant={selectedMethod.is_credit ? "default" : "outline"}
                      className={`${selectedMethod.is_credit 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400'}`}
                    >
                      {selectedMethod.is_credit ? t('yes') : t('no')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm dark:text-gray-300">{t('requiresConfirmation')}</span>
                    <Badge 
                      variant={selectedMethod.requires_confirmation ? "default" : "outline"}
                      className={`${selectedMethod.requires_confirmation 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400'}`}
                    >
                      {selectedMethod.requires_confirmation ? t('yes') : t('no')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm dark:text-gray-300">{t('allowsInstallments')}</span>
                    <Badge 
                      variant={selectedMethod.installments_allowed ? "default" : "outline"}
                      className={`${selectedMethod.installments_allowed 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400'}`}
                    >
                      {selectedMethod.installments_allowed ? t('yes') : t('no')}
                    </Badge>
                  </div>
                  
                  {selectedMethod.installments_allowed && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm dark:text-gray-300">{t('maxInstallments')}</span>
                      <span className="text-sm font-medium dark:text-white">
                        {t('installmentsUpTo', { max: selectedMethod.max_installments })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Informações do sistema */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {t('systemInfo')}
                </h3>
                <div className="rounded-md border dark:border-gray-700 p-3 space-y-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>{t('createdAt')}</span>
                    <span>{new Date(selectedMethod.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t('updatedAt')}</span>
                    <span>{new Date(selectedMethod.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsViewModalOpen(false)}
                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('close')}
              </Button>
              {selectedMethod && (
                <>
                  <Button 
                    variant="outline"
                    className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-500 dark:hover:bg-blue-900/20"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleEdit(selectedMethod);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {t('edit')}
                  </Button>
                  <Button 
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleDeleteConfirm(selectedMethod.id);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('delete')}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal para adicionar/editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-white">
              {currentMethod.id ? t('editPaymentMethod') : t('newPaymentMethod')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-gray-400">
              {currentMethod.id 
                ? t('editPaymentMethodDescription') 
                : t('newPaymentMethodDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground dark:text-gray-300">
                {t('name')} *
              </Label>
              <Input
                id="name"
                name="name"
                value={currentMethod.name}
                onChange={handleInputChange}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('paymentMethodNamePlaceholder')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="key" className="text-foreground dark:text-gray-300">
                {t('key')}
              </Label>
              <Input
                id="key"
                name="key"
                value={currentMethod.key}
                onChange={handleInputChange}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('paymentMethodKeyPlaceholder')}
              />
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                {t('paymentMethodKeyHelp')}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground dark:text-gray-300">
                {t('description')}
              </Label>
              <Textarea
                id="description"
                name="description"
                value={currentMethod.description}
                onChange={handleInputChange}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('descriptionPlaceholder')}
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="is_credit" 
                  checked={currentMethod.is_credit} 
                  onCheckedChange={(checked) => handleCheckboxChange('is_credit', checked)}
                  className="data-[state=checked]:bg-blue-600 dark:border-gray-600"
                />
                <Label htmlFor="is_credit" className="dark:text-gray-300">
                  {t('isCreditPayment')}
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="requires_confirmation" 
                  checked={currentMethod.requires_confirmation} 
                  onCheckedChange={(checked) => handleCheckboxChange('requires_confirmation', checked)}
                  className="data-[state=checked]:bg-blue-600 dark:border-gray-600"
                />
                <Label htmlFor="requires_confirmation" className="dark:text-gray-300">
                  {t('requiresConfirmation')}
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="installments_allowed" 
                  checked={currentMethod.installments_allowed} 
                  onCheckedChange={(checked) => handleCheckboxChange('installments_allowed', checked)}
                  className="data-[state=checked]:bg-blue-600 dark:border-gray-600"
                />
                <Label htmlFor="installments_allowed" className="dark:text-gray-300">
                  {t('allowsInstallments')}
                </Label>
              </div>
              
              {currentMethod.installments_allowed && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="max_installments" className="text-foreground dark:text-gray-300">
                    {t('maxInstallments')} *
                  </Label>
                  <Input
                    id="max_installments"
                    type="number"
                    value={currentMethod.max_installments || ''}
                    onChange={(e) => handleNumberChange('max_installments', e.target.value)}
                    min="1"
                    max="99"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white w-full"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="fee_percentage" className="text-foreground dark:text-gray-300">
                  {t('feePercentage')}
                </Label>
                <Input
                  id="fee_percentage"
                  type="number"
                  value={currentMethod.fee_percentage || ''}
                  onChange={(e) => handleNumberChange('fee_percentage', e.target.value)}
                  min="0"
                  max="100"
                  step="0.01"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground dark:text-gray-400">
                  {t('feePercentageHelp')}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="is_active" 
                  checked={currentMethod.is_active} 
                  onCheckedChange={(checked) => handleCheckboxChange('is_active', checked)}
                  className="data-[state=checked]:bg-blue-600 dark:border-gray-600"
                />
                <Label htmlFor="is_active" className="dark:text-gray-300">
                  {t('isActive')}
                </Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button 
              type="button" 
              onClick={handleSave}
              className="dark:bg-blue-600 dark:hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-white">
              {t('confirmDelete')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-gray-400">
              {t('deletePaymentMethodConfirmation')}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteConfirmOpen(false)}
              className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button 
              type="button" 
              variant="danger"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('deleting')}
                </>
              ) : (
                t('delete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialPaymentMethods; 