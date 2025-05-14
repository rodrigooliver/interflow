import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Layers, PieChart, Wallet, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TransactionFormModal from '../../components/financial/TransactionFormModal';
import { useFinancial } from '../../hooks/useFinancial';

const FinancialDashboard: React.FC = () => {
  const { t } = useTranslation('financial');
  const navigate = useNavigate();
  const { currentOrganizationMember } = useAuthContext();
  const { cashiers, isLoading: isLoadingCashiers } = useFinancial();
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | null>(null);
  const [summary, setSummary] = useState({
    cashiersBalance: 0
  });

  useEffect(() => {
    if (currentOrganizationMember?.organization.id) {
      fetchSummaryData();
    }
  }, [currentOrganizationMember?.organization.id, cashiers]);

  const fetchSummaryData = async () => {
    try {
      setIsLoading(true);

      // Não precisamos mais consultar as transações, apenas usamos os saldos dos caixas
      
      // Calcular saldo total a partir dos saldos dos caixas disponíveis pelo hook useFinancial
      const cashiersBalanceTotal = cashiers.reduce((sum, cashier) => sum + (cashier.balance || 0), 0);
      
      // Definir apenas o saldo total dos caixas
      setSummary({
        cashiersBalance: cashiersBalanceTotal
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao calcular resumo financeiro:', error);
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
  };

  const handleViewCashierTransactions = (cashierId: string) => {
    navigate(`/app/financial/transactions?cashier=${cashierId}`);
  };

  return (
    <div className="container mx-auto px-4 py-4 sm:p-6 dark:bg-gray-900">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('financialDashboard')}</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => handleNewTransaction('income')}
            className="flex items-center bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white flex-1 sm:flex-auto justify-center"
            size="sm"
          >
            <TrendingUp className="mr-2 h-4 w-4" /> 
            <span className="hidden sm:inline">{t('newIncome')}</span>
            <span className="sm:hidden">Receita</span>
          </Button>
          <Button 
            onClick={() => handleNewTransaction('expense')}
            className="flex items-center bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white flex-1 sm:flex-auto justify-center"
            size="sm"
          >
            <TrendingDown className="mr-2 h-4 w-4" /> 
            <span className="hidden sm:inline">{t('newExpense')}</span>
            <span className="sm:hidden">Despesa</span>
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-medium dark:text-white">
              {t('cashiersBalance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl sm:text-3xl font-bold ${
              summary.cashiersBalance > 0 
                ? 'text-green-500 dark:text-green-400' 
                : summary.cashiersBalance < 0 
                  ? 'text-red-500 dark:text-red-400' 
                  : 'text-gray-500 dark:text-gray-400'
            }`}>
              {formatCurrency(summary.cashiersBalance)}
            </div>
            <p className="text-sm text-muted-foreground mt-2 dark:text-gray-400">
              {t('balance')} {t('inCash')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="dark:text-white">{t('cashier')}</CardTitle>
              <CardDescription className="dark:text-gray-400">{t('yourCashiers')}</CardDescription>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => navigate('/app/financial/cashiers')}
              className="hidden sm:flex dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('viewAllCashiers')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cashiers.length > 0 ? (
                cashiers.map((cashier) => (
                  <div 
                    key={cashier.id} 
                    className="flex items-center justify-between p-3 sm:p-4 rounded-lg border dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    onClick={() => handleViewCashierTransactions(cashier.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm sm:text-base dark:text-gray-200">{cashier.name}</p>
                        {cashier.description && (
                          <p className="text-xs text-muted-foreground dark:text-gray-400 max-w-[150px] sm:max-w-none truncate">
                            {cashier.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium text-sm sm:text-base ${
                        (cashier.balance || 0) > 0 
                          ? 'text-green-500 dark:text-green-400' 
                          : (cashier.balance || 0) < 0 
                            ? 'text-red-500 dark:text-red-400' 
                            : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {formatCurrency(cashier.balance || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">
                        {cashier.is_active 
                          ? <span className="text-green-500">{t('active')}</span> 
                          : <span className="text-red-500">{t('inactive')}</span>
                        }
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground dark:text-gray-400">
                  {isLoadingCashiers || isLoading ? t('loading') : t('noCashiersFound')}
                </div>
              )}
              
              <div className="flex justify-center mt-4 sm:hidden">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/app/financial/cashiers')}
                  className="w-full dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                  size="sm"
                >
                  {t('viewAllCashiers')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl dark:text-white">{t('quickActions')}</CardTitle>
            <CardDescription className="text-xs sm:text-sm dark:text-gray-400">{t('quickAccessFinancialFeatures')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700" 
                onClick={() => navigate('/app/financial/transactions')}
                size="sm"
              >
                <Layers className="mr-2 h-4 w-4" />
                {t('financialTransactions')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700" 
                onClick={() => navigate('/app/financial/cashiers')}
                size="sm"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {t('financialCashiers')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700" 
                onClick={() => navigate('/app/financial/categories')}
                size="sm"
              >
                <Layers className="mr-2 h-4 w-4" />
                {t('financialCategories')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700" 
                onClick={() => navigate('/app/financial/payment-methods')}
                size="sm"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                {t('financialPaymentMethods')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700" 
                onClick={() => navigate('/app/financial/reports')}
                size="sm"
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