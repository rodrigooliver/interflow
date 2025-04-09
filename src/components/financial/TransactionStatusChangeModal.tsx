import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import api from '../../lib/api';
import { useAuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from '../ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface Transaction {
  id: string;
  transaction_type: 'income' | 'expense';
  status: 'pending' | 'paid' | 'received' | 'overdue' | 'cancelled';
}

interface ApiError extends Error {
  response?: {
    data?: {
      message?: string;
    }
  }
}

interface TransactionStatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess: () => void;
}

const TransactionStatusChangeModal: React.FC<TransactionStatusChangeModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSuccess
}) => {
  const { t } = useTranslation('financial');
  const { currentOrganizationMember } = useAuthContext();
  const toast = useToast();
  
  const [newStatus, setNewStatus] = useState<'paid' | 'received' | 'pending' | 'cancelled'>('paid');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      // Define o status inicial com base no tipo de transação
      setNewStatus(transaction.transaction_type === 'income' ? 'received' : 'paid');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      // Limpa mensagem de erro ao abrir o modal
      setError(null);
    }
  }, [transaction, isOpen]);

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

  const handleSubmit = async () => {
    if (!transaction || !currentOrganizationMember?.organization?.id) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await api.post(
        `/api/${currentOrganizationMember.organization.id}/financial/transactions/${transaction.id}/status`,
        {
          status: newStatus,
          payment_date: newStatus === 'paid' || newStatus === 'received' ? paymentDate : null
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao atualizar status da transação');
      }

      // Primeiro fechamos o modal
      onClose();
      
      // Atualizamos os dados
      onSuccess();
      
      // Depois mostramos a mensagem de sucesso
      setTimeout(() => {
        toast?.show?.({
          title: t('success'),
          description: t('statusUpdateSuccess')
        });
      }, 100);
    } catch (error) {
      console.error('Erro ao atualizar status da transação:', error);
      
      // Exibir erro específico do backend no modal
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.message || 
                           apiError.message || 
                           t('errorUpdatingStatus');
      
      setError(errorMessage);
      
      // Não fechar o modal em caso de erro
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="dark:bg-gray-800 dark:border-gray-700 p-6">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            {transaction?.transaction_type === 'income' 
              ? t('markAsReceived') 
              : t('markAsPaid')}
          </DialogTitle>
          <DialogDescription className="dark:text-gray-300">
            {t('updateTransactionStatus')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 rounded text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-gray-300">
              {t('status')}
            </label>
            <Select 
              value={newStatus} 
              onValueChange={(value) => setNewStatus(value as 'paid' | 'received' | 'pending' | 'cancelled')}
            >
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder={t('selectStatus')}>
                  {getStatusTranslation(newStatus)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                {transaction?.transaction_type === 'income' ? (
                  <SelectItem value="received" className="dark:text-white">{t('received')}</SelectItem>
                ) : (
                  <SelectItem value="paid" className="dark:text-white">{t('paid')}</SelectItem>
                )}
                <SelectItem value="pending" className="dark:text-white">{t('pending')}</SelectItem>
                <SelectItem value="cancelled" className="dark:text-white">{t('cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(newStatus === 'paid' || newStatus === 'received') && (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-gray-300">
                {t('paymentDate')}
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {isSubmitting ? t('processing') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionStatusChangeModal; 