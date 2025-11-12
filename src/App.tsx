import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AuthForm from '@/components/AuthForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Компонент для тестирования торговых функций
const TradingTest = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [orderForm, setOrderForm] = useState({
    exchange: 'bybit',
    symbol: 'BTCUSDT',
    side: 'Buy',
    quantity: '0.001',
    price: '30000'
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const checkBalance = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`balance_${exchange}`]: true }));
    addLog(`💰 Проверяем баланс на ${exchange}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('hybrid_trading_engine_2025_11_12_06_50', {
        body: { 
          action: 'check_balance', 
          exchange: exchange 
        }
      });

      if (error) {
        console.error('❌ Ошибка проверки баланса:', error);
        throw error;
      }

      console.log('✅ Баланс получен:', data);
      
      if (data.success) {
        setBalances(prev => ({ ...prev, [exchange]: data.balance }));
        addLog(`✅ Баланс ${exchange}: ${data.balance.total_usdt?.toFixed(2)} USDT`);
      } else {
        addLog(`❌ Ошибка баланса ${exchange}: ${data.error}`);
      }
      
    } catch (error: any) {
      console.error('❌ Ошибка проверки баланса:', error);
      addLog(`❌ Ошибка баланса ${exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [`balance_${exchange}`]: false }));
    }
  };

  const placeTestOrder = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`order_${exchange}`]: true }));
    addLog(`📝 Размещаем тестовый ордер на ${exchange}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('hybrid_trading_engine_2025_11_12_06_50', {
        body: { 
          action: 'place_test_order', 
          exchange: exchange,
          symbol: orderForm.symbol,
          side: orderForm.side,
          quantity: orderForm.quantity,
          price: orderForm.price
        }
      });

      if (error) {
        console.error('❌ Ошибка размещения ордера:', error);
        throw error;
      }

      console.log('✅ Ордер размещен:', data);
      
      if (data.success) {
        addLog(`✅ Ордер ${exchange}: ${data.order.orderId} (${data.order.side} ${data.order.quantity} ${data.order.symbol})`);
      } else {
        addLog(`❌ Ошибка ордера ${exchange}: ${data.error}`);
      }
      
    } catch (error: any) {
      console.error('❌ Ошибка размещения ордера:', error);
      addLog(`❌ Ошибка ордера ${exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [`order_${exchange}`]: false }));
    }
  };

  const cancelAllOrders = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`cancel_${exchange}`]: true }));
    addLog(`❌ Отменяем все ордера на ${exchange}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('hybrid_trading_engine_2025_11_12_06_50', {
        body: { 
          action: 'cancel_all_orders', 
          exchange: exchange
        }
      });

      if (error) throw error;

      if (data.success) {
        addLog(`✅ Отменено ордеров на ${exchange}: ${data.cancelled_orders}`);
      }
      
    } catch (error: any) {
      addLog(`❌ Ошибка отмены ордеров ${exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [`cancel_${exchange}`]: false }));
    }
  };

  const closeAllPositions = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`close_${exchange}`]: true }));
    addLog(`🔒 Закрываем все позиции на ${exchange}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('hybrid_trading_engine_2025_11_12_06_50', {
        body: { 
          action: 'close_all_positions', 
          exchange: exchange
        }
      });

      if (error) throw error;

      if (data.success) {
        addLog(`✅ Закрыто позиций на ${exchange}: ${data.closed_positions}`);
      }
      
    } catch (error: any) {
      addLog(`❌ Ошибка закрытия позиций ${exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [`close_${exchange}`]: false }));
    }
  };

  const testTelegram = async () => {
    addLog('📱 Тестируем Telegram уведомления...');
    
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { 
          action: 'send_telegram_notification',
          message: '🤖 Торговый бот тестирование!\n\n✅ Проверка баланса работает\n📝 Тестовые ордера размещаются\n⏰ ' + new Date().toLocaleString('ru-RU')
        }
      });

      if (error) throw error;

      if (data.success) {
        addLog('✅ Telegram уведомление отправлено');
      }
      
    } catch (error: any) {
      addLog(`❌ Ошибка Telegram: ${error.message}`);
    }
  };

  const exchanges = [
    { id: 'bybit', name: 'Bybit', icon: '🟡', color: 'bg-yellow-600' },
    { id: 'binance', name: 'Binance', icon: '🟨', color: 'bg-orange-600' },
    { id: 'gate', name: 'Gate.io', icon: '🟦', color: 'bg-blue-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Заголовок */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-center">
              🚀 Торговый Бот - Тестирование Функций
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-300 mb-4">
              Проверка баланса, размещение тестовых ордеров и управление позициями
            </p>
            <Button onClick={testTelegram} className="bg-blue-600 hover:bg-blue-700">
              📱 Тест Telegram
            </Button>
          </CardContent>
        </Card>

        {/* Форма ордера */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">📝 Параметры Тестового Ордера</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-gray-300">Биржа</Label>
                <Select value={orderForm.exchange} onValueChange={(value) => setOrderForm(prev => ({ ...prev, exchange: value }))}>
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700">
                    {exchanges.map(exchange => (
                      <SelectItem key={exchange.id} value={exchange.id}>
                        {exchange.icon} {exchange.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-gray-300">Символ</Label>
                <Input
                  value={orderForm.symbol}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, symbol: e.target.value }))}
                  className="bg-gray-700 border-gray-600"
                  placeholder="BTCUSDT"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Сторона</Label>
                <Select value={orderForm.side} onValueChange={(value) => setOrderForm(prev => ({ ...prev, side: value }))}>
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700">
                    <SelectItem value="Buy">🟢 Buy</SelectItem>
                    <SelectItem value="Sell">🔴 Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-gray-300">Количество</Label>
                <Input
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="bg-gray-700 border-gray-600"
                  placeholder="0.001"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Цена</Label>
                <Input
                  value={orderForm.price}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, price: e.target.value }))}
                  className="bg-gray-700 border-gray-600"
                  placeholder="30000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Биржи */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exchanges.map(exchange => (
            <Card key={exchange.id} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>{exchange.icon} {exchange.name}</span>
                  <Badge variant={balances[exchange.id] ? "default" : "secondary"}>
                    {balances[exchange.id] ? "💰 Баланс загружен" : "⏳ Нет данных"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Баланс */}
                {balances[exchange.id] && (
                  <div className="bg-gray-700 p-3 rounded">
                    <h4 className="text-sm font-semibold mb-2">💰 Баланс:</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>USDT:</span>
                        <span className="font-mono">{balances[exchange.id].USDT?.total?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Доступно:</span>
                        <span className="font-mono text-green-400">{balances[exchange.id].USDT?.available?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>BTC:</span>
                        <span className="font-mono">{balances[exchange.id].BTC?.total?.toFixed(8) || '0.00000000'}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Всего USD:</span>
                        <span className="font-mono">{balances[exchange.id].total_usdt?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Кнопки управления */}
                <div className="space-y-2">
                  <Button
                    onClick={() => checkBalance(exchange.id)}
                    disabled={loading[`balance_${exchange.id}`]}
                    className={`w-full ${exchange.color} hover:opacity-80`}
                  >
                    {loading[`balance_${exchange.id}`] ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Проверяем...
                      </div>
                    ) : (
                      `💰 Проверить баланс`
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => placeTestOrder(exchange.id)}
                    disabled={loading[`order_${exchange.id}`]}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {loading[`order_${exchange.id}`] ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Размещаем...
                      </div>
                    ) : (
                      `📝 Тестовый ордер`
                    )}
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => cancelAllOrders(exchange.id)}
                      disabled={loading[`cancel_${exchange.id}`]}
                      variant="outline"
                      className="border-orange-600 text-orange-400 hover:bg-orange-600"
                    >
                      {loading[`cancel_${exchange.id}`] ? '⏳' : '❌ Отменить'}
                    </Button>
                    
                    <Button
                      onClick={() => closeAllPositions(exchange.id)}
                      disabled={loading[`close_${exchange.id}`]}
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-600"
                    >
                      {loading[`close_${exchange.id}`] ? '⏳' : '🔒 Закрыть'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Логи */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">📝 Логи Торговых Операций</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 p-4 rounded max-h-96 overflow-y-auto">
              {logs.length > 0 ? (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-sm font-mono text-gray-300">
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center">Логи торговых операций появятся здесь...</p>
              )}
            </div>
            <Button 
              onClick={() => setLogs([])} 
              variant="outline" 
              className="mt-4 border-gray-600"
            >
              🗑️ Очистить логи
            </Button>
          </CardContent>
        </Card>

        {/* Информация о пользователе */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">👤 Информация о пользователе</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Email:</span>
                <div className="font-mono">{user?.email}</div>
              </div>
              <div>
                <span className="text-gray-400">ID:</span>
                <div className="font-mono text-xs">{user?.id}</div>
              </div>
              <div>
                <span className="text-gray-400">Создан:</span>
                <div>{user?.created_at ? new Date(user.created_at).toLocaleString('ru-RU') : 'N/A'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Управление */}
        <div className="text-center space-x-4">
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-green-600 hover:bg-green-700"
          >
            🔄 Перезагрузить страницу
          </Button>
          <Button 
            onClick={() => {
              alert('Для восстановления полной панели обратитесь к администратору');
            }} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            🚀 Восстановить полную панель
          </Button>
        </div>
      </div>
    </div>
  );
};

// Основное приложение
const AuthenticatedApp = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return <TradingTest />;
};

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
