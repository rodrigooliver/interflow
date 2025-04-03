import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/Table';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../../components/ui/DropdownMenu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from '../../components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit, 
  Eye, 
  Filter, 
  MoreHorizontal, 
  Search, 
  Trash, 
  CheckCircle, 
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import TransactionFormModal from '../../components/financial/TransactionFormModal';
import { useToast } from '../../hooks/useToast';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_type: 'income' | 'expense';
  category_id: string;
  due_date: string;
  payment_date: string | null;
  status: 'pending' | 'paid' | 'received' | 'overdue' | 'cancelled';
  notes: string | null;
  customer_id: string | null;
  chat_id: string | null;
  appointment_id: string | null;
  financial_categories: {
    name: string;
  } | null;
  financial_payment_methods: {
    name: string;
  } | null;
  customers: {
    name: string;
  } | null;
}

const FinancialTransactions: React.FC = () => {
  const { t } = useTranslation('financial');
  const navigate = useNavigate();
  const { currentOrganizationMember } = useAuthContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<'paid' | 'received' | 'pending' | 'cancelled'>('paid');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<{ id: string; name: string; type: string }[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | null>(null);
  const toast = useToast();

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (currentOrganizationMember?.organization?.id) {
      fetchTransactions();
      fetchCategories();
    }
  }, [currentOrganizationMember, currentTab, page, categoryFilter, dateRange]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('id, name, type')
        .eq('organization_id', currentOrganizationMember?.organization?.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);

      // Construir a query base
      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories(name),
          financial_payment_methods(name),
          customers(name)
        `, { count: 'exact' })
        .eq('organization_id', currentOrganizationMember?.organization?.id);

      // Adicionar filtros
      if (currentTab === 'income') {
        query = query.eq('transaction_type', 'income');
      } else if (currentTab === 'expense') {
        query = query.eq('transaction_type', 'expense');
      } else if (currentTab === 'pending') {
        query = query.eq('status', 'pending');
      } else if (currentTab === 'overdue') {
        query = query.eq('status', 'overdue');
      } else if (currentTab === 'paid') {
        query = query.or('status.eq.paid,status.eq.received');
      }

      // Filtro por categoria
      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }

      // Filtro por intervalo de datas
      if (dateRange.start) {
        query = query.gte('due_date', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('due_date', dateRange.end);
      }

      // Adicionar paginação
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      // Adicionar ordenação
      query = query.order('due_date', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setTransactions(data || []);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    // Implementar busca por termo depois
    // Por enquanto, apenas recarregar os dados
    fetchTransactions();
  };

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;

    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', selectedTransaction.id)
        .eq('organization_id', currentOrganizationMember?.organization?.id);

      if (error) throw error;

      setIsDeleteDialogOpen(false);
      setSelectedTransaction(null);
      fetchTransactions();
      
      // Mostrar mensagem de sucesso
      toast?.show?.({
        title: t('success'),
        description: t('transactionDeletedSuccess')
      });
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      // Mostrar mensagem de erro
      toast?.show?.({
        title: t('error'),
        description: t('errorDeletingTransaction'),
        variant: 'destructive'
      });
    }
  };

  const handleStatusChange = async () => {
    if (!selectedTransaction) return;

    try {
      const { error } = await supabase
        .from('financial_transactions')
        .update({
          status: newStatus,
          payment_date: newStatus === 'paid' || newStatus === 'received' ? paymentDate : null
        })
        .eq('id', selectedTransaction.id);

      if (error) throw error;

      setIsStatusDialogOpen(false);
      setSelectedTransaction(null);
      fetchTransactions();
    } catch (error) {
      console.error('Erro ao atualizar status da transação:', error);
    }
  };

  const openStatusDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    // Definir status inicial com base no tipo de transação
    setNewStatus(transaction.transaction_type === 'income' ? 'received' : 'paid');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setIsStatusDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
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

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleNewTransaction = (type: 'income' | 'expense') => {
    setSelectedType(type);
    setSelectedTransaction(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
    setSelectedType(null);
  };

  const handleModalSuccess = () => {
    fetchTransactions();
  };

  return (
    <div className="container mx-auto p-6 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('financialTransactions')}</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleNewTransaction('income')}
            className="flex items-center bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
          >
            <TrendingUp className="mr-2 h-4 w-4" /> {t('newIncome')}
          </Button>
          <Button 
            onClick={() => handleNewTransaction('expense')}
            className="flex items-center bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white"
          >
            <TrendingDown className="mr-2 h-4 w-4" /> {t('newExpense')}
          </Button>
        </div>
      </div>

      <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">{t('filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input
                  placeholder={t('searchByDescription')}
                  className="pl-8 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder={t('categories')} />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="">{t('allCategories')}</SelectItem>
                  <SelectGroup>
                    <SelectItem disabled className="font-semibold text-gray-500 dark:text-gray-400" value="header-income">{t('incomePlural')}</SelectItem>
                    {categories.filter(c => c.type === 'income').map(category => (
                      <SelectItem key={category.id} value={category.id} className="dark:text-white">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectItem disabled className="font-semibold text-gray-500 dark:text-gray-400" value="header-expense">{t('expensePlural')}</SelectItem>
                    {categories.filter(c => c.type === 'expense').map(category => (
                      <SelectItem key={category.id} value={category.id} className="dark:text-white">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <div className="w-full md:w-auto">
                <Input
                  type="date"
                  placeholder={t('startDate')}
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="w-full md:w-auto">
                <Input
                  type="date"
                  placeholder={t('endDate')}
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <Button onClick={handleSearch} className="w-full md:w-auto dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">
              <Filter className="mr-2 h-4 w-4" /> {t('filter')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="mb-6" onValueChange={handleTabChange}>
        <TabsList className="dark:bg-gray-800 dark:border-gray-700">
          <TabsTrigger value="all" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('all')}</TabsTrigger>
          <TabsTrigger value="income" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('incomePlural')}</TabsTrigger>
          <TabsTrigger value="expense" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('expensePlural')}</TabsTrigger>
          <TabsTrigger value="pending" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('pendingPlural')}</TabsTrigger>
          <TabsTrigger value="overdue" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('overduePlural')}</TabsTrigger>
          <TabsTrigger value="paid" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('paidOrReceived')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="dark:bg-gray-800 dark:hover:bg-gray-800">
              <TableHead className="dark:text-gray-300">{t('transactionType')}</TableHead>
              <TableHead className="dark:text-gray-300">{t('description')}</TableHead>
              <TableHead className="dark:text-gray-300">{t('category')}</TableHead>
              <TableHead className="dark:text-gray-300">{t('amount')}</TableHead>
              <TableHead className="dark:text-gray-300">{t('dueDate')}</TableHead>
              <TableHead className="dark:text-gray-300">{t('paymentDate')}</TableHead>
              <TableHead className="dark:text-gray-300">{t('status')}</TableHead>
              <TableHead className="dark:text-gray-300">{t('customer')}</TableHead>
              <TableHead className="text-right dark:text-gray-300">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4 dark:text-gray-300">{t('loading')}</TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4 dark:text-gray-300">{t('noTransactionsFound')}</TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id} className="dark:bg-gray-800 dark:hover:bg-gray-700">
                  <TableCell>
                    <div className={`p-2 rounded-full inline-block ${transaction.transaction_type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {transaction.transaction_type === 'income' ? (
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium max-w-xs truncate dark:text-gray-300">
                    {transaction.description}
                  </TableCell>
                  <TableCell className="dark:text-gray-300">
                    {transaction.financial_categories?.name || '-'}
                  </TableCell>
                  <TableCell className={`${transaction.transaction_type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="dark:text-gray-300">
                    {formatDate(transaction.due_date)}
                  </TableCell>
                  <TableCell className="dark:text-gray-300">
                    {formatDate(transaction.payment_date)}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(transaction.status)}`}>
                      {getStatusTranslation(transaction.status)}
                    </span>
                  </TableCell>
                  <TableCell className="dark:text-gray-300">
                    {transaction.customers?.name || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 dark:hover:bg-gray-700">
                          <span className="sr-only">{t('openMenu')}</span>
                          <MoreHorizontal className="h-4 w-4 dark:text-gray-300" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                        <DropdownMenuItem onClick={() => navigate(`/app/financial/transactions/${transaction.id}`)} className="dark:text-gray-300 dark:hover:bg-gray-700">
                          <Eye className="mr-2 h-4 w-4" />
                          {t('view')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(transaction)} className="dark:text-gray-300 dark:hover:bg-gray-700">
                          <Edit className="mr-2 h-4 w-4" />
                          {t('edit')}
                        </DropdownMenuItem>
                        {(transaction.status === 'pending' || transaction.status === 'overdue') && (
                          <DropdownMenuItem onClick={() => openStatusDialog(transaction)} className="dark:text-gray-300 dark:hover:bg-gray-700">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {transaction.transaction_type === 'income' ? t('markAsReceived') : t('markAsPaid')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => {
                          setSelectedTransaction(transaction);
                          setIsDeleteDialogOpen(true);
                        }} className="dark:text-gray-300 dark:hover:bg-gray-700">
                          <Trash className="mr-2 h-4 w-4" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page => Math.max(1, page - 1))}
            disabled={page === 1}
            className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm dark:text-gray-300">
            {t('page', { page, totalPages })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page => Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{t('confirmDeletion')}</DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              {t('confirmDeletionMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
              {t('cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete} className="dark:bg-red-600 dark:hover:bg-red-700">
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para mudar status */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {selectedTransaction?.transaction_type === 'income' 
                ? t('markAsReceived') 
                : t('markAsPaid')}
            </DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              {t('updateTransactionStatus')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-gray-300">
                {t('status')}
              </label>
              <Select 
                value={newStatus} 
                onValueChange={(value) => setNewStatus(value as 'paid' | 'received' | 'pending' | 'cancelled')}
              >
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {selectedTransaction?.transaction_type === 'income' ? (
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
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)} className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
              {t('cancel')}
            </Button>
            <Button onClick={handleStatusChange} className="dark:bg-blue-600 dark:hover:bg-blue-700">
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Formulário */}
      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        transactionId={selectedTransaction?.id}
        defaultType={selectedType || 'expense'}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default FinancialTransactions; 