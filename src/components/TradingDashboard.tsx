import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

// Импорты компонентов вкладок
import TradingForm from '@/components/tabs/TradingForm';
import PositionsTab from '@/components/tabs/PositionsTab';
import ConfigTab from '@/components/tabs/ConfigTab';
import LogsTab from '@/components/tabs/LogsTab';
import FundingBot from '@/components/tabs/FundingBot';
import AdminPanel from '@/components/tabs/AdminPanel';

// Импорты остальных компонентовimport ApiKeysManager from "@/components/tabs/ApiKeysManager";// Заглушки для компонентов в разработкеconst SubscriptionManager = () => <div className="text-white p-4">Подписка - в разработке</div>;const ArbitrageScanner = () => <div className="text-white p-4">Арбитраж - в разработке</div>;const TriangularArbitrage = () => <div className="text-white p-4">Треугольный арбитраж - в разработке</div>;

const TradingDashboard = () => {
  const { user, isAdmin } = useAuth();
  const [selectedExchange, setSelectedExchange] = useState('bybit');
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Загружаем позиции
      const { data: positionsData } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { action: 'get_funding_positions' }
      });
      
      if (positionsData?.success) {
        setPositions(positionsData.positions || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const handleTradingAction = async (action: string, testMode = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { 
          action, 
          exchange: selectedExchange,
          test_mode: testMode
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "✅ Успешно",
          description: data.message || `${action} выполнено успешно`,
        });

        // Обновляем баланс если это была проверка баланса
        if (action === 'check_balance' && data.balance) {
          setBalances(prev => ({ ...prev, [selectedExchange]: data.balance }));
        }

        // Обновляем позиции
        await loadInitialData();
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = balances[selectedExchange];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🤖 Фандинг Арбитраж Бот</h1>
        
        <Tabs defaultValue="trading" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-10 bg-gray-800">
            <TabsTrigger value="trading">⚡ Торговля</TabsTrigger>
            <TabsTrigger value="positions">📊 Позиции</TabsTrigger>
            <TabsTrigger value="config">⚙️ Конфигурация</TabsTrigger>
            <TabsTrigger value="api-keys">🔑 API Ключи</TabsTrigger>
            <TabsTrigger value="logs">📝 Логи</TabsTrigger>
            <TabsTrigger value="subscription">💳 Подписка</TabsTrigger>
            <TabsTrigger value="arbitrage">🔄 Арбитраж</TabsTrigger>
            <TabsTrigger value="triangular">🔺 Треугольный</TabsTrigger>
            <TabsTrigger value="funding">🤖 Фандинг-Бот</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">👑 Админ</TabsTrigger>}
          </TabsList>

          {/* Торговля */}
          <TabsContent value="trading">
            <TradingForm 
              selectedExchange={selectedExchange}
              onExchangeChange={setSelectedExchange}
              onTradingAction={handleTradingAction}
              currentBalance={currentBalance}
              loading={loading}
              positions={positions}
            />
          </TabsContent>

          {/* Позиции */}
          <TabsContent value="positions">
            <PositionsTab />
          </TabsContent>

          {/* Конфигурация */}
          <TabsContent value="config">
            <ConfigTab />
          </TabsContent>

          {/* API Ключи */}
          <TabsContent value="api-keys">
            <ApiKeysManager />
          </TabsContent>

          {/* Логи */}
          <TabsContent value="logs">
            <LogsTab />
          </TabsContent>

          {/* Подписка */}
          <TabsContent value="subscription">
            <SubscriptionManager />
          </TabsContent>

          {/* Арбитраж */}
          <TabsContent value="arbitrage">
            <ArbitrageScanner />
          </TabsContent>

          {/* Треугольный арбитраж */}
          <TabsContent value="triangular">
            <TriangularArbitrage />
          </TabsContent>

          {/* Фандинг-бот */}
          <TabsContent value="funding">
            <FundingBot />
          </TabsContent>

          {/* Админ панель */}
          {isAdmin && (
            <TabsContent value="admin">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default TradingDashboard;
