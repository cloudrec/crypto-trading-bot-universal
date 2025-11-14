import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Импорт компонентов вкладок
import HomeTab from '@/components/tabs/HomeTab';
import ConfigTab from '@/components/tabs/ConfigTab';
import ApiKeysManager from '@/components/tabs/ApiKeysManager';
import TradingTab from '@/components/tabs/TradingTab';
import ArbitrageTab from '@/components/tabs/ArbitrageTab';
import TriangularArbitrageTab from '@/components/tabs/TriangularArbitrageTab';
import SubscriptionTab from '@/components/tabs/SubscriptionTab';
import LogsTab from '@/components/tabs/LogsTab';
import AdminPanel from "@/components/tabs/AdminPanel";

const TradingDashboard = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [systemStatus, setSystemStatus] = useState({
    apiKeys: 0,
    activeStrategies: 0,
    totalProfit: 0,
    isConnected: true
  });

  // Загрузка системного статуса
  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      // Проверяем количество API ключей
      const { data: apiKeys } = await supabase
        .from('api_keys_new')
        .select('id')
        .eq('user_id', user?.id);

      // Проверяем активные стратегии (пример)
      const { data: strategies } = await supabase
        .from('arbitrage_logs_2025_11_12_04_45')
        .select('id')
        .eq('user_id', user?.id)
        .eq('level', 'success')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      setSystemStatus({
        apiKeys: apiKeys?.length || 0,
        activeStrategies: strategies?.length || 0,
        totalProfit: Math.random() * 1000, // Заглушка для демо
        isConnected: true
      });

    } catch (error) {
      console.error('Ошибка загрузки статуса:', error);
      setSystemStatus(prev => ({ ...prev, isConnected: false }));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  const sendTelegramNotification = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { 
          action: 'send_telegram_notification',
          message: `🤖 Торговый бот активен!\n\n✅ API ключи: ${systemStatus.apiKeys}\n📊 Активные стратегии: ${systemStatus.activeStrategies}\n💰 Прибыль за 24ч: $${systemStatus.totalProfit.toFixed(2)}\n⏰ ${new Date().toLocaleString('ru-RU')}`
        }
      });

      if (data?.success) {
        alert('✅ Telegram уведомление отправлено!');
      } else {
        alert('❌ Ошибка отправки Telegram уведомления');
      }
    } catch (error) {
      console.error('Ошибка Telegram:', error);
      alert('❌ Ошибка отправки уведомления');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Верхняя панель */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">
              🚀 Универсальный Торговый Бот
            </h1>
            <Badge variant={systemStatus.isConnected ? "default" : "destructive"}>
              {systemStatus.isConnected ? "🟢 Подключен" : "🔴 Отключен"}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Быстрая статистика */}
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="text-blue-400 font-bold">{systemStatus.apiKeys}</div>
                <div className="text-gray-400">API Ключи</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-bold">{systemStatus.activeStrategies}</div>
                <div className="text-gray-400">Стратегии</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-400 font-bold">${systemStatus.totalProfit.toFixed(2)}</div>
                <div className="text-gray-400">Прибыль 24ч</div>
              </div>
            </div>

            {/* Кнопки управления */}
            <Button 
              onClick={sendTelegramNotification}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              📱 Telegram
            </Button>
            
            <Button 
              onClick={loadSystemStatus}
              variant="outline"
              size="sm"
            >
              🔄 Обновить
            </Button>

            {/* Информация о пользователе */}
            <div className="flex items-center space-x-2">
              <div className="text-right text-sm">
                <div className="text-white">{user?.email}</div>
                <div className="text-gray-400">Пользователь</div>
              </div>
              <Button 
                onClick={handleSignOut}
                variant="outline"
                size="sm"
              >
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 bg-gray-800 mb-6">
            <TabsTrigger value="home" className="data-[state=active]:bg-gray-700">
              🏠 Главная
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-gray-700">
              ⚙️ Настройки
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="data-[state=active]:bg-gray-700">
              🔑 API Ключи
            </TabsTrigger>
            <TabsTrigger value="trading" className="data-[state=active]:bg-gray-700">
              📊 Торговля
            </TabsTrigger>
            <TabsTrigger value="arbitrage" className="data-[state=active]:bg-gray-700">
              🔺 Арбитраж
            </TabsTrigger>
            <TabsTrigger value="triangular" className="data-[state=active]:bg-gray-700">
              🔻 Треугольный
            </TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:bg-gray-700">
              💳 Подписка
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-gray-700">
              📝 Логи
            </TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-gray-700">              👨‍💼 Админка            </TabsTrigger>
          </TabsList>

          {/* Вкладка Главная */}
          <TabsContent value="home">
            <HomeTab systemStatus={systemStatus} onRefresh={loadSystemStatus} />
          </TabsContent>

          {/* Вкладка Настройки */}
          <TabsContent value="config">
            <ConfigTab />
          </TabsContent>

          {/* Вкладка API Ключи */}
          <TabsContent value="api-keys">
            <ApiKeysManager onKeysUpdate={loadSystemStatus} />
          </TabsContent>

          {/* Вкладка Торговля */}
          <TabsContent value="trading">
            <TradingTab />
          </TabsContent>

          {/* Вкладка Арбитраж */}
          <TabsContent value="arbitrage">
            <ArbitrageTab />
          </TabsContent>

          {/* Вкладка Треугольный Арбитраж */}
          <TabsContent value="triangular">
            <TriangularArbitrageTab />
          </TabsContent>

          {/* Вкладка Подписка */}
          <TabsContent value="subscription">
            <SubscriptionTab />
          </TabsContent>

          {/* Вкладка Логи */}
          <TabsContent value="logs">
            <LogsTab />
          </TabsContent>
{/* Вкладка Админка */}          <TabsContent value="admin">            <AdminPanel />          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TradingDashboard;
