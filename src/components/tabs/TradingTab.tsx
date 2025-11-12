import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const TradingTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [selectedExchange, setSelectedExchange] = useState('bybit');
  
  // Упрощенные настройки торговли
  const [tradingSettings, setTradingSettings] = useState<Record<string, any>>({
    bybit: {
      baseCurrency: 'BTC',
      quoteCurrency: 'USDT',
      orderAmount: '100',
      leverage: '1',
      side: 'Buy',
      stopLoss: '2',
      takeProfit: '5',
      isActive: false
    },
    binance: {
      baseCurrency: 'BTC',
      quoteCurrency: 'USDT',
      orderAmount: '100',
      leverage: '1',
      side: 'Buy',
      stopLoss: '2',
      takeProfit: '5',
      isActive: false
    },
    gate: {
      baseCurrency: 'BTC',
      quoteCurrency: 'USDT',
      orderAmount: '100',
      leverage: '1',
      side: 'Buy',
      stopLoss: '2',
      takeProfit: '5',
      isActive: false
    },
    kucoin: {
      baseCurrency: 'BTC',
      quoteCurrency: 'USDT',
      orderAmount: '100',
      leverage: '1',
      side: 'Buy',
      stopLoss: '2',
      takeProfit: '5',
      isActive: false
    },
    okx: {
      baseCurrency: 'BTC',
      quoteCurrency: 'USDT',
      orderAmount: '100',
      leverage: '1',
      side: 'Buy',
      stopLoss: '2',
      takeProfit: '5',
      isActive: false
    },
    mexc: {
      baseCurrency: 'BTC',
      quoteCurrency: 'USDT',
      orderAmount: '100',
      leverage: '1',
      side: 'Buy',
      stopLoss: '2',
      takeProfit: '5',
      isActive: false
    }
  });

  const [orderForm, setOrderForm] = useState({
    exchange: 'bybit',
    symbol: 'BTCUSDT',
    side: 'Buy',
    quantity: '0.001',
    price: '30000',
    stopLoss: '2',
    takeProfit: '5'
  });

  const exchanges = [
    { id: 'bybit', name: 'Bybit', icon: '🟡', color: 'bg-yellow-600' },
    { id: 'binance', name: 'Binance', icon: '🟨', color: 'bg-orange-600' },
    { id: 'gate', name: 'Gate.io', icon: '🟦', color: 'bg-blue-600' },
    { id: 'kucoin', name: 'KuCoin', icon: '🟢', color: 'bg-green-600' },
    { id: 'okx', name: 'OKX', icon: '⚫', color: 'bg-gray-600' },
    { id: 'mexc', name: 'MEXC', icon: '🔵', color: 'bg-indigo-600' }
  ];

  useEffect(() => {
    loadTradingSettings();
    loadAllBalances();
  }, []);

  // Загрузка настроек торговли для всех бирж
  const loadTradingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_settings_2025_11_12_05_30')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;

      console.log('🔍 Загруженные настройки из БД:', data);

      // Обновляем настройки для каждой биржи
      if (data && data.length > 0) {
        const newSettings = { ...tradingSettings };
        data.forEach(setting => {
          if (newSettings[setting.exchange]) {
            newSettings[setting.exchange] = {
              baseCurrency: setting.base_currency || 'BTC',
              quoteCurrency: setting.quote_currency || 'USDT',
              orderAmount: setting.order_amount || '100',
              leverage: setting.leverage || '1',
              side: setting.side || 'Buy',
              stopLoss: setting.stop_loss || '2',
              takeProfit: setting.take_profit || '5',
              isActive: setting.is_active || false
            };
          }
        });
        setTradingSettings(newSettings);
        console.log('✅ Обновленные настройки:', newSettings);
      }
    } catch (error: any) {
      console.error('❌ Ошибка загрузки настроек:', error);
    }
  };

  // УПРОЩЕННОЕ сохранение настроек - прямой INSERT/UPDATE
  const saveTradingSettings = async () => {
    setLoading(prev => ({ ...prev, save: true }));
    
    try {
      const currentSettings = tradingSettings[selectedExchange];
      
      console.log('💾 === НАЧАЛО СОХРАНЕНИЯ ===');
      console.log('Биржа:', selectedExchange);
      console.log('Stop Loss:', currentSettings?.stopLoss);
      console.log('Take Profit:', currentSettings?.takeProfit);
      console.log('Все настройки:', currentSettings);
      
      if (!currentSettings?.stopLoss || !currentSettings?.takeProfit) {
        console.error('❌ ОШИБКА: Stop Loss или Take Profit пустые!');
        toast({
          title: "Ошибка",
          description: "Пожалуйста, заполните Stop Loss и Take Profit",
          variant: "destructive",
        });
        return;
      }

      // Используем прямой upsert вместо RPC
      const { error } = await supabase
        .from('trading_settings_2025_11_12_05_30')
        .upsert({
          user_id: user?.id,
          exchange: selectedExchange,
          base_currency: currentSettings.baseCurrency,
          quote_currency: currentSettings.quoteCurrency,
          order_amount: currentSettings.orderAmount,
          leverage: currentSettings.leverage,
          side: currentSettings.side,
          stop_loss: currentSettings.stopLoss,
          take_profit: currentSettings.takeProfit,
          is_active: currentSettings.isActive,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,exchange'
        });

      if (error) {
        console.error('❌ Ошибка прямого upsert:', error);
        throw error;
      }

      console.log('✅ === УСПЕХ СОХРАНЕНИЯ ===');
      console.log('Сохранено Stop Loss:', currentSettings.stopLoss);
      console.log('Сохранено Take Profit:', currentSettings.takeProfit);

      toast({
        title: "Успех",
        description: `Настройки сохранены: Stop Loss ${currentSettings.stopLoss}%, Take Profit ${currentSettings.takeProfit}%`,
      });

      // Перезагружаем настройки для проверки
      setTimeout(() => {
        console.log('🔄 Перезагружаем настройки для проверки...');
        loadTradingSettings();
      }, 500);

    } catch (error: any) {
      console.error('❌ Ошибка сохранения:', error);
      toast({
        title: "Ошибка",
        description: `Ошибка сохранения: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, save: false }));
    }
  };

  // Загрузка балансов всех бирж
  const loadAllBalances = async () => {
    setLoading(prev => ({ ...prev, balances: true }));
    
    try {
      const newBalances: Record<string, any> = {};
      
      for (const exchange of exchanges) {
        try {
          const { data, error } = await supabase.functions.invoke('improved_trading_engine_with_smart_demo_2025_11_12_09_00', {
            body: { action: 'check_balance', exchange: exchange.id }
          });

          if (data && data.success) {
            newBalances[exchange.id] = data.balance;
          }
        } catch (error) {
          console.error(`Ошибка баланса ${exchange.id}:`, error);
        }
      }
      
      setBalances(newBalances);
    } catch (error: any) {
      console.error('Ошибка загрузки балансов:', error);
    } finally {
      setLoading(prev => ({ ...prev, balances: false }));
    }
  };

  // Размещение тестового ордера
  const placeTestOrder = async () => {
    setLoading(prev => ({ ...prev, order: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('improved_trading_engine_with_smart_demo_2025_11_12_09_00', {
        body: { 
          action: 'place_test_order', 
          exchange: orderForm.exchange,
          symbol: orderForm.symbol,
          side: orderForm.side,
          quantity: orderForm.quantity,
          price: orderForm.price,
          stopLoss: orderForm.stopLoss,
          takeProfit: orderForm.takeProfit
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Успех",
          description: `Тестовый ордер размещен на ${orderForm.exchange}: ${data.order.orderId}`,
        });
      } else {
        toast({
          title: "Ошибка",
          description: `Ошибка ордера: ${data.error}`,
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: `Ошибка размещения ордера: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, order: false }));
    }
  };

  // Переключение активности бота для выбранной биржи
  const toggleBot = async () => {
    const currentSettings = tradingSettings[selectedExchange];
    const newActiveState = !currentSettings.isActive;
    
    // Обновляем локальное состояние
    setTradingSettings(prev => ({
      ...prev,
      [selectedExchange]: {
        ...prev[selectedExchange],
        isActive: newActiveState
      }
    }));

    // Сохраняем в базу данных используя прямой upsert
    try {
      const { error } = await supabase
        .from('trading_settings_2025_11_12_05_30')
        .upsert({
          user_id: user?.id,
          exchange: selectedExchange,
          base_currency: currentSettings.baseCurrency,
          quote_currency: currentSettings.quoteCurrency,
          order_amount: currentSettings.orderAmount,
          leverage: currentSettings.leverage,
          side: currentSettings.side,
          stop_loss: currentSettings.stopLoss,
          take_profit: currentSettings.takeProfit,
          is_active: newActiveState,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,exchange'
        });

      if (error) throw error;

      // Отправляем Telegram уведомление
      try {
        const leverageAmount = parseFloat(currentSettings.orderAmount) * parseFloat(currentSettings.leverage);
        await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
          body: { 
            action: 'send_notification',
            message: `🤖 Торговый бот ${newActiveState ? 'ЗАПУЩЕН' : 'ОСТАНОВЛЕН'} на ${selectedExchange}\n\n📊 Параметры:\n• Пара: ${currentSettings.baseCurrency}/${currentSettings.quoteCurrency}\n• Сторона: ${currentSettings.side === 'Buy' ? '🟢 Покупка' : '🔴 Продажа'}\n• Сумма ордера: ${currentSettings.orderAmount} USDT\n• Плечо: x${currentSettings.leverage}\n• Эффективная сумма: ${leverageAmount.toFixed(2)} USDT\n• Stop Loss: ${currentSettings.stopLoss}%\n• Take Profit: ${currentSettings.takeProfit}%`
          }
        });
      } catch (telegramError) {
        console.error('Ошибка Telegram уведомления:', telegramError);
      }

      toast({
        title: newActiveState ? "Бот запущен" : "Бот остановлен",
        description: `Торговый бот ${newActiveState ? 'активирован' : 'деактивирован'} на ${selectedExchange}`,
      });

    } catch (error: any) {
      // Откатываем изменения при ошибке
      setTradingSettings(prev => ({
        ...prev,
        [selectedExchange]: {
          ...prev[selectedExchange],
          isActive: currentSettings.isActive
        }
      }));

      toast({
        title: "Ошибка",
        description: `Ошибка переключения бота: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // УПРОЩЕННОЕ обновление настроек
  const updateSetting = (key: string, value: string | boolean) => {
    console.log(`🔧 Обновляем ${key} = "${value}" для биржи ${selectedExchange}`);
    
    setTradingSettings(prev => {
      const newSettings = {
        ...prev,
        [selectedExchange]: {
          ...prev[selectedExchange],
          [key]: value
        }
      };
      console.log('📝 Новое значение:', newSettings[selectedExchange][key]);
      console.log('📋 Все настройки биржи:', newSettings[selectedExchange]);
      return newSettings;
    });
  };

  const currentSettings = tradingSettings[selectedExchange];
  const currentExchange = exchanges.find(ex => ex.id === selectedExchange);

  // Расчет эффективной суммы с плечом
  const effectiveAmount = parseFloat(currentSettings?.orderAmount || '100') * parseFloat(currentSettings?.leverage || '1');

  return (
    <div className="space-y-6">
      {/* Настройки торговли для выбранной биржи */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>⚙️ Настройки торговли</span>
            <Badge variant={currentSettings?.isActive ? "default" : "secondary"}>
              {currentSettings?.isActive ? "🟢 Активен" : "🔴 Остановлен"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Выбор биржи для настроек - ВЫПАДАЮЩИЙ СПИСОК */}
            <div>
              <Label className="text-gray-300">Выберите биржу для настройки</Label>
              <Select 
                value={selectedExchange} 
                onValueChange={(value) => setSelectedExchange(value)}
              >
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

            {/* Базовая валюта - ПОЛЕ ВВОДА */}
            <div>
              <Label className="text-gray-300">Базовая валюта</Label>
              <Input
                value={currentSettings?.baseCurrency || 'BTC'}
                onChange={(e) => updateSetting('baseCurrency', e.target.value.toUpperCase())}
                className="bg-gray-700 border-gray-600"
                placeholder="BTC"
              />
            </div>

            {/* Котируемая валюта */}
            <div>
              <Label className="text-gray-300">Котируемая валюта</Label>
              <Select 
                value={currentSettings?.quoteCurrency || 'USDT'} 
                onValueChange={(value) => updateSetting('quoteCurrency', value)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700">
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="BUSD">BUSD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Сторона - КАК В ТЕСТОВОМ ОРДЕРЕ */}
            <div>
              <Label className="text-gray-300">Сторона</Label>
              <Select 
                value={currentSettings?.side || 'Buy'} 
                onValueChange={(value) => updateSetting('side', value)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700">
                  <SelectItem value="Buy">🟢 Покупка</SelectItem>
                  <SelectItem value="Sell">🔴 Продажа</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Сумма ордера */}
            <div>
              <Label className="text-gray-300">Сумма ордера (USDT)</Label>
              <Input
                value={currentSettings?.orderAmount || '100'}
                onChange={(e) => updateSetting('orderAmount', e.target.value)}
                className="bg-gray-700 border-gray-600"
                placeholder="100"
              />
            </div>

            {/* Плечо */}
            <div>
              <Label className="text-gray-300">Плечо (x)</Label>
              <Select 
                value={currentSettings?.leverage || '1'} 
                onValueChange={(value) => updateSetting('leverage', value)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700">
                  <SelectItem value="1">x1 (без плеча)</SelectItem>
                  <SelectItem value="2">x2</SelectItem>
                  <SelectItem value="3">x3</SelectItem>
                  <SelectItem value="5">x5</SelectItem>
                  <SelectItem value="10">x10</SelectItem>
                  <SelectItem value="20">x20</SelectItem>
                  <SelectItem value="50">x50</SelectItem>
                  <SelectItem value="100">x100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stop Loss - УПРОЩЕННОЕ ПОЛЕ */}
            <div>
              <Label className="text-gray-300">Stop Loss (%)</Label>
              <Input
                value={currentSettings?.stopLoss || ''}
                onChange={(e) => {
                  console.log('🔴 Stop Loss изменен на:', e.target.value);
                  updateSetting('stopLoss', e.target.value);
                }}
                className="bg-gray-700 border-gray-600"
                placeholder="Введите Stop Loss"
              />
              <div className="text-xs text-gray-400 mt-1">
                Текущее значение: {currentSettings?.stopLoss || 'не задано'}
              </div>
            </div>

            {/* Take Profit - УПРОЩЕННОЕ ПОЛЕ */}
            <div>
              <Label className="text-gray-300">Take Profit (%)</Label>
              <Input
                value={currentSettings?.takeProfit || ''}
                onChange={(e) => {
                  console.log('🟢 Take Profit изменен на:', e.target.value);
                  updateSetting('takeProfit', e.target.value);
                }}
                className="bg-gray-700 border-gray-600"
                placeholder="Введите Take Profit"
              />
              <div className="text-xs text-gray-400 mt-1">
                Текущее значение: {currentSettings?.takeProfit || 'не задано'}
              </div>
            </div>
          </div>

          {/* Расчет эффективной суммы */}
          <div className="bg-gray-700 p-4 rounded">
            <h4 className="text-white font-semibold mb-2">💰 Расчет позиции:</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <div className="text-gray-300">Сторона:</div>
                <div className={`font-mono ${currentSettings?.side === 'Buy' ? 'text-green-400' : 'text-red-400'}`}>
                  {currentSettings?.side === 'Buy' ? '🟢 Покупка' : '🔴 Продажа'}
                </div>
              </div>
              <div>
                <div className="text-gray-300">Сумма ордера:</div>
                <div className="text-white font-mono">{currentSettings?.orderAmount || '100'} USDT</div>
              </div>
              <div>
                <div className="text-gray-300">Плечо:</div>
                <div className="text-yellow-400 font-mono">x{currentSettings?.leverage || '1'}</div>
              </div>
              <div>
                <div className="text-gray-300">Эффективная сумма:</div>
                <div className="text-green-400 font-mono font-bold">{effectiveAmount.toFixed(2)} USDT</div>
              </div>
              <div>
                <div className="text-gray-300">Торговая пара:</div>
                <div className="text-blue-400 font-mono">{currentSettings?.baseCurrency || 'BTC'}/{currentSettings?.quoteCurrency || 'USDT'}</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-300">Stop Loss:</div>
                <div className="text-red-400 font-mono">{currentSettings?.stopLoss || 'не задано'}%</div>
              </div>
              <div>
                <div className="text-gray-300">Take Profit:</div>
                <div className="text-green-400 font-mono">{currentSettings?.takeProfit || 'не задано'}%</div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={saveTradingSettings}
              disabled={loading.save}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading.save ? '🔄 Сохранение...' : '💾 Сохранить настройки'}
            </Button>

            <Button
              onClick={toggleBot}
              className={currentSettings?.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {currentSettings?.isActive ? "🛑 Остановить бота" : "▶️ Запустить бота"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Баланс выбранной биржи */}
      {balances[selectedExchange] && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">💰 Баланс - {currentExchange?.icon} {currentExchange?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 p-3 rounded text-center">
                <div className="text-xl font-bold text-green-400">
                  {balances[selectedExchange].USDT?.total?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs text-gray-300">USDT Всего</div>
              </div>
              <div className="bg-gray-700 p-3 rounded text-center">
                <div className="text-xl font-bold text-blue-400">
                  {balances[selectedExchange].USDT?.available?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs text-gray-300">USDT Доступно</div>
              </div>
              <div className="bg-gray-700 p-3 rounded text-center">
                <div className="text-xl font-bold text-yellow-400">
                  {balances[selectedExchange].BTC?.total?.toFixed(6) || '0.000000'}
                </div>
                <div className="text-xs text-gray-300">BTC Всего</div>
              </div>
              <div className="bg-gray-700 p-3 rounded text-center">
                <div className="text-xl font-bold text-purple-400">
                  {balances[selectedExchange].total_usdt?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs text-gray-300">Общий USDT</div>
              </div>
            </div>
            {balances[selectedExchange].is_demo && (
              <div className="mt-2 text-center">
                <Badge variant="secondary">🧪 Демо данные</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Тестовый ордер */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">📝 Тестовый ордер</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Выбор биржи для ордера */}
            <div>
              <Label className="text-gray-300">Биржа</Label>
              <Select 
                value={orderForm.exchange} 
                onValueChange={(value) => setOrderForm(prev => ({ ...prev, exchange: value }))}
              >
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
              <Label className="text-gray-300">Торговая пара</Label>
              <Input
                value={orderForm.symbol}
                onChange={(e) => setOrderForm(prev => ({ ...prev, symbol: e.target.value }))}
                className="bg-gray-700 border-gray-600"
                placeholder="BTCUSDT"
              />
            </div>

            <div>
              <Label className="text-gray-300">Сторона</Label>
              <Select 
                value={orderForm.side} 
                onValueChange={(value) => setOrderForm(prev => ({ ...prev, side: value }))}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700">
                  <SelectItem value="Buy">🟢 Покупка</SelectItem>
                  <SelectItem value="Sell">🔴 Продажа</SelectItem>
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

            {/* Stop Loss для тестового ордера */}
            <div>
              <Label className="text-gray-300">Stop Loss (%)</Label>
              <Input
                value={orderForm.stopLoss}
                onChange={(e) => setOrderForm(prev => ({ ...prev, stopLoss: e.target.value }))}
                className="bg-gray-700 border-gray-600"
                placeholder="Введите Stop Loss"
              />
            </div>

            {/* Take Profit для тестового ордера */}
            <div>
              <Label className="text-gray-300">Take Profit (%)</Label>
              <Input
                value={orderForm.takeProfit}
                onChange={(e) => setOrderForm(prev => ({ ...prev, takeProfit: e.target.value }))}
                className="bg-gray-700 border-gray-600"
                placeholder="Введите Take Profit"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={placeTestOrder}
              disabled={loading.order}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading.order ? '🔄 Размещение...' : '📝 Разместить тестовый ордер'}
            </Button>

            <Button
              onClick={loadAllBalances}
              disabled={loading.balances}
              variant="outline"
            >
              {loading.balances ? '🔄' : '🔄'} Обновить балансы
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingTab;