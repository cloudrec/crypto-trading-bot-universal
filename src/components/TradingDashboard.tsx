import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import ApiKeysManager from "@/components/ApiKeysManager";
import TradingConfigManager from "@/components/TradingConfigManager";
import SubscriptionManager from "@/components/SubscriptionManager";
import AdminPanel from "@/components/AdminPanel";
import LogsViewer from "@/components/LogsViewer";
import PositionsViewer from "@/components/PositionsViewer";

export default function TradingDashboard() {
  const { user, isAdmin } = useAuth();
  const [selectedExchange, setSelectedExchange] = useState('bybit');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<any>(null);

  const exchanges = [
    { id: 'bybit', name: 'Bybit', active: true },
    { id: 'binance', name: 'Binance', active: true },
    { id: 'gate', name: 'Gate.io', active: true },
    { id: 'kucoin', name: 'KuCoin', active: false },
    { id: 'okx', name: 'OKX', active: false },
    { id: 'mexc', name: 'MEXC', active: false }
  ];

  const handleTradingAction = async (action: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('real_trading_engine_2025_11_12_03_55', {
        body: {
          action,
          exchange: selectedExchange
        }
      });

      if (error) throw error;

      if (data.success) {
        if (action === 'check_balance') {
          setBalance(data.data);
        }
        toast({
          title: "✅ Успешно",
          description: `${action} выполнен для ${selectedExchange}`,
        });
      } else {
        throw new Error(data.error || 'Неизвестная ошибка');
      }
    } catch (error: any) {
      console.error('Ошибка:', error);
      toast({
        title: "❌ Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">🤖 Фандинг Арбитраж Бот</h1>
          <div className="flex items-center space-x-4">
            <Badge variant={isAdmin ? "default" : "secondary"}>
              {isAdmin ? "👑 Админ" : "👤 Пользователь"}
            </Badge>
            <Badge variant="outline">{user?.email}</Badge>
          </div>
        </div>

        <Tabs defaultValue="trading" className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-7' : 'grid-cols-6'} bg-gray-800`}>
            <TabsTrigger value="trading">Торговля</TabsTrigger>
            <TabsTrigger value="positions">Позиции</TabsTrigger>
            <TabsTrigger value="config">Конфигурация</TabsTrigger>
            <TabsTrigger value="api-keys">API Ключи</TabsTrigger>
            <TabsTrigger value="logs">Логи</TabsTrigger>
            <TabsTrigger value="subscription">Подписка</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Админ</TabsTrigger>}
          </TabsList>

          {/* Trading Tab */}
          <TabsContent value="trading" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Balance Card */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    💰 Баланс
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {balance ? (
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-green-400">
                        {balance.balance?.USDT || 0} USDT
                      </div>
                      <div className="text-sm text-gray-400">
                        Доступно: {balance.balance?.available || 0} USDT
                      </div>
                      <div className="text-xs text-gray-500">
                        {balance.note}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400">Нажмите "Проверить баланс"</div>
                  )}
                </CardContent>
              </Card>

              {/* Exchange Selection */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">🏦 Биржа</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedExchange} onValueChange={setSelectedExchange}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {exchanges.map((exchange) => (
                        <SelectItem 
                          key={exchange.id} 
                          value={exchange.id}
                          disabled={!exchange.active}
                          className="text-white hover:bg-gray-600"
                        >
                          {exchange.name} {!exchange.active && '(В разработке)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2 text-sm text-gray-400">
                    Выбрано: {selectedExchange.toUpperCase()}
                  </div>
                </CardContent>
              </Card>

              {/* Status Card */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">📊 Статус</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Аутентификация:</span>
                      <Badge variant="default">✅ Активна</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Supabase:</span>
                      <Badge variant="default">✅ Подключен</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Админ права:</span>
                      <Badge variant={isAdmin ? "default" : "secondary"}>
                        {isAdmin ? '✅ Да' : '❌ Нет'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trading Actions */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">⚡ Торговые действия</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    onClick={() => handleTradingAction('check_balance')}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? '🔄' : '💰'} Проверить баланс
                  </Button>
                  <Button 
                    onClick={() => handleTradingAction('start_funding_arbitrage')}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? '🔄' : '🚀'} Запуск бота
                  </Button>
                  <Button 
                    onClick={() => handleTradingAction('test_order')}
                    disabled={loading}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    {loading ? '🔄' : '🎯'} Тест ордер
                  </Button>
                  <Button 
                    onClick={() => handleTradingAction('cancel_all_orders')}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading ? '🔄' : '❌'} Отменить все
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other Tabs - Simplified */}
          <TabsContent value="positions">
            <PositionsViewer />
          </TabsContent>

          <TabsContent value="config">
            <TradingConfigManager />
          </TabsContent>

          <TabsContent value="api-keys">
            <ApiKeysManager />
          </TabsContent>

          <TabsContent value="logs">
            <LogsViewer />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionManager />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
