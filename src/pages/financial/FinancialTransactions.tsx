import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
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
  TrendingDown,
  ChevronDown
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import TransactionFormModal from '../../components/financial/TransactionFormModal';
import TransactionViewModal from '../../components/financial/TransactionViewModal';
import TransactionStatusChangeModal from '../../components/financial/TransactionStatusChangeModal';
import { useToast } from '../../hooks/useToast';
import { useFinancial } from '../../hooks/useFinancial';
import { CashierSelector } from '../../components/financial/CashierSelector';

export interface Transaction {
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
  const { currentOrganizationMember } = useAuthContext();
  const { cashiers, categories } = useFinancial();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('paid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({
    pending: 0,
    overdue: 0
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | null>(null);
  const [cashierFilter, setCashierFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const toast = useToast();
  const initializedRef = useRef(false);

  const ITEMS_PER_PAGE = 10;
  const activeCashiers = cashiers.filter(c => c.is_active);
  const hasNoCashiers = !isLoading && activeCashiers.length === 0;

  // Inicializar o filtro de caixa a partir da URL ou usar o primeiro disponível
  useEffect(() => {
    // Garantir que a inicialização ocorra apenas uma vez
    if (initializedRef.current) return;
    if (activeCashiers.length === 0) return;
    
    const cashierId = searchParams.get('cashier');
    
    if (cashierId && activeCashiers.some(c => c.id === cashierId)) {
      // Se o cashierId da URL existir e for válido, usar sem alterar a URL
      setCashierFilter(cashierId);
    } else {
      // Caso contrário, definir para o primeiro caixa e atualizar a URL
      const firstCashierId = activeCashiers[0].id;
      setCashierFilter(firstCashierId);
      
      const newParams = new URLSearchParams(searchParams);
      newParams.set('cashier', firstCashierId);
      navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
    }
    
    initializedRef.current = true;
  }, [searchParams, activeCashiers, navigate, location.pathname]);

  // Função para atualizar o ID do caixa na URL e no state
  const handleSelectCashier = (cashierId: string) => {
    if (cashierId === cashierFilter) return; // Evitar redefinir se for o mesmo caixa
    
    // Primeiro atualizar o state
    setCashierFilter(cashierId);
    
    // Depois atualizar a URL
    const newParams = new URLSearchParams(searchParams);
    newParams.set('cashier', cashierId);
    // Usar replace: true para não adicionar à história de navegação
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
  };

  const fetchTransactions = async () => {
    try {
      // Se não tiver cashierFilter definido, não fazer o fetch ainda
      if (!cashierFilter) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);

      // Construir a query base
      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories(name),
          financial_payment_methods(name),
          customers(name),
          financial_cashiers(name, member:financial_cashier_operators!inner(id, profile_id))
        `, { count: 'exact' })
        .eq('organization_id', currentOrganizationMember?.organization?.id)
        .eq('financial_cashiers.member.profile_id', currentOrganizationMember?.id);

      // Filtro por caixa (sempre aplicado)
      query = query.eq('cashier_id', cashierFilter);

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

  // Buscar contagens de pendentes e vencidos
  const fetchCounts = async () => {
    try {
      if (!currentOrganizationMember?.organization?.id || !cashierFilter) {
        return;
      }
      
      // Buscar contagem de pendentes
      const { count: pendingCount, error: pendingError } = await supabase
        .from('financial_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationMember.organization.id)
        .eq('cashier_id', cashierFilter)
        .eq('status', 'pending');
        
      if (pendingError) {
        console.error('Erro ao buscar contagem de pendentes:', pendingError);
      }
      
      // Buscar contagem de vencidos
      const { count: overdueCount, error: overdueError } = await supabase
        .from('financial_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationMember.organization.id)
        .eq('cashier_id', cashierFilter)
        .eq('status', 'overdue');
        
      if (overdueError) {
        console.error('Erro ao buscar contagem de vencidos:', overdueError);
      }
      
      setCounts({
        pending: pendingCount || 0,
        overdue: overdueCount || 0
      });
    } catch (error) {
      console.error('Erro ao buscar contagens:', error);
    }
  };

  useEffect(() => {
    const orgId = currentOrganizationMember?.organization?.id;
    const profileId = currentOrganizationMember?.id;
    
    if (orgId && profileId && cashierFilter) {
      fetchTransactions();
      fetchCounts();
    }
  }, [currentOrganizationMember?.organization?.id, currentOrganizationMember?.id, currentTab, page, categoryFilter, dateRange, cashierFilter]);

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
      fetchCounts();
      
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

  const openStatusDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
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
    fetchCounts();
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 pt-4 sm:pt-6 dark:bg-gray-900">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="w-full sm:w-auto">
          {/* Seletor de Caixas */}
          {activeCashiers.length > 0 ? (
            <CashierSelector
              cashiers={activeCashiers}
              selectedCashierId={cashierFilter}
              onSelectCashier={handleSelectCashier}
              className="w-full sm:w-auto"
            />
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md w-full text-center sm:text-left">
              {t('noCashiers')}
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap w-full sm:w-auto justify-between sm:justify-end items-center gap-2 sm:gap-4">
          {/* Botão de filtros */}
          <button
            onClick={toggleFilters}
            className="flex items-center justify-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Filter className="w-4 h-4 mr-1" />
            <span>{t('filters')}</span>
            <ChevronDown className="w-3 h-3 ml-1" />
          </button>
          
          {/* Botões de nova transação */}
          <div className="flex gap-2">
            <Button 
              onClick={() => handleNewTransaction('income')}
              className="flex items-center bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white text-xs sm:text-sm px-2 sm:px-3"
              disabled={hasNoCashiers}
            >
              <TrendingUp className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> {t('newIncome')}
            </Button>
            <Button 
              onClick={() => handleNewTransaction('expense')}
              className="flex items-center bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white text-xs sm:text-sm px-2 sm:px-3"
              disabled={hasNoCashiers}
            >
              <TrendingDown className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> {t('newExpense')}
            </Button>
          </div>
        </div>
      </div>

      {/* Mensagem quando não há caixas */}
      {hasNoCashiers && (
        <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('noCashiersAvailable')}
            </p>
            <Button
              onClick={() => navigate('/app/financial/cashiers')}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
            >
              {t('cashiers.addCashier')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Painel de filtros - exibido apenas quando showFilters for true e há caixas disponíveis */}
      {showFilters && !hasNoCashiers && (
        <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-gray-900 dark:text-white text-base">{t('filters')}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="flex flex-col gap-3">
              <div className="w-full">
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
              <div className="w-full">
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
              <div className="grid grid-cols-2 gap-2">
                <div className="w-full">
                  <Input
                    type="date"
                    placeholder={t('startDate')}
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="w-full">
                  <Input
                    type="date"
                    placeholder={t('endDate')}
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <Button onClick={handleSearch} className="w-full dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">
                <Filter className="mr-2 h-4 w-4" /> {t('filter')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hasNoCashiers ? null : (
        <>
          <div className="overflow-x-auto">
            <Tabs defaultValue="paid" className="mb-6" onValueChange={handleTabChange}>
              <TabsList className="dark:bg-gray-800 dark:border-gray-700 flex flex-nowrap overflow-x-auto">
                <TabsTrigger value="all" className="text-xs md:text-sm dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('all')}</TabsTrigger>
                <TabsTrigger value="income" className="text-xs md:text-sm dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('incomePlural')}</TabsTrigger>
                <TabsTrigger value="expense" className="text-xs md:text-sm dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('expensePlural')}</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs md:text-sm dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">
                  {t('pendingPlural')}
                  {counts.pending > 0 && (
                    <span className="ml-1 px-1 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full">
                      {counts.pending}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="overdue" className="text-xs md:text-sm dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">
                  {t('overduePlural')}
                  {counts.overdue > 0 && (
                    <span className="ml-1 px-1 py-0.5 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full">
                      {counts.overdue}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="paid" className="text-xs md:text-sm dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('paidOrReceived')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="overflow-x-auto rounded-md border dark:border-gray-700">
            <Table>
              <TableHeader>
                <TableRow className="dark:bg-gray-800 dark:hover:bg-gray-800">
                  <TableHead className="dark:text-gray-300"></TableHead>
                  <TableHead className="dark:text-gray-300 whitespace-nowrap">{t('description')}</TableHead>
                  <TableHead className="dark:text-gray-300 whitespace-nowrap hidden md:table-cell">{t('category')}</TableHead>
                  <TableHead className="dark:text-gray-300 whitespace-nowrap">{t('amount')}</TableHead>
                  <TableHead className="dark:text-gray-300 whitespace-nowrap hidden sm:table-cell">{t('dueDate')}</TableHead>
                  <TableHead className="dark:text-gray-300 whitespace-nowrap hidden lg:table-cell">{t('paymentDate')}</TableHead>
                  <TableHead className="dark:text-gray-300 whitespace-nowrap">{t('status')}</TableHead>
                  <TableHead className="dark:text-gray-300 whitespace-nowrap hidden md:table-cell">{t('customer')}</TableHead>
                  <TableHead className="text-right dark:text-gray-300 whitespace-nowrap">{t('actions')}</TableHead>
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
                      <TableCell className="p-2">
                        <div className={`p-1.5 rounded-full inline-block ${transaction.transaction_type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                          {transaction.transaction_type === 'income' ? (
                            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[80px] sm:max-w-[150px] md:max-w-xs truncate dark:text-gray-300 p-2 sm:p-4">
                        {transaction.description}
                      </TableCell>
                      <TableCell className="dark:text-gray-300 hidden md:table-cell">
                        {transaction.financial_categories?.name || '-'}
                      </TableCell>
                      <TableCell className={`${transaction.transaction_type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} text-xs sm:text-sm whitespace-nowrap`}>
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="dark:text-gray-300 hidden sm:table-cell text-xs sm:text-sm">
                        {formatDate(transaction.due_date)}
                      </TableCell>
                      <TableCell className="dark:text-gray-300 hidden lg:table-cell text-xs sm:text-sm">
                        {formatDate(transaction.payment_date)}
                      </TableCell>
                      <TableCell className="p-2">
                        <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs ${getStatusBadgeClass(transaction.status)}`}>
                          {getStatusTranslation(transaction.status)}
                        </span>
                      </TableCell>
                      <TableCell className="dark:text-gray-300 hidden md:table-cell truncate max-w-[100px] lg:max-w-[150px]">
                        {transaction.customers?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right p-1 sm:p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 p-0 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                              <span className="sr-only">{t('openMenu')}</span>
                              <MoreHorizontal className="h-4 w-4 dark:text-gray-300 mx-auto" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                            <DropdownMenuItem onClick={() => {
                              setSelectedTransaction(transaction);
                              setIsViewModalOpen(true);
                            }} className="dark:text-gray-300 dark:hover:bg-gray-700">
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
        </>
      )}

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700 max-w-[90vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{t('confirmDeletion')}</DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              {t('confirmDeletionMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 w-full sm:w-auto">
              {t('cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete} className="dark:bg-red-600 dark:hover:bg-red-700 w-full sm:w-auto">
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de mudança de status */}
      <TransactionStatusChangeModal
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        transaction={selectedTransaction}
        onSuccess={() => {
          fetchTransactions();
          fetchCounts();
        }}
      />

      {/* Modal de Formulário */}
      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        transactionId={selectedTransaction?.id}
        defaultType={selectedType || 'expense'}
        defaultCashierId={cashierFilter}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de Visualização */}
      <TransactionViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        transactionId={selectedTransaction?.id || null}
        onEdit={(transaction) => {
          setIsViewModalOpen(false);
          // @ts-expect-error - Incompatibilidade de tipos entre Transaction nos diferentes arquivos
          handleEdit(transaction);
        }}
        onChangeStatus={(transaction) => {
          setIsViewModalOpen(false);
          // @ts-expect-error - Incompatibilidade de tipos entre Transaction nos diferentes arquivos
          openStatusDialog(transaction);
        }}
      />
    </div>
  );
};

export default FinancialTransactions; 