import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFinancial } from '../../hooks/useFinancial';
import { useCustomers } from '../../hooks/useQueryes';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Save, 
  TrendingUp, 
  TrendingDown,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../hooks/useToast';
import { PostgrestError } from '@supabase/supabase-js';

interface TransactionData {
  id: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  installments_allowed: boolean;
  max_installments: number | null;
}

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId?: string;
  defaultType?: 'income' | 'expense';
  onSuccess?: () => void;
}

const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  transactionId,
  defaultType = 'expense',
  onSuccess
}) => {
  const { t } = useTranslation('financial');
  const { currentOrganizationMember, profile } = useAuthContext();
  const { cashiers, categories, paymentMethods } = useFinancial();
  const { data: customers = [] } = useCustomers(currentOrganizationMember?.organization.id);
  const isEdit = Boolean(transactionId);
  const toast = useToast();
  
  // Estados do formulário
  const [isSaving, setIsSaving] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(defaultType);
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
  
  // Estado para método de pagamento selecionado
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // Carregar dados para edição
  useEffect(() => {
    if (isEdit && transactionId) {
      fetchTransaction(transactionId);
    }
  }, [transactionId, isEdit]);

  // Atualizar método de pagamento selecionado quando o ID muda
  useEffect(() => {
    if (paymentMethodId) {
      const method = paymentMethods.find(pm => pm.id === paymentMethodId);
      setSelectedPaymentMethod(method || null);
    } else {
      setSelectedPaymentMethod(null);
    }
  }, [paymentMethodId, paymentMethods]);

  const fetchTransaction = async (transactionId: string) => {
    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!description || !amount || !categoryId || !dueDate) {
      toast.show({
        title: t('validationError'),
        description: t('fillRequiredFields'),
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      const parsedAmount = parseFloat(amount.replace(',', '.'));
      
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
        status: 'pending'
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="w-full max-w-4xl mx-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="dark:text-white">
              {isEdit ? t('editTransaction') : t('newTransaction')}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tipo de Transação (somente para novos registros) */}
              {!isEdit && (
                <div className="mb-6">
                  <Label className="dark:text-gray-300">{t('transactionType')}</Label>
                  <Tabs 
                    defaultValue={transactionType} 
                    className="mt-2" 
                    onValueChange={(v) => setTransactionType(v as 'income' | 'expense')}
                  >
                    <TabsList className="grid w-full grid-cols-2 dark:bg-gray-800 dark:border-gray-700">
                      <TabsTrigger value="income" className="flex items-center dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">
                        <TrendingUp className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />
                        {t('income')}
                      </TabsTrigger>
                      <TabsTrigger value="expense" className="flex items-center dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">
                        <TrendingDown className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />
                        {t('expense')}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}
              
              {/* Descrição */}
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="description" className="dark:text-gray-300">{t('description')} *</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('description')}
                    required
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
              </div>
              
              {/* Valor e Categoria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="dark:text-gray-300">{t('amount')} *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 dark:text-gray-400">R$</span>
                    <Input
                      id="amount"
                      value={amount}
                      onChange={(e) => {
                        // Permitir somente números e vírgula
                        const value = e.target.value.replace(/[^0-9,]/g, '');
                        setAmount(value);
                      }}
                      placeholder="0,00"
                      className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category" className="dark:text-gray-300">{t('category')} *</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger id="category" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder={t('selectCategory')}>
                        {categoryId ? categories.find(c => c.id === categoryId)?.name : t('selectCategory')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectGroup>
                        {transactionType === 'income' ? (
                          categories
                            .filter(c => c.type === 'income')
                            .map(category => (
                              <SelectItem key={category.id} value={category.id} className="dark:text-white">
                                {category.name}
                              </SelectItem>
                            ))
                        ) : (
                          categories
                            .filter(c => c.type === 'expense')
                            .map(category => (
                              <SelectItem key={category.id} value={category.id} className="dark:text-white">
                                {category.name}
                              </SelectItem>
                            ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Método de Pagamento e Caixa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod" className="dark:text-gray-300">{t('paymentMethod')}</Label>
                  <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                    <SelectTrigger id="paymentMethod" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder={t('selectPaymentMethod')}>
                        {paymentMethodId ? paymentMethods.find(pm => pm.id === paymentMethodId)?.name : t('selectPaymentMethod')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
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
                  <Label htmlFor="cashier" className="dark:text-gray-300">{t('cashier')}</Label>
                  <Select value={cashierId} onValueChange={setCashierId}>
                    <SelectTrigger id="cashier" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder={t('selectCashier')}>
                        {cashierId ? cashiers.find(c => c.id === cashierId)?.name : t('selectCashier')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem value="" className="dark:text-white">{t('none')}</SelectItem>
                      {cashiers.map(cashier => (
                        <SelectItem key={cashier.id} value={cashier.id} className="dark:text-white">
                          {cashier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Data de Vencimento e Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="dark:text-gray-300">{t('dueDate')} *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer" className="dark:text-gray-300">{t('customer')}</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger id="customer" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder={t('selectCustomer')}>
                        {customerId ? customers.find(c => c.id === customerId)?.name : t('selectCustomer')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem value="" className="dark:text-white">{t('none')}</SelectItem>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id} className="dark:text-white">
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Parcelas e Frequência - apenas para novos registros */}
              {!isEdit && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedPaymentMethod?.installments_allowed && (
                    <div className="space-y-2">
                      <Label htmlFor="installments" className="dark:text-gray-300">{t('installmentsNumber')}</Label>
                      <Select
                        value={installments}
                        onValueChange={setInstallments}
                      >
                        <SelectTrigger id="installments" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue>
                            {installments ? `${installments}x` : '1x'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                          {Array.from({ length: selectedPaymentMethod.max_installments || 12 }, (_, i) => i + 1).map(num => (
                            <SelectItem key={num} value={num.toString()} className="dark:text-white">
                              {num}x
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="frequency" className="dark:text-gray-300">{t('frequency')}</Label>
                    <Select value={frequency} onValueChange={(v) => setFrequency(v as 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual')}>
                      <SelectTrigger id="frequency" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue>
                          {frequency && t(`frequency${frequency.charAt(0).toUpperCase() + frequency.slice(1)}`)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
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
                </div>
              )}
              
              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="dark:text-gray-300">{t('notes')}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('notes')}
                  rows={4}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              
              {/* Botões de ação */}
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit"
                  disabled={isSaving}
                  className={`flex items-center ${transactionType === 'income' ? 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600' : 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'}`}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? t('saving') : t('save')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionFormModal; 