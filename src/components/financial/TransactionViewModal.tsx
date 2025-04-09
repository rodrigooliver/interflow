import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog, DialogContent } from '../ui/Dialog';
import { useToast } from '../../hooks/useToast';
import { format, parseISO, isValid } from 'date-fns';
import { Edit, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_type: 'income' | 'expense';
  category_id: string;
  payment_method_id: string | null;
  cashier_id: string | null;
  due_date: string;
  payment_date: string | null;
  status: 'pending' | 'paid' | 'received' | 'overdue' | 'cancelled';
  notes: string | null;
  customer_id: string | null;
  installment_number: number | null;
  total_installments: number | null;
  parent_transaction_id: string | null;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  created_at: string;
  updated_at: string;
  created_by: string;
  chat_id?: string | null;
  appointment_id?: string | null;
  financial_categories: {
    name: string;
    type: 'income' | 'expense';
  } | null;
  financial_payment_methods: {
    name: string;
  } | null;
  financial_cashiers: {
    name: string;
  } | null;
  customers: {
    name: string;
  } | null;
  profiles: {
    full_name: string;
  } | null;
}

interface TransactionViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string | null;
  onEdit?: (transaction: Transaction) => void;
  onChangeStatus?: (transaction: Transaction) => void;
}

const TransactionViewModal: React.FC<TransactionViewModalProps> = ({
  isOpen,
  onClose,
  transactionId,
  onEdit,
  onChangeStatus
}) => {
  const { t } = useTranslation('financial');
  const { currentOrganizationMember } = useAuthContext();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && transactionId) {
      fetchTransaction(transactionId);
    } else {
      setTransaction(null);
    }
  }, [isOpen, transactionId]);

  const fetchTransaction = async (id: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories (name, type),
          financial_payment_methods (name),
          financial_cashiers (name),
          customers (name),
          profiles (full_name)
        `)
        .eq('id', id)
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .single();

      if (error) throw error;
      setTransaction(data as Transaction);
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao buscar transação:', error);
      toast?.show?.({
        title: t('error'),
        description: t('errorLoadingTransaction'),
        variant: 'destructive'
      });
      setIsLoading(false);
      onClose();
    }
  };

  const formatCurrency = (value: number) => {
    // Obter idioma atual da tradução
    const currentLanguage = t('language', { defaultValue: 'pt-BR' });
    
    // Mapear idioma para locale
    const localeMap: Record<string, string> = {
      'en': 'en-US',
      'es': 'es-ES',
      'pt': 'pt-BR'
    };
    
    // Usar o locale adequado com fallback para pt-BR
    const locale = localeMap[currentLanguage] || 'pt-BR';
    
    // Mapear currency por locale
    const currencyMap: Record<string, string> = {
      'en-US': 'USD',
      'es-ES': 'EUR',
      'pt-BR': 'BRL'
    };
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyMap[locale]
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'dd/MM/yyyy') : '-';
    } catch {
      return '-';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
      case 'received':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'paid':
        return t('paid');
      case 'received':
        return t('received');
      case 'pending':
        return t('pending');
      case 'overdue':
        return t('overdue');
      case 'cancelled':
        return t('cancelled');
      default:
        return status;
    }
  };

  const getFrequencyTranslation = (frequency: string) => {
    return t(`frequency${frequency.charAt(0).toUpperCase() + frequency.slice(1)}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-2"></div>
              <p className="text-gray-600 dark:text-gray-300">{t('loading')}</p>
            </div>
          </div>
        ) : transaction ? (
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    {transaction.description}
                  </CardTitle>
                  <div className="flex mt-2 items-center gap-2">
                    <div className={`p-2 rounded-full inline-block ${transaction.transaction_type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {transaction.transaction_type === 'income' ? (
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      {transaction.transaction_type === 'income' ? t('income') : t('expense')}
                    </span>
                    <Badge className={getStatusBadgeClass(transaction.status)}>
                      {getStatusTranslation(transaction.status)}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  {onEdit && (
                    <Button 
                      variant="outline" 
                      onClick={() => onEdit(transaction)}
                      className="flex items-center dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Edit className="h-4 w-4 mr-1" /> {t('edit')}
                    </Button>
                  )}
                  {onChangeStatus && 
                    (transaction.status === 'pending' || transaction.status === 'overdue') && (
                    <Button 
                      onClick={() => onChangeStatus(transaction)}
                      className={`flex items-center ${transaction.transaction_type === 'income' ? 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> 
                      {transaction.transaction_type === 'income' ? t('markAsReceived') : t('markAsPaid')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('details')}</h3>
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('amount')}:</span>
                        <span className={`font-semibold ${transaction.transaction_type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('category')}:</span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {transaction.financial_categories?.name || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('dueDate')}:</span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {formatDate(transaction.due_date)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('paymentDate')}:</span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {formatDate(transaction.payment_date)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('frequency')}:</span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {getFrequencyTranslation(transaction.frequency)}
                        </span>
                      </div>
                      {transaction.installment_number && transaction.total_installments && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{t('installment')}:</span>
                          <span className="text-gray-800 dark:text-gray-200">
                            {transaction.installment_number}/{transaction.total_installments}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {transaction.notes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('notes')}</h3>
                      <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {transaction.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('paymentInfo')}</h3>
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('paymentMethod')}:</span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {transaction.financial_payment_methods?.name || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('cashier')}:</span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {transaction.financial_cashiers?.name || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {transaction.customer_id && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('customer')}</h3>
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{t('name')}:</span>
                          <span className="text-gray-800 dark:text-gray-200">
                            {transaction.customers?.name || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('systemInfo')}</h3>
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('createdBy')}:</span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {transaction.profiles?.full_name || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('createdAt')}:</span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {formatDate(transaction.created_at)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('updatedAt')}:</span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {formatDate(transaction.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">{t('transactionNotFound')}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransactionViewModal; 