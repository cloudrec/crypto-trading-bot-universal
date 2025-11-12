import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AuthForm from '@/components/AuthForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Компонент для быстрой настройки API ключей
const QuickApiSetup = () => {
  const { user } = useAuth();
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [keysInDb, setKeysInDb] = useState<any>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [apiKeys, setApiKeys] = useState({
    bybit: { api_key: '', api_secret: '', status: 'empty' },
    binance: { api_key: '', api_secret: '', status: 'empty' },
    gate: { api_key: '', api_secret: '', passphrase: '', status: 'empty' }
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const runDiagnosis = async () => {
    setLoading(prev => ({ ...prev, diagnose: true }));
    addLog('🔍 Запускаем диагностику API ключей...');
    
    try {
      const { data, error } = await supabase.functions.invoke('api_keys_diagnostics_2025_11_12_07_00', {
        body: { action: 'diagnose_keys' }
      });

      if (error) {
        console.error('❌ Ошибка диагностики:', error);
        throw error;
      }

      console.log('✅ Диагностика завершена:', data);
      setDiagnosis(data.diagnosis);
      
      addLog(`✅ Диагностика: найдено ${data.diagnosis.total_keys} ключей`);
      addLog(`⚠️ Проблем: ${data.diagnosis.issues.length}`);
      
      // Обновляем статусы ключей
      const newApiKeys = { ...apiKeys };
      Object.keys(data.diagnosis.keys_by_exchange).forEach(exchange => {
        const keyData = data.diagnosis.keys_by_exchange[exchange];
        if (newApiKeys[exchange as keyof typeof newApiKeys]) {
          newApiKeys[exchange as keyof typeof newApiKeys].status = keyData.is_placeholder ? 'placeholder' : 'configured';
        }
      });
      setApiKeys(newApiKeys);
      
    } catch (error: any) {
      console.error('❌ Ошибка диагностики:', error);
      addLog(`❌ Ошибка диагностики: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, diagnose: false }));
    }
  };

  const showKeysInDb = async () => {
    setLoading(prev => ({ ...prev, show_keys: true }));
    addLog('📋 Показываем ключи в базе данных...');
    
    try {
      const { data, error } = await supabase.functions.invoke('simple_keys_manager_2025_11_12_07_30', {
        body: { action: 'show_keys' }
      });

      if (error) {
        console.error('❌ Ошибка показа ключей:', error);
        throw error;
      }

      console.log('✅ Ключи получены:', data);
      setKeysInDb(data.result);
      
      addLog(`✅ В базе данных: ${data.result.total_keys} ключей`);
      
      if (data.result.keys.length > 0) {
        data.result.keys.forEach((key: any) => {
          addLog(`📋 ${key.exchange}: ${key.api_key_preview} (${key.api_key_length} символов) ${key.is_placeholder ? '🟡 ТЕСТОВЫЙ' : '✅ РЕАЛЬНЫЙ'}`);
        });
      } else {
        addLog('📋 Ключи в базе данных не найдены');
      }
      
    } catch (error: any) {
      console.error('❌ Ошибка показа ключей:', error);
      addLog(`❌ Ошибка показа ключей: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, show_keys: false }));
    }
  };

  const addTestKey = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`test_${exchange}`]: true }));
    addLog(`➕ Добавляем тестовый ключ для ${exchange}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('simple_keys_manager_2025_11_12_07_30', {
        body: { 
          action: 'add_test_key',
          exchange: exchange
        }
      });

      if (error) throw error;

      addLog(`✅ Тестовый ключ для ${exchange} добавлен`);
      
      // Обновляем отображение
      setTimeout(() => {
        showKeysInDb();
        runDiagnosis();
      }, 500);
      
    } catch (error: any) {
      addLog(`❌ Ошибка добавления тестового ключа ${exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [`test_${exchange}`]: false }));
    }
  };

  const saveApiKey = async (exchange: string) => {
    const keyData = apiKeys[exchange as keyof typeof apiKeys];
    
    if (!keyData.api_key || !keyData.api_secret) {
      addLog(`❌ ${exchange}: Заполните API ключ и секрет`);
      return;
    }

    if (exchange === 'gate' && !keyData.passphrase) {
      addLog(`❌ Gate.io: Требуется passphrase`);
      return;
    }

    setLoading(prev => ({ ...prev, [`save_${exchange}`]: true }));
    addLog(`💾 Сохраняем ключи для ${exchange}...`);
    
    try {
      // Прямое обновление в базе данных
      const { error } = await supabase
        .from('api_keys_new')
        .upsert({
          user_id: user?.id,
          exchange: exchange,
          api_key: keyData.api_key,
          api_secret: keyData.api_secret,
          passphrase: keyData.passphrase || null
        }, {
          onConflict: 'user_id,exchange'
        });

      if (error) {
        throw new Error(`Ошибка сохранения: ${error.message}`);
      }

      addLog(`✅ ${exchange}: API ключи сохранены`);
      
      // Обновляем статус
      setApiKeys(prev => ({
        ...prev,
        [exchange]: { ...prev[exchange as keyof typeof prev], status: 'configured' }
      }));
      
      // Обновляем отображение
      setTimeout(() => {
        showKeysInDb();
        runDiagnosis();
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Ошибка сохранения:', error);
      addLog(`❌ ${exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [`save_${exchange}`]: false }));
    }
  };

  const clearAllKeys = async () => {
    if (!confirm('Удалить все API ключи?')) return;

    setLoading(prev => ({ ...prev, clear: true }));
    addLog('🗑️ Удаляем все API ключи...');
    
    try {
      const { data, error } = await supabase.functions.invoke('simple_keys_manager_2025_11_12_07_30', {
        body: { action: 'clear_all' }
      });

      if (error) throw error;

      addLog('✅ Все API ключи удалены');
      setDiagnosis(null);
      setKeysInDb(null);
      setApiKeys({
        bybit: { api_key: '', api_secret: '', status: 'empty' },
        binance: { api_key: '', api_secret: '', status: 'empty' },
        gate: { api_key: '', api_secret: '', passphrase: '', status: 'empty' }
      });
      
    } catch (error: any) {
      addLog(`❌ Ошибка удаления: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, clear: false }));
    }
  };

  const testConnection = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`test_${exchange}`]: true }));
    addLog(`🧪 Тестируем подключение к ${exchange}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('api_keys_diagnostics_2025_11_12_07_00', {
        body: { 
          action: 'test_connection',
          exchange: exchange
        }
      });

      if (error) {
        console.error('❌ Ошибка тестирования:', error);
        throw error;
      }

      console.log('✅ Тест завершен:', data);
      
      if (data.success) {
        addLog(`✅ ${exchange}: Подключение успешно`);
        if (data.test_result.balance_test) {
          addLog(`💰 ${exchange}: Баланс доступен`);
        }
      } else {
        addLog(`❌ ${exchange}: ${data.test_result.error}`);
      }
      
    } catch (error: any) {
      console.error('❌ Ошибка тестирования:', error);
      addLog(`❌ Тест ${exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [`test_${exchange}`]: false }));
    }
  };

  const testTradingFunctions = async () => {
    addLog('🚀 Тестируем торговые функции...');
    
    try {
      // Тестируем проверку баланса
      const { data: balanceData, error: balanceError } = await supabase.functions.invoke('hybrid_trading_engine_2025_11_12_06_50', {
        body: { 
          action: 'check_balance', 
          exchange: 'bybit'
        }
      });

      if (balanceData?.success) {
        addLog(`✅ Баланс Bybit: ${balanceData.balance?.total_usdt?.toFixed(2)} USDT`);
      } else {
        addLog(`⚠️ Баланс Bybit: ${balanceData?.error || 'Неизвестная ошибка'}`);
      }

      // Тестируем размещение тестового ордера
      const { data: orderData, error: orderError } = await supabase.functions.invoke('hybrid_trading_engine_2025_11_12_06_50', {
        body: { 
          action: 'place_test_order', 
          exchange: 'bybit',
          symbol: 'BTCUSDT',
          side: 'Buy',
          quantity: '0.001',
          price: '30000'
        }
      });

      if (orderData?.success) {
        addLog(`✅ Тестовый ордер Bybit: ${orderData.order?.orderId}`);
      } else {
        addLog(`⚠️ Тестовый ордер Bybit: ${orderData?.error || 'Неизвестная ошибка'}`);
      }

      addLog('🎯 Торговые функции протестированы!');
      
    } catch (error: any) {
      addLog(`❌ Ошибка торговых функций: ${error.message}`);
    }
  };

  // Автоматическая диагностика при загрузке
  useEffect(() => {
    runDiagnosis();
    showKeysInDb();
  }, []);

  const exchanges = [
    { 
      id: 'bybit', 
      name: 'Bybit', 
      icon: '🟡', 
      color: 'bg-yellow-600',
      requirements: 'API Key: 18+ символов, Secret: 64 символа'
    },
    { 
      id: 'binance', 
      name: 'Binance', 
      icon: '🟨', 
      color: 'bg-orange-600',
      requirements: 'API Key: 64 символа, Secret: 64 символа'
    },
    { 
      id: 'gate', 
      name: 'Gate.io', 
      icon: '🟦', 
      color: 'bg-blue-600',
      requirements: 'API Key + Secret + Passphrase (обязательно!)'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured':
        return <Badge className="bg-green-600">✅ Настроен</Badge>;
      case 'placeholder':
        return <Badge variant="secondary">🟡 Тестовый</Badge>;
      default:
        return <Badge variant="destructive">❌ Не настроен</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Заголовок */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-center">
              🔑 Управление API Ключами
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-300 mb-4">
              Добавьте реальные API ключи или протестируйте с тестовыми
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button 
                onClick={runDiagnosis} 
                disabled={loading.diagnose}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading.diagnose ? '🔄' : '🔍'} Диагностика
              </Button>
              <Button 
                onClick={showKeysInDb}
                disabled={loading.show_keys}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading.show_keys ? '🔄' : '📋'} Ключи в БД
              </Button>
              <Button 
                onClick={testTradingFunctions}
                className="bg-green-600 hover:bg-green-700"
              >
                🚀 Тест торговли
              </Button>
              <Button 
                onClick={clearAllKeys} 
                disabled={loading.clear}
                variant="destructive"
              >
                {loading.clear ? '🔄' : '🗑️'} Очистить
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Диагностика */}
          {diagnosis && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">📊 Диагностика</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-700 p-3 rounded text-center">
                    <div className="text-xl font-bold text-blue-400">{diagnosis.total_keys}</div>
                    <div className="text-xs text-gray-300">Всего</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded text-center">
                    <div className="text-xl font-bold text-red-400">{diagnosis.issues.length}</div>
                    <div className="text-xs text-gray-300">Проблем</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded text-center">
                    <div className="text-xl font-bold text-green-400">
                      {Object.keys(diagnosis.keys_by_exchange).filter(k => !diagnosis.keys_by_exchange[k].is_placeholder).length}
                    </div>
                    <div className="text-xs text-gray-300">Реальных</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ключи в БД */}
          {keysInDb && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">📋 Ключи в БД</CardTitle>
              </CardHeader>
              <CardContent>
                {keysInDb.keys.length > 0 ? (
                  <div className="space-y-2">
                    {keysInDb.keys.map((key: any, index: number) => (
                      <div key={index} className="bg-gray-700 p-2 rounded text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">{key.exchange}</span>
                          <Badge variant={key.is_placeholder ? "secondary" : "default"}>
                            {key.is_placeholder ? "🟡 Тест" : "✅ Реал"}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-300">
                          Key: {key.api_key_preview} ({key.api_key_length})
                        </div>
                        <div className="text-xs text-gray-300">
                          Secret: {key.api_secret_preview} ({key.api_secret_length})
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center">Ключи не найдены</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Настройка ключей для каждой биржи */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exchanges.map(exchange => (
            <Card key={exchange.id} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>{exchange.icon} {exchange.name}</span>
                  {getStatusBadge(apiKeys[exchange.id as keyof typeof apiKeys].status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Требования */}
                <div className="bg-gray-700 p-3 rounded">
                  <h4 className="text-sm font-semibold mb-2">📋 Требования:</h4>
                  <p className="text-xs text-gray-300">{exchange.requirements}</p>
                </div>

                {/* Поля ввода */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-300 text-sm">API Key</Label>
                    <Input
                      value={apiKeys[exchange.id as keyof typeof apiKeys].api_key}
                      onChange={(e) => setApiKeys(prev => ({
                        ...prev,
                        [exchange.id]: { ...prev[exchange.id as keyof typeof prev], api_key: e.target.value }
                      }))}
                      className="bg-gray-700 border-gray-600 text-sm"
                      placeholder="Вставьте API ключ"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300 text-sm">API Secret</Label>
                    <Textarea
                      value={apiKeys[exchange.id as keyof typeof apiKeys].api_secret}
                      onChange={(e) => setApiKeys(prev => ({
                        ...prev,
                        [exchange.id]: { ...prev[exchange.id as keyof typeof prev], api_secret: e.target.value }
                      }))}
                      className="bg-gray-700 border-gray-600 text-sm"
                      placeholder="Вставьте API секрет"
                      rows={2}
                    />
                  </div>
                  
                  {exchange.id === 'gate' && (
                    <div>
                      <Label className="text-gray-300 text-sm">Passphrase</Label>
                      <Input
                        value={apiKeys.gate.passphrase}
                        onChange={(e) => setApiKeys(prev => ({
                          ...prev,
                          gate: { ...prev.gate, passphrase: e.target.value }
                        }))}
                        className="bg-gray-700 border-gray-600 text-sm"
                        placeholder="Passphrase для Gate.io"
                      />
                    </div>
                  )}
                </div>

                {/* Кнопки */}
                <div className="space-y-2">
                  <Button
                    onClick={() => saveApiKey(exchange.id)}
                    disabled={loading[`save_${exchange.id}`]}
                    className={`w-full ${exchange.color} hover:opacity-80`}
                  >
                    {loading[`save_${exchange.id}`] ? '🔄 Сохранение...' : '💾 Сохранить'}
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => addTestKey(exchange.id)}
                      disabled={loading[`test_${exchange.id}`]}
                      variant="outline"
                      className="border-gray-600 text-xs"
                    >
                      {loading[`test_${exchange.id}`] ? '🔄' : '➕ Тест'}
                    </Button>
                    
                    <Button
                      onClick={() => testConnection(exchange.id)}
                      disabled={loading[`test_${exchange.id}`]}
                      className="bg-green-600 hover:bg-green-700 text-xs"
                    >
                      🧪 Проверить
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
            <CardTitle className="text-white">📝 Логи Операций</CardTitle>
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
                <p className="text-gray-500 text-center">Логи операций появятся здесь...</p>
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

  return <QuickApiSetup />;
};

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
