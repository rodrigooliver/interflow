import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/Button';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Layers, PieChart } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import TransactionFormModal from '../../components/financial/TransactionFormModal';

// Define interfaces para os tipos
interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_type: 'income' | 'expense';
  status: string;
  due_date: string;
  category_id?: string;
  customer_id?: string;
  financial_categories?: { name: string };
  financial_payment_methods?: { name: string };
  customers?: { name: string };
}

interface CashierBalance {
  id: string;
  balance: number;
}

const FinancialDashboard: React.FC = () => {
  const { t } = useTranslation('financial');
  const navigate = useNavigate();
  const { currentOrganizationMember } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | null>(null);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    pendingIncome: 0,
    pendingExpense: 0,
    overdueIncome: 0,
    overdueExpense: 0,
    cashiersBalance: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    if (currentOrganizationMember?.organization.id) {
      fetchSummaryData();
      fetchRecentTransactions();
    }
  }, [currentOrganizationMember?.organization.id, period]);

  const fetchSummaryData = async () => {
    try {
      setIsLoading(true);

      // Calcular datas para o período selecionado
      const today = new Date();
      let startDate;

      if (period === 'week') {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
      } else if (period === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      } else if (period === 'year') {
        startDate = new Date(today.getFullYear(), 0, 1);
      }

      // Obter transações para o cálculo do resumo
      const { data: transactions, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .gte('due_date', startDate!.toISOString().split('T')[0])
        .lte('due_date', today.toISOString().split('T')[0]);

      if (error) throw error;

      // Obter saldos de caixas
      const { data: cashiers, error: cashiersError } = await supabase
        .from('financial_cashiers')
        .select('id')
        .eq('organization_id', currentOrganizationMember?.organization.id);

      if (cashiersError) throw cashiersError;

      // Buscar saldo de cada caixa
      const cashierBalances: CashierBalance[] = [];
      if (cashiers && cashiers.length > 0) {
        for (const cashier of cashiers) {
          const { data, error } = await supabase
            .rpc('get_cashier_current_balance', { p_cashier_id: cashier.id });
          
          if (!error) {
            cashierBalances.push({
              id: cashier.id,
              balance: data || 0
            });
          }
        }
      }

      // Calcular totais
      let totalIncome = 0;
      let totalExpense = 0;
      let pendingIncome = 0;
      let pendingExpense = 0;
      let overdueIncome = 0;
      let overdueExpense = 0;

      transactions?.forEach(transaction => {
        if (transaction.transaction_type === 'income') {
          if (transaction.status === 'received') {
            totalIncome += transaction.amount;
          } else if (transaction.status === 'pending') {
            pendingIncome += transaction.amount;
          } else if (transaction.status === 'overdue') {
            overdueIncome += transaction.amount;
          }
        } else if (transaction.transaction_type === 'expense') {
          if (transaction.status === 'paid') {
            totalExpense += transaction.amount;
          } else if (transaction.status === 'pending') {
            pendingExpense += transaction.amount;
          } else if (transaction.status === 'overdue') {
            overdueExpense += transaction.amount;
          }
        }
      });

      // Calcular saldo de caixa
      const cashiersBalance = cashierBalances.reduce((sum, cashier) => sum + cashier.balance, 0);

      setSummary({
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        pendingIncome,
        pendingExpense,
        overdueIncome,
        overdueExpense,
        cashiersBalance
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao buscar resumo financeiro:', error);
      setIsLoading(false);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories(name),
          financial_payment_methods(name),
          customers(name)
        `)
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .order('due_date', { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentTransactions(data || []);
    } catch (error) {
      console.error('Erro ao buscar transações recentes:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'received':
        return 'text-green-500';
      case 'pending':
        return 'text-yellow-500';
      case 'overdue':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const handleNewTransaction = (type: 'income' | 'expense') => {
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedType(null);
  };

  const handleModalSuccess = () => {
    // Recarregar dados do dashboard
    fetchSummaryData();
    fetchRecentTransactions();
  };

  return (
    <div className="container mx-auto p-6 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('financialDashboard')}</h1>
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

      <Tabs defaultValue="month" className="mb-6" onValueChange={setPeriod}>
        <TabsList className="dark:bg-gray-800 dark:border-gray-700">
          <TabsTrigger value="week" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('thisWeek')}</TabsTrigger>
          <TabsTrigger value="month" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('thisMonth')}</TabsTrigger>
          <TabsTrigger value="year" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">{t('thisYear')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">
              {t('incomePlural')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500 dark:text-green-400">
              {formatCurrency(summary.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 dark:text-gray-400">
              {t('pending')}: {formatCurrency(summary.pendingIncome)}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">
              {t('expensePlural')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500 dark:text-red-400">
              {formatCurrency(summary.totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 dark:text-gray-400">
              {t('pending')}: {formatCurrency(summary.pendingExpense)}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">
              {t('balance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {formatCurrency(summary.balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 dark:text-gray-400">
              {t('inCash')}: {formatCurrency(summary.cashiersBalance)}
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">
              {t('overduePlural')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500 dark:text-red-400">
              {formatCurrency(summary.overdueExpense + summary.overdueIncome)}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1 dark:text-gray-400">
              <span>{t('toReceive')}: {formatCurrency(summary.overdueIncome)}</span>
              <span>{t('toPay')}: {formatCurrency(summary.overdueExpense)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">{t('recentTransactions')}</CardTitle>
            <CardDescription className="dark:text-gray-400">{t('lastTransactions')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-4 rounded-lg border dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    onClick={() => navigate(`/app/financial/transactions/${transaction.id}`)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${transaction.transaction_type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {transaction.transaction_type === 'income' ? (
                          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium dark:text-gray-200">{transaction.description}</p>
                        <div className="flex space-x-2 text-xs text-muted-foreground dark:text-gray-400">
                          <span>{transaction.financial_categories?.name}</span>
                          {transaction.customer_id && (
                            <>
                              <span>•</span>
                              <span>{transaction.customers?.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${transaction.transaction_type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.transaction_type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </p>
                      <div className="flex flex-col text-xs">
                        <span className={`${getStatusColor(transaction.status)} dark:text-${getStatusColor(transaction.status).split('-')[1]}-400`}>
                          {t(transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1))}
                        </span>
                        <span className="text-muted-foreground dark:text-gray-400">
                          {format(new Date(transaction.due_date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground dark:text-gray-400">
                  {isLoading ? t('loading') : t('noTransactionsFound')}
                </div>
              )}
              
              <div className="flex justify-center mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/app/financial/transactions')}
                  className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t('viewAllTransactions')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">{t('quickActions')}</CardTitle>
            <CardDescription className="dark:text-gray-400">{t('quickAccessFinancialFeatures')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700" 
                onClick={() => navigate('/app/financial/transactions')}
              >
                <Layers className="mr-2 h-4 w-4" />
                {t('financialTransactions')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700" 
                onClick={() => navigate('/app/financial/cashiers')}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {t('financialCashiers')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700" 
                onClick={() => navigate('/app/financial/categories')}
              >
                <Layers className="mr-2 h-4 w-4" />
                {t('financialCategories')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700" 
                onClick={() => navigate('/app/financial/payment-methods')}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                {t('financialPaymentMethods')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700" 
                onClick={() => navigate('/app/financial/reports')}
              >
                <PieChart className="mr-2 h-4 w-4" />
                {t('financialReports')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Formulário */}
      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        defaultType={selectedType || 'expense'}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default FinancialDashboard; 