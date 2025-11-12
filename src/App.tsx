import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AuthForm from '@/components/AuthForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Компонент для тестирования WebSocket подключений
const WebSocketTest = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const connectWebSocket = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [exchange]: true }));
    addLog(`🔌 Подключаемся к WebSocket ${exchange}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('websocket_trading_engine_2025_11_12_06_40', {
        body: { 
          action: 'connect_websocket', 
          exchange: exchange 
        }
      });

      if (error) {
        console.error('❌ Ошибка WebSocket:', error);
        throw error;
      }

      console.log('✅ WebSocket подключен:', data);
      setConnections(prev => ({ ...prev, [exchange]: data }));
      addLog(`✅ WebSocket ${exchange} подключен: ${data.connection_id}`);
      
      // Начинаем периодически получать баланс
      startBalancePolling(exchange);
      
    } catch (error: any) {
      console.error('❌ Ошибка подключения WebSocket:', error);
      addLog(`❌ Ошибка WebSocket ${exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [exchange]: false }));
    }
  };

  const startBalancePolling = (exchange: string) => {
    // Получаем баланс каждые 5 секунд
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('websocket_trading_engine_2025_11_12_06_40', {
          body: { 
            action: 'get_balance', 
            exchange: exchange 
          }
        });

        if (error) {
          console.error(`❌ Ошибка получения баланса ${exchange}:`, error);
          return;
        }

        if (data.success) {
          setBalances(prev => ({ ...prev, [exchange]: data.balance }));
          addLog(`💰 Баланс ${exchange}: ${data.balance.total_usdt?.toFixed(2)} USDT (возраст: ${Math.round(data.age_ms/1000)}с)`);
        }
        
      } catch (error: any) {
        console.error(`❌ Ошибка баланса ${exchange}:`, error);
      }
    }, 5000);

    // Сохраняем интервал для очистки
    setConnections(prev => ({ 
      ...prev, 
      [`${exchange}_interval`]: interval 
    }));
  };

  const subscribeTicker = async (exchange: string, symbol: string = 'BTCUSDT') => {
    addLog(`📊 Подписываемся на тикер ${symbol} для ${exchange}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('websocket_trading_engine_2025_11_12_06_40', {
        body: { 
          action: 'subscribe_ticker', 
          exchange: exchange,
          symbol: symbol
        }
      });

      if (error) throw error;

      addLog(`✅ Подписка на тикер ${symbol} отправлена`);
      
    } catch (error: any) {
      addLog(`❌ Ошибка подписки на тикер: ${error.message}`);
    }
  };

  const testTelegram = async () => {
    addLog('📱 Тестируем Telegram уведомления...');
    
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { 
          action: 'send_telegram_notification',
          message: '🤖 WebSocket торговый бот запущен!\n\n✅ Подключения активны\n📊 Мониторинг балансов включен\n⏰ ' + new Date().toLocaleString('ru-RU')
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

  // Очистка интервалов при размонтировании
  useEffect(() => {
    return () => {
      Object.values(connections).forEach((connection: any) => {
        if (connection && typeof connection === 'number') {
          clearInterval(connection);
        }
      });
    };
  }, [connections]);

  const exchanges = [
    { id: 'bybit', name: 'Bybit', icon: '🟡', color: 'bg-yellow-600' },
    { id: 'binance', name: 'Binance', icon: '🟨', color: 'bg-orange-600' },
    { id: 'gate', name: 'Gate.io', icon: '🟦', color: 'bg-blue-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Заголовок */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-center">
              🚀 WebSocket Торговый Бот - Тестирование Подключений
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-300 mb-4">
              WebSocket подключения предотвращают баны за частые запросы и обеспечивают реальное время
            </p>
            <Button onClick={testTelegram} className="bg-blue-600 hover:bg-blue-700">
              📱 Тест Telegram
            </Button>
          </CardContent>
        </Card>

        {/* Подключения к биржам */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exchanges.map(exchange => (
            <Card key={exchange.id} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>{exchange.icon} {exchange.name}</span>
                  <Badge variant={connections[exchange.id] ? "default" : "secondary"}>
                    {connections[exchange.id] ? "🟢 Подключен" : "🔴 Отключен"}
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
                    onClick={() => connectWebSocket(exchange.id)}
                    disabled={loading[exchange.id]}
                    className={`w-full ${exchange.color} hover:opacity-80`}
                  >
                    {loading[exchange.id] ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Подключаем...
                      </div>
                    ) : (
                      `🔌 Подключить WebSocket`
                    )}
                  </Button>
                  
                  {connections[exchange.id] && (
                    <Button
                      onClick={() => subscribeTicker(exchange.id, 'BTCUSDT')}
                      variant="outline"
                      className="w-full border-gray-600"
                    >
                      📊 Подписаться на BTCUSDT
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Логи */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">📝 Логи Системы</CardTitle>
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
                <p className="text-gray-500 text-center">Логи появятся здесь...</p>
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
              // Восстанавливаем полную версию
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

  return <WebSocketTest />;
};

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
