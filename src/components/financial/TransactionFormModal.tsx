import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFinancial } from '../../hooks/useFinancial';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Save, 
  TrendingUp, 
  TrendingDown,
  X,
  Calendar,
  User,
  DollarSign,
  Tag,
  CreditCard,
  Landmark,
  Clock,
  Repeat
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../hooks/useToast';
import { PostgrestError } from '@supabase/supabase-js';
import CustomerSelectModal from '../customers/CustomerSelectModal';
import SearchableSelectField from './SearchableSelectField';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import CategoryForm, { CategoryFormData } from './CategoryForm';

// Interface para as opções do select
interface SelectOption {
  value: string;
  label: string;
  isHtml?: boolean;
  description?: string;
}

interface TransactionData {
  id: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  installments_allowed: boolean;
  max_installments: number | null;
}

interface Cashier {
  id: string;
  name: string;
  is_active: boolean;
}

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId?: string;
  defaultType?: 'income' | 'expense';
  defaultCashierId?: string;
  onSuccess?: () => void;
}

// Interface para categoria básica
interface Category {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
}

const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  transactionId,
  defaultType = 'expense',
  defaultCashierId,
  onSuccess
}) => {
  const { t } = useTranslation('financial');
  const { currentOrganizationMember, profile } = useAuthContext();
  const { categories, paymentMethods, fetchActiveCashiers, invalidateCache } = useFinancial();
  const isEdit = Boolean(transactionId);
  const toast = useToast();
  
  // Estados do formulário
  const [isSaving, setIsSaving] = useState(false);
  const initialTransactionType = useMemo(() => defaultType, [defaultType]);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(initialTransactionType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [cashierId, setCashierId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [installments, setInstallments] = useState('1');
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'>('once');
  const [isPaid, setIsPaid] = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Estado para método de pagamento selecionado
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  
  // Estado para cliente selecionado e modal
  const [selectedCustomer, setSelectedCustomer] = useState<{id: string; name: string; avatar_url?: string} | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  // Estado para caminho da categoria selecionada
  const [selectedCategoryPath, setSelectedCategoryPath] = useState<string>('');
  
  // Estado para validação de formulário
  const [formErrors, setFormErrors] = useState<{
    description: boolean;
    amount: boolean;
    categoryId: boolean;
    dueDate: boolean;
    paymentDate: boolean;
  }>({
    description: false,
    amount: false,
    categoryId: false,
    dueDate: false,
    paymentDate: false,
  });

  // Estado para modal de categoria
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState<CategoryFormData>({
    name: '',
    type: 'expense',
  });

  // Função para resetar o formulário
  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategoryId('');
    setPaymentMethodId('');
    setCashierId('');
    setCustomerId('');
    setSelectedCustomer(null);
    setDueDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
    setInstallments('1');
    setFrequency('once');
    setSelectedPaymentMethod(null);
    setIsPaid(false);
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    
    // Resetar validação
    setFormErrors({
      description: false,
      amount: false,
      categoryId: false,
      dueDate: false,
      paymentDate: false,
    });
  };

  // Atualizar o tipo de transação quando o modal for aberto ou o defaultType mudar
  useEffect(() => {
    if (isOpen) {
      setTransactionType(defaultType);
      if (!isEdit) {
        resetForm();
        // Se tiver um caixa padrão definido, atribuir ao state
        if (defaultCashierId) {
          setCashierId(defaultCashierId);
        }
      }
    }
  }, [isOpen, defaultType, defaultCashierId, isEdit]);

  // Resetar categoria quando o tipo de transação mudar
  useEffect(() => {
    setCategoryId('');
    setSelectedCategoryPath('');
  }, [transactionType]);

  // Resetar o formulário quando o modal for fechado
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Atualizar método de pagamento selecionado quando o ID muda
  useEffect(() => {
    if (paymentMethodId) {
      const method = paymentMethods.find(pm => pm.id === paymentMethodId);
      setSelectedPaymentMethod(method || null);
    } else {
      setSelectedPaymentMethod(null);
    }
  }, [paymentMethodId, paymentMethods]);

  // Funções para o modal de cliente
  const handleOpenCustomerModal = () => {
    setIsCustomerModalOpen(true);
  };
  
  const handleSelectCustomer = (customer: {id: string; name: string; avatar_url?: string}) => {
    setSelectedCustomer(customer);
    setCustomerId(customer.id);
    setIsCustomerModalOpen(false);
  };

  // Função para abrir modal de nova categoria
  const handleOpenCategoryModal = () => {
    console.log('Abrindo modal de categoria com tipo:', transactionType);
    setNewCategoryData({
      name: '',
      type: transactionType,
    });
    setIsCategoryModalOpen(true);
  };

  // Função para quando uma categoria é criada com sucesso
  const handleCategorySuccess = () => {
    setIsCategoryModalOpen(false);
    invalidateCache(); // Recarregar categorias
    toast.show({
      title: t('success'),
      description: t('categoryCreated'),
    });
  };

  // Carregar dados para edição
  const fetchTransaction = async (transactionId: string) => {
    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*, customers(*)')
        .eq('id', transactionId)
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setTransactionType(data.transaction_type);
        setDescription(data.description);
        setAmount(data.amount.toString());
        setCategoryId(data.category_id || '');
        setPaymentMethodId(data.payment_method_id || '');
        setCashierId(data.cashier_id || '');
        setCustomerId(data.customer_id || '');
        setDueDate(data.due_date);
        setNotes(data.notes || '');
        setFrequency(data.frequency || 'once');
        
        // Se temos um customer_id, podemos buscar os detalhes do cliente
        if (data.customer_id && data.customers) {
          setSelectedCustomer({
            id: data.customer_id,
            name: data.customers.name,
            avatar_url: data.customers.avatar_url
          });
        }
        
        // Se for uma transação parcelada, definir o número de parcelas
        if (data.total_installments) {
          setInstallments(data.total_installments.toString());
        }
      }
      
      setIsSaving(false);
    } catch (error) {
      console.error('Erro ao buscar transação:', error);
      toast.show({
        title: t('error'),
        description: t('errorLoadingTransaction'),
        variant: 'destructive'
      });
      setIsSaving(false);
      onClose();
    }
  };

  // Buscar caixas
  const fetchCashiers = async () => {
    try {
      const cashiersData = await fetchActiveCashiers();
      setCashiers(cashiersData || []);
    } catch (error) {
      console.error('Erro ao buscar caixas:', error);
    }
  };

  // Carregar dados necessários ao montar o componente
  useEffect(() => {
    fetchCashiers();
    
    if (isEdit && transactionId) {
      fetchTransaction(transactionId);
    }
  }, [transactionId, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Resetar erros
    setFormErrors({
      description: false,
      amount: false,
      categoryId: false,
      dueDate: false,
      paymentDate: false,
    });
    
    // Validação com marcação de campos com erro
    const errors = {
      description: !description.trim(),
      amount: !amount.trim() || parseFloat(amount.replace(/[^\d,.-]/g, '').replace(',', '.')) <= 0,
      categoryId: !categoryId,
      dueDate: !dueDate,
      paymentDate: isPaid && !paymentDate,
    };
    
    setFormErrors(errors);
    
    // Verificar se há erros
    if (Object.values(errors).some(error => error)) {
      toast.show({
        title: t('validationError'),
        description: t('fillRequiredFields'),
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      const parsedAmount = parseFloat(amount.replace(/[^\d,.-]/g, '').replace(',', '.'));
      
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Valor inválido');
      }
      
      const transactionData = {
        organization_id: currentOrganizationMember?.organization.id,
        description,
        amount: parsedAmount,
        transaction_type: transactionType,
        category_id: categoryId,
        payment_method_id: paymentMethodId || null,
        cashier_id: cashierId || null,
        due_date: dueDate,
        frequency,
        notes,
        customer_id: customerId || null,
        created_by: profile?.id,
        status: isPaid ? (transactionType === 'income' ? 'received' : 'paid') : 'pending',
        payment_date: isPaid ? paymentDate : null
      };
      
      // Criar ou atualizar a transação principal
      if (isEdit) {
        // Atualização de transação existente
        const { error } = await supabase
          .from('financial_transactions')
          .update(transactionData)
          .eq('id', transactionId);
          
        if (error) throw error;
        
        toast.show({
          title: t('success'),
          description: t('transactionUpdatedSuccess')
        });
      } else {
        // Verificar se é uma transação parcelada/recorrente
        const parsedInstallments = parseInt(installments);
        
        if (frequency !== 'once' || (parsedInstallments > 1 && selectedPaymentMethod?.installments_allowed)) {
          // Transação parcelada ou recorrente
          if (parsedInstallments > 1 && selectedPaymentMethod?.installments_allowed) {
            // Transação parcelada
            let parentTransactionId: string | null = null;
            
            // Criar transações para cada parcela
            for (let i = 1; i <= parsedInstallments; i++) {
              const installmentDate = new Date(dueDate);
              installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
              
              const installmentData: {
                organization_id: string | undefined;
                description: string;
                amount: number;
                transaction_type: 'income' | 'expense';
                category_id: string;
                payment_method_id: string | null;
                cashier_id: string | null;
                due_date: string;
                frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
                notes: string;
                customer_id: string | null;
                created_by: string | undefined;
                status: string;
                installment_number: number;
                total_installments: number;
                parent_transaction_id: string | null;
              } = {
                ...transactionData,
                due_date: format(installmentDate, 'yyyy-MM-dd'),
                installment_number: i,
                total_installments: parsedInstallments,
                parent_transaction_id: parentTransactionId,
                description: `${description} - ${t('Parcela')} ${i}/${parsedInstallments}`
              };
              
              const { data, error } = await supabase
                .from('financial_transactions')
                .insert(installmentData)
                .select('id')
                .single() as { data: TransactionData | null; error: PostgrestError | null };
                
              if (error) throw error;
              
              // Guardar o ID da primeira transação como pai
              if (i === 1 && data) {
                parentTransactionId = data.id;
                
                // Atualizar a referência do pai para si mesmo
                await supabase
                  .from('financial_transactions')
                  .update({ parent_transaction_id: parentTransactionId })
                  .eq('id', parentTransactionId);
              }
            }
          } else {
            // Transação recorrente simples (não parcelada)
            const { error } = await supabase
              .from('financial_transactions')
              .insert(transactionData);
              
            if (error) throw error;
          }
        } else {
          // Transação única
          const { error } = await supabase
            .from('financial_transactions')
            .insert(transactionData);
            
          if (error) throw error;
        }

        //Aguradar 1 segundo e invalidar o cahce de cashiers
        await new Promise(resolve => setTimeout(resolve, 1000));
        invalidateCache();
        
        toast.show({
          title: t('success'),
          description: t('transactionCreatedSuccess')
        });
      }
      
      // Fechar modal e chamar callback de sucesso
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      toast.show({
        title: t('error'),
        description: t('errorSavingTransaction'),
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Determinar a cor primária baseada no tipo de transação
  const primaryColor = transactionType === 'income' 
    ? 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white' 
    : 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white';

  // Função para formatar as categorias
  const formatCategoriesForSelect = (cats: Category[], type: 'income' | 'expense'): SelectOption[] => {
    // Definição de interface para categoria com hierarquia
    interface CategoryWithLevel extends Category {
      level: number;
      path: string;
    }

    // Função para construir a hierarquia de categorias
    const buildCategoryHierarchy = (
      categories: Category[], 
      parentId: string | null = null, 
      level = 0, 
      parentPath = ''
    ): CategoryWithLevel[] => {
      return categories
        .filter(cat => cat.parent_id === parentId)
        .reduce((acc: CategoryWithLevel[], category) => {
          // Adicionar a categoria atual com seu nível e caminho
          const path = parentPath ? `${parentPath} > ${category.name}` : category.name;
          const categoryWithLevel = { ...category, level, path };
          
          // Obter subcategorias recursivamente
          const children = buildCategoryHierarchy(categories, category.id, level + 1, path);
          
          return [...acc, categoryWithLevel, ...children];
        }, []);
    };

    // Filtrar categorias por tipo e construir hierarquia
    const categoriesWithLevels = buildCategoryHierarchy(
      cats.filter(cat => cat.type === type)
    );

    // Formatar para o componente SearchableSelectField
    return categoriesWithLevels.map((cat: CategoryWithLevel) => ({
      value: cat.id,
      label: cat.level > 0 ? 
        `${'&nbsp;&nbsp;'.repeat(cat.level)} ${cat.level > 0 ? '&#8212;' : ''} ${cat.name}` : 
        cat.name,
      isHtml: cat.level > 0,
      description: cat.path
    }));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-hidden">
        <div className="w-full max-w-4xl h-[90vh] flex flex-col">
          <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-xl flex flex-col h-full overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b dark:border-gray-700 pb-4 bg-white dark:bg-gray-800 shrink-0">
              <CardTitle className="dark:text-white flex items-center">
                {transactionType === 'income' ? (
                  <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 mr-2 text-red-500" />
                )}
                {isEdit ? t('editTransaction') : t('newTransaction')}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="dark:text-gray-300 dark:hover:bg-gray-700 rounded-full h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <div className="overflow-y-auto flex-grow">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Valor e Tipo de Transação (lado a lado) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Valor à esquerda */}
                    <div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium text-lg">R$</span>
                        <Input
                          id="amount"
                          value={amount}
                          onChange={(e) => {
                            // Permitir somente números e vírgula
                            const value = e.target.value.replace(/[^0-9,]/g, '');
                            setAmount(value);
                          }}
                          placeholder="0,00"
                          className={`pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 focus-within:border-2 focus-within:ring-0 h-12 text-lg font-semibold ${formErrors.amount ? 'border-red-500 dark:border-red-500' : ''}`}
                          required
                        />
                        <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                    
                    {/* Tipo de Transação à direita (somente para novos registros) */}
                    {!isEdit ? (
                      <div>
                        <Tabs 
                          value={transactionType}
                          onValueChange={(v) => setTransactionType(v as 'income' | 'expense')}
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-2 dark:bg-gray-700 bg-gray-100 p-1 rounded-xl">
                            <TabsTrigger 
                              value="income" 
                              className="flex items-center justify-center dark:text-gray-300 dark:data-[state=active]:bg-green-500 dark:data-[state=active]:text-white data-[state=active]:bg-green-500 data-[state=active]:text-white py-3 rounded-lg shadow-sm hover:bg-green-100 dark:hover:bg-green-900/30 transition-all font-medium"
                            >
                              <TrendingUp className="h-5 w-5 mr-2" />
                              {t('income')}
                            </TabsTrigger>
                            <TabsTrigger 
                              value="expense" 
                              className="flex items-center justify-center dark:text-gray-300 dark:data-[state=active]:bg-red-500 dark:data-[state=active]:text-white data-[state=active]:bg-red-500 data-[state=active]:text-white py-3 rounded-lg shadow-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all font-medium"
                            >
                              <TrendingDown className="h-5 w-5 mr-2" />
                              {t('expense')}
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    ) : (
                      <div>
                        <div className={`flex items-center px-4 py-3 rounded-md border ${
                          transactionType === 'income' 
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        }`}>
                          {transactionType === 'income' ? (
                            <>
                              <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                              <span className="font-medium text-green-700 dark:text-green-400">{t('income')}</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-5 w-5 mr-2 text-red-500" />
                              <span className="font-medium text-red-700 dark:text-red-400">{t('expense')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Descrição */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="dark:text-gray-300 font-semibold text-sm flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" /> {t('description')} *
                    </Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('description')}
                      required
                      className={`dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 focus-within:border-2 focus-within:ring-0 ${formErrors.description ? 'border-red-500 dark:border-red-500' : ''}`}
                    />
                  </div>
                  
                  {/* Caixa e Categoria */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {!isEdit ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="cashier" className="dark:text-gray-300 font-semibold text-sm flex items-center">
                            <Landmark className="h-4 w-4 mr-1" /> {t('cashier')}
                          </Label>
                          <Select value={cashierId} onValueChange={setCashierId}>
                            <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                              <SelectValue placeholder={t('selectCashier')}>
                                {cashierId ? cashiers.find(c => c.id === cashierId)?.name : t('selectCashier')}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-800 dark:border-gray-700 max-h-[300px] overflow-y-auto">
                              <SelectItem value="" className="dark:text-white">{t('noCashier')}</SelectItem>
                              {cashiers.map(cashier => (
                                <SelectItem key={cashier.id} value={cashier.id} className="dark:text-white">
                                  {cashier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="category" className="dark:text-gray-300 font-semibold text-sm flex items-center">
                            <Tag className="h-4 w-4 mr-1" /> {t('category')} *
                          </Label>
                          <SearchableSelectField
                            value={categoryId}
                            onChange={(value) => {
                              setCategoryId(value || '');
                              // Atualizar o caminho da categoria selecionada
                              if (value) {
                                const categoriesWithLevels = formatCategoriesForSelect(categories, transactionType);
                                const option = categoriesWithLevels.find(opt => opt.value === value);
                                setSelectedCategoryPath(option?.description || '');
                              } else {
                                setSelectedCategoryPath('');
                              }
                            }}
                            options={formatCategoriesForSelect(categories, transactionType)}
                            placeholder={t('selectCategory')}
                            className={formErrors.categoryId ? 'border-red-500 dark:border-red-500' : ''}
                            showAddButton={true}
                            onAddNew={handleOpenCategoryModal}
                          />
                          {selectedCategoryPath && (
                            <p className="text-xs text-muted-foreground mt-1 truncate dark:text-gray-400">
                              {selectedCategoryPath}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Modo de edição - Caixa somente leitura */}
                        <div className="space-y-2">
                          <Label htmlFor="cashier" className="dark:text-gray-300 font-semibold text-sm flex items-center">
                            <Landmark className="h-4 w-4 mr-1" /> {t('cashier')}
                          </Label>
                          <div className="flex items-center px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <Landmark className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                            <span>
                              {cashierId 
                                ? cashiers.find(c => c.id === cashierId)?.name 
                                : t('noCashier')}
                            </span>
                          </div>
                        </div>
                        
                        {/* Modo de edição - Categoria em largura total */}
                        <div className="space-y-2 md:col-span-1">
                          <Label htmlFor="category" className="dark:text-gray-300 font-semibold text-sm flex items-center">
                            <Tag className="h-4 w-4 mr-1" /> {t('category')} *
                          </Label>
                          <SearchableSelectField
                            value={categoryId}
                            onChange={(value) => {
                              setCategoryId(value || '');
                              // Atualizar o caminho da categoria selecionada
                              if (value) {
                                const categoriesWithLevels = formatCategoriesForSelect(categories, transactionType);
                                const option = categoriesWithLevels.find(opt => opt.value === value);
                                setSelectedCategoryPath(option?.description || '');
                              } else {
                                setSelectedCategoryPath('');
                              }
                            }}
                            options={formatCategoriesForSelect(categories, transactionType)}
                            placeholder={t('selectCategory')}
                            className={formErrors.categoryId ? 'border-red-500 dark:border-red-500' : ''}
                            showAddButton={true}
                            onAddNew={handleOpenCategoryModal}
                          />
                          {selectedCategoryPath && (
                            <p className="text-xs text-muted-foreground mt-1 truncate dark:text-gray-400">
                              {selectedCategoryPath}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Método de Pagamento e Cliente */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod" className="dark:text-gray-300 font-semibold text-sm flex items-center">
                        <CreditCard className="h-4 w-4 mr-1" /> {t('paymentMethod')}
                      </Label>
                      <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                        <SelectTrigger id="paymentMethod" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder={t('selectPaymentMethod')}>
                            {paymentMethodId ? paymentMethods.find(pm => pm.id === paymentMethodId)?.name : t('selectPaymentMethod')}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:border-gray-700 max-h-[300px] overflow-y-auto">
                          <SelectItem value="" className="dark:text-white">{t('none')}</SelectItem>
                          {paymentMethods.map(method => (
                            <SelectItem key={method.id} value={method.id} className="dark:text-white">
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="customer" className="dark:text-gray-300 font-semibold text-sm flex items-center">
                        <User className="h-4 w-4 mr-1" /> {t('customer')}
                      </Label>
                      <div className="flex mt-1">
                        {selectedCustomer ? (
                          <div className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                              {selectedCustomer && selectedCustomer.avatar_url ? (
                                <img
                                  src={selectedCustomer.avatar_url}
                                  alt={selectedCustomer.name}
                                  className="rounded-full w-8 h-8 object-cover"
                                />
                              ) : (
                                <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              )}
                            </div>
                            <div className="ml-3 flex-grow">
                              <p className="text-sm font-medium">{selectedCustomer && selectedCustomer.name}</p>
                            </div>
                            <button
                              type="button"
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                              onClick={() => {
                                setSelectedCustomer(null);
                                setCustomerId('');
                              }}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                            onClick={handleOpenCustomerModal}
                          >
                            <User className="w-4 h-4 mr-2" />
                            {t('selectCustomer')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Data de Vencimento e Frequência */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="dueDate" className="dark:text-gray-300 font-semibold text-sm flex items-center">
                        <Calendar className="h-4 w-4 mr-1" /> {t('dueDate')} *
                      </Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                        className={`dark:bg-gray-700 dark:border-gray-600 dark:text-white focus-within:border-2 focus-within:ring-0 ${formErrors.dueDate ? 'border-red-500 dark:border-red-500' : ''}`}
                      />
                    </div>

                    {!isEdit && (
                      <div className="space-y-2">
                        <Label htmlFor="frequency" className="dark:text-gray-300 font-semibold text-sm flex items-center">
                          <Clock className="h-4 w-4 mr-1" /> {t('frequency')}
                        </Label>
                        <Select value={frequency} onValueChange={(v) => setFrequency(v as 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual')}>
                          <SelectTrigger id="frequency" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <SelectValue>
                              {frequency && t(`frequency${frequency.charAt(0).toUpperCase() + frequency.slice(1)}`)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="dark:bg-gray-800 dark:border-gray-700 max-h-[300px] overflow-y-auto">
                            <SelectItem value="once" className="dark:text-white">{t('frequencyOnce')}</SelectItem>
                            <SelectItem value="daily" className="dark:text-white">{t('frequencyDaily')}</SelectItem>
                            <SelectItem value="weekly" className="dark:text-white">{t('frequencyWeekly')}</SelectItem>
                            <SelectItem value="monthly" className="dark:text-white">{t('frequencyMonthly')}</SelectItem>
                            <SelectItem value="quarterly" className="dark:text-white">{t('frequencyQuarterly')}</SelectItem>
                            <SelectItem value="semiannual" className="dark:text-white">{t('frequencySemiannual')}</SelectItem>
                            <SelectItem value="annual" className="dark:text-white">{t('frequencyAnnual')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  {/* Checkbox para marcar como pago e data de pagamento - somente para transações de frequência única */}
                  {!isEdit && frequency === 'once' && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isPaid"
                          checked={isPaid}
                          onChange={(e) => setIsPaid(e.target.checked)}
                          className="rounded dark:bg-gray-700 dark:border-gray-600"
                        />
                        <Label htmlFor="isPaid" className="dark:text-gray-300 font-semibold text-sm">
                          {transactionType === 'income' ? t('markAsReceived') : t('markAsPaid')}
                        </Label>
                      </div>
                      
                      {isPaid && (
                        <div className="space-y-2">
                          <Label htmlFor="paymentDate" className="dark:text-gray-300 font-semibold text-sm flex items-center">
                            <Calendar className="h-4 w-4 mr-1" /> {t('paymentDate')} *
                          </Label>
                          <Input
                            id="paymentDate"
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            required
                            className={`dark:bg-gray-700 dark:border-gray-600 dark:text-white focus-within:border-2 focus-within:ring-0 ${formErrors.paymentDate ? 'border-red-500 dark:border-red-500' : ''}`}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Parcelas - apenas para novos registros */}
                  {!isEdit && selectedPaymentMethod?.installments_allowed && (
                    <div className="space-y-2">
                      <Label htmlFor="installments" className="dark:text-gray-300 font-semibold text-sm flex items-center">
                        <Repeat className="h-4 w-4 mr-1" /> {t('installmentsNumber')}
                      </Label>
                      <Select
                        value={installments}
                        onValueChange={setInstallments}
                      >
                        <SelectTrigger id="installments" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue>
                            {installments ? `${installments}x` : '1x'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:border-gray-700 max-h-[300px] overflow-y-auto">
                          {Array.from({ length: selectedPaymentMethod.max_installments || 12 }, (_, i) => i + 1).map(num => (
                            <SelectItem key={num} value={num.toString()} className="dark:text-white">
                              {num}x
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Observações */}
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="dark:text-gray-300 font-semibold text-sm">{t('notes')}</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('notes')}
                      rows={3}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 focus-within:border-2 focus-within:ring-0"
                    />
                  </div>
                </form>
              </CardContent>
            </div>
            
            {/* Botões de ação - fixados na parte inferior */}
            <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg shrink-0">
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className={`flex items-center ${primaryColor}`}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? t('saving') : t('save')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Modal de seleção de cliente */}
        <CustomerSelectModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onSelectCustomer={handleSelectCustomer}
        />
      </div>

      {/* Modal de criação de categoria */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground/90">
              {t('newCategory')}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            initialData={newCategoryData}
            onSuccess={handleCategorySuccess}
            onCancel={() => setIsCategoryModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TransactionFormModal; 