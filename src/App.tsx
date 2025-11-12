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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Полный торговый интерфейс
const FullTradingInterface = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('keys');
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [keysInDb, setKeysInDb] = useState<any>(null);
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [apiKeys, setApiKeys] = useState({
    bybit: { api_key: '', api_secret: '', status: 'empty' },
    binance: { api_key: '', api_secret: '', status: 'empty' },
    gate: { api_key: '', api_secret: '', passphrase: '', status: 'empty' }
  });
  const [orderForm, setOrderForm] = useState({
    exchange: 'bybit',
    symbol: 'BTCUSDT',
    side: 'Buy',
    quantity: '0.001',
    price: '30000'
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 29)]);
  };

  const runDiagnosis = async () => {
    setLoading(prev => ({ ...prev, diagnose: true }));
    addLog('🔍 Запускаем диагностику API ключей...');
    
    try {
      const { data, error } = await supabase.functions.invoke('api_keys_diagnostics_2025_11_12_07_00', {
        body: { action: 'diagnose_keys' }
      });

      if (error) throw error;

      setDiagnosis(data.diagnosis);
      addLog(`✅ Диагностика: найдено ${data.diagnosis.total_keys} ключей, проблем: ${data.diagnosis.issues.length}`);
      
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
      addLog(`❌ Ошибка диагностики: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, diagnose: false }));
    }
  };

  const showKeysInDb = async () => {
    setLoading(prev => ({ ...prev, show_keys: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('simple_keys_manager_2025_11_12_07_30', {
        body: { action: 'show_keys' }
      });

      if (error) throw error;

      setKeysInDb(data.result);
      addLog(`✅ В базе данных: ${data.result.total_keys} ключей`);
      
    } catch (error: any) {
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
        body: { action: 'add_test_key', exchange: exchange }
      });

      if (error) throw error;

      addLog(`✅ Тестовый ключ для ${exchange} добавлен`);
      setTimeout(() => { showKeysInDb(); runDiagnosis(); }, 500);
      
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

      if (error) throw new Error(`Ошибка сохранения: ${error.message}`);

      addLog(`✅ ${exchange}: API ключи сохранены`);
      setApiKeys(prev => ({
        ...prev,
        [exchange]: { ...prev[exchange as keyof typeof prev], status: 'configured' }
      }));
      
      setTimeout(() => { showKeysInDb(); runDiagnosis(); }, 500);
      
    } catch (error: any) {
      addLog(`❌ ${exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [`save_${exchange}`]: false }));
    }
  };

  const checkBalance = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`balance_${exchange}`]: true }));
    addLog(`💰 Проверяем баланс на ${exchange}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('hybrid_trading_engine_2025_11_12_06_50', {
        body: { action: 'check_balance', exchange: exchange }
      });

      if (error) throw error;

      if (data.success) {
        setBalances(prev => ({ ...prev, [exchange]: data.balance }));
        addLog(`✅ Баланс ${exchange}: ${data.balance.total_usdt?.toFixed(2)} USDT`);
      } else {
        addLog(`❌ Ошибка баланса ${exchange}: ${data.error}`);
      }
      
    } catch (error: any) {
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

      if (error) throw error;

      if (data.success) {
        addLog(`✅ Ордер ${exchange}: ${data.order.orderId} (${data.order.side} ${data.order.quantity} ${data.order.symbol})`);
      } else {
        addLog(`❌ Ошибка ордера ${exchange}: ${data.error}`);
      }
      
    } catch (error: any) {
      addLog(`❌ Ошибка ордера ${exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [`order_${exchange}`]: false }));
    }
  };

  const testConnection = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`test_${exchange}`]: true }));
    addLog(`🧪 Тестируем подключение к ${exchange}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('api_keys_diagnostics_2025_11_12_07_00', {
        body: { action: 'test_connection', exchange: exchange }
      });

      if (error) throw error;

      if (data.success) {
        addLog(`✅ ${exchange}: Подключение успешно`);
        if (data.test_result.balance_test) {
          addLog(`💰 ${exchange}: Баланс доступен`);
        }
      } else {
        addLog(`❌ ${exchange}: ${data.test_result.error}`);
      }
      
    } catch (error: any) {
      addLog(`❌ Тест ${exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [`test_${exchange}`]: false }));
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
      setBalances({});
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

  const sendTelegramNotification = async () => {
    addLog('📱 Отправляем Telegram уведомление...');
    
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { 
          action: 'send_telegram_notification',
          message: `🤖 Торговый бот активен!\n\n✅ API ключи настроены\n💰 Балансы проверены\n📝 Тестовые ордера работают\n⏰ ${new Date().toLocaleString('ru-RU')}`
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

  // Автоматическая загрузка при старте
  useEffect(() => {
    runDiagnosis();
    showKeysInDb();
  }, []);

  const exchanges = [
    { id: 'bybit', name: 'Bybit', icon: '🟡', color: 'bg-yellow-600' },
    { id: 'binance', name: 'Binance', icon: '🟨', color: 'bg-orange-600' },
    { id: 'gate', name: 'Gate.io', icon: '🟦', color: 'bg-blue-600' }
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
              🚀 Универсальный Торговый Бот
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-300 mb-4">
              Полнофункциональная торговая система с API ключами, балансами и тестовыми ордерами
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Button onClick={runDiagnosis} disabled={loading.diagnose} className="bg-blue-600 hover:bg-blue-700">
                {loading.diagnose ? '🔄' : '🔍'} Диагностика
              </Button>
              <Button onClick={showKeysInDb} disabled={loading.show_keys} className="bg-purple-600 hover:bg-purple-700">
                {loading.show_keys ? '🔄' : '📋'} Ключи в БД
              </Button>
              <Button onClick={sendTelegramNotification} className="bg-blue-500 hover:bg-blue-600">
                📱 Telegram
              </Button>
              <Button onClick={clearAllKeys} disabled={loading.clear} variant="destructive">
                {loading.clear ? '🔄' : '🗑️'} Очистить
              </Button>
              <Button onClick={() => window.location.reload()} className="bg-green-600 hover:bg-green-700">
                🔄 Перезагрузить
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Вкладки */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="keys" className="data-[state=active]:bg-gray-700">🔑 API Ключи</TabsTrigger>
            <TabsTrigger value="balances" className="data-[state=active]:bg-gray-700">💰 Балансы</TabsTrigger>
            <TabsTrigger value="trading" className="data-[state=active]:bg-gray-700">📝 Торговля</TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-gray-700">📝 Логи</TabsTrigger>
          </TabsList>

          {/* Вкладка API Ключи */}
          <TabsContent value="keys" className="space-y-6">
            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            {/* Настройка ключей */}
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
                          placeholder="API ключ"
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
                          placeholder="API секрет"
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
                            placeholder="Passphrase"
                          />
                        </div>
                      )}
                    </div>

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
          </TabsContent>

          {/* Вкладка Балансы */}
          <TabsContent value="balances" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {exchanges.map(exchange => (
                <Card key={exchange.id} className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>{exchange.icon} {exchange.name}</span>
                      <Badge variant={balances[exchange.id] ? "default" : "secondary"}>
                        {balances[exchange.id] ? "💰 Загружен" : "⏳ Нет данных"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
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
                          {balances[exchange.id].BTC && (
                            <div className="flex justify-between">
                              <span>BTC:</span>
                              <span className="font-mono">{balances[exchange.id].BTC?.total?.toFixed(8) || '0.00000000'}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold">
                            <span>Всего USD:</span>
                            <span className="font-mono">{balances[exchange.id].total_usdt?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      </div>
                    )}

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
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Вкладка Торговля */}
          <TabsContent value="trading" className="space-y-6">
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

            {/* Торговые кнопки */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {exchanges.map(exchange => (
                <Card key={exchange.id} className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">
                      {exchange.icon} {exchange.name} Торговля
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Вкладка Логи */}
          <TabsContent value="logs" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">📝 Логи Всех Операций</CardTitle>
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
          </TabsContent>
        </Tabs>
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

  return <FullTradingInterface />;
};

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
