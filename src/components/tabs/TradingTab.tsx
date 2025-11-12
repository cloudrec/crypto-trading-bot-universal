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
  const [orderForm, setOrderForm] = useState({
    exchange: 'bybit',
    symbol: 'BTCUSDT',
    side: 'Buy',
    quantity: '0.001',
    price: '30000'
  });
  const [tradingSettings, setTradingSettings] = useState({
    baseCurrency: 'BTC',
    quoteCurrency: 'USDT',
    maxOrderSize: '0.01',
    stopLoss: '2',
    takeProfit: '5',
    isActive: false
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

  const loadTradingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_settings_2025_11_12_05_30')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setTradingSettings({
          baseCurrency: data.base_currency || 'BTC',
          quoteCurrency: data.quote_currency || 'USDT',
          maxOrderSize: data.max_order_size?.toString() || '0.01',
          stopLoss: data.stop_loss?.toString() || '2',
          takeProfit: data.take_profit?.toString() || '5',
          isActive: data.is_active || false
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек торговли:', error);
    }
  };

  const saveTradingSettings = async () => {
    setLoading(prev => ({ ...prev, save_settings: true }));
    
    try {
      const { error } = await supabase
        .from('trading_settings_2025_11_12_05_30')
        .upsert({
          user_id: user?.id,
          base_currency: tradingSettings.baseCurrency,
          quote_currency: tradingSettings.quoteCurrency,
          max_order_size: parseFloat(tradingSettings.maxOrderSize),
          stop_loss: parseFloat(tradingSettings.stopLoss),
          take_profit: parseFloat(tradingSettings.takeProfit),
          is_active: tradingSettings.isActive
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Успех",
        description: "Настройки торговли сохранены",
      });

    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: `Ошибка сохранения настроек: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, save_settings: false }));
    }
  };

  const loadAllBalances = async () => {
    setLoading(prev => ({ ...prev, load_balances: true }));
    
    try {
      const balancePromises = exchanges.map(async (exchange) => {
        try {
          const { data, error } = await supabase.functions.invoke('improved_trading_engine_with_smart_demo_2025_11_12_09_00', {
            body: { action: 'check_balance', exchange: exchange.id }
          });

          if (data?.success) {
            return { [exchange.id]: data.balance };
          }
          return { [exchange.id]: null };
        } catch {
          return { [exchange.id]: null };
        }
      });

      const results = await Promise.all(balancePromises);
      const newBalances = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setBalances(newBalances);

    } catch (error: any) {
      console.error('Ошибка загрузки балансов:', error);
    } finally {
      setLoading(prev => ({ ...prev, load_balances: false }));
    }
  };

  const placeTestOrder = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`order_${exchange}`]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('improved_trading_engine_with_smart_demo_2025_11_12_09_00', {
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
        toast({
          title: "Успех",
          description: `Ордер ${exchange}: ${data.order.orderId} размещен`,
        });
      } else {
        toast({
          title: "Ошибка",
          description: `Ошибка ордера ${exchange}: ${data.error}`,
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: `Ошибка ордера ${exchange}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [`order_${exchange}`]: false }));
    }
  };

  const toggleBot = async () => {
    const newStatus = !tradingSettings.isActive;
    setTradingSettings(prev => ({ ...prev, isActive: newStatus }));
    
    try {
      await saveTradingSettings();
      
      toast({
        title: newStatus ? "Бот запущен" : "Бот остановлен",
        description: newStatus ? "Торговый бот активирован" : "Торговый бот остановлен",
      });

      // Отправляем Telegram уведомление
      await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { 
          action: 'send_telegram_notification',
          message: `🤖 Торговый бот ${newStatus ? '🟢 ЗАПУЩЕН' : '🔴 ОСТАНОВЛЕН'}\n\n📊 Настройки:\n💱 Пара: ${tradingSettings.baseCurrency}/${tradingSettings.quoteCurrency}\n📏 Макс. размер: ${tradingSettings.maxOrderSize}\n🛑 Stop Loss: ${tradingSettings.stopLoss}%\n🎯 Take Profit: ${tradingSettings.takeProfit}%\n⏰ ${new Date().toLocaleString('ru-RU')}`
        }
      });

    } catch (error: any) {
      console.error('Ошибка переключения бота:', error);
      // Возвращаем обратно при ошибке
      setTradingSettings(prev => ({ ...prev, isActive: !newStatus }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и статус */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>📊 Торговая Панель</span>
            <div className="flex items-center space-x-4">
              <Badge variant={tradingSettings.isActive ? "default" : "secondary"}>
                {tradingSettings.isActive ? "🟢 Активен" : "🔴 Остановлен"}
              </Badge>
              <Button
                onClick={toggleBot}
                className={tradingSettings.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              >
                {tradingSettings.isActive ? "🛑 Остановить бот" : "▶️ Запустить бот"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-xl font-bold text-blue-400">{exchanges.length}</div>
              <div className="text-xs text-gray-300">Бирж подключено</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-xl font-bold text-green-400">
                {Object.values(balances).filter(b => b && b.total_usdt > 0).length}
              </div>
              <div className="text-xs text-gray-300">С балансом</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-xl font-bold text-yellow-400">
                {tradingSettings.baseCurrency}/{tradingSettings.quoteCurrency}
              </div>
              <div className="text-xs text-gray-300">Торговая пара</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-xl font-bold text-purple-400">{tradingSettings.maxOrderSize}</div>
              <div className="text-xs text-gray-300">Макс. размер</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Настройки торговли */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">⚙️ Настройки торговли</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Базовая валюта</Label>
                <Input
                  value={tradingSettings.baseCurrency}
                  onChange={(e) => setTradingSettings(prev => ({ ...prev, baseCurrency: e.target.value }))}
                  className="bg-gray-700 border-gray-600"
                  placeholder="BTC"
                />
              </div>
              <div>
                <Label className="text-gray-300">Котируемая валюта</Label>
                <Input
                  value={tradingSettings.quoteCurrency}
                  onChange={(e) => setTradingSettings(prev => ({ ...prev, quoteCurrency: e.target.value }))}
                  className="bg-gray-700 border-gray-600"
                  placeholder="USDT"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Максимальный размер ордера</Label>
              <Input
                value={tradingSettings.maxOrderSize}
                onChange={(e) => setTradingSettings(prev => ({ ...prev, maxOrderSize: e.target.value }))}
                className="bg-gray-700 border-gray-600"
                placeholder="0.01"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Stop Loss (%)</Label>
                <Input
                  value={tradingSettings.stopLoss}
                  onChange={(e) => setTradingSettings(prev => ({ ...prev, stopLoss: e.target.value }))}
                  className="bg-gray-700 border-gray-600"
                  placeholder="2"
                />
              </div>
              <div>
                <Label className="text-gray-300">Take Profit (%)</Label>
                <Input
                  value={tradingSettings.takeProfit}
                  onChange={(e) => setTradingSettings(prev => ({ ...prev, takeProfit: e.target.value }))}
                  className="bg-gray-700 border-gray-600"
                  placeholder="5"
                />
              </div>
            </div>

            <Button
              onClick={saveTradingSettings}
              disabled={loading.save_settings}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading.save_settings ? '🔄 Сохранение...' : '💾 Сохранить настройки'}
            </Button>
          </CardContent>
        </Card>

        {/* Форма тестового ордера */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">📝 Тестовый ордер</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <Button
              onClick={() => placeTestOrder(orderForm.exchange)}
              disabled={loading[`order_${orderForm.exchange}`]}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading[`order_${orderForm.exchange}`] ? '🔄 Размещение...' : '📝 Разместить тестовый ордер'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Балансы всех бирж */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>💰 Балансы всех бирж</span>
            <Button
              onClick={loadAllBalances}
              disabled={loading.load_balances}
              variant="outline"
              size="sm"
            >
              {loading.load_balances ? '🔄' : '🔄'} Обновить все
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exchanges.map(exchange => (
              <div key={exchange.id} className="bg-gray-700 p-4 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{exchange.icon} {exchange.name}</span>
                  <Badge variant={balances[exchange.id] ? "default" : "secondary"}>
                    {balances[exchange.id] ? "✅" : "⏳"}
                  </Badge>
                </div>
                
                {balances[exchange.id] ? (
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
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-sm">
                    Нет данных
                  </div>
                )}

                <Button
                  onClick={() => placeTestOrder(exchange.id)}
                  disabled={loading[`order_${exchange.id}`]}
                  className={`w-full mt-3 ${exchange.color} hover:opacity-80`}
                  size="sm"
                >
                  {loading[`order_${exchange.id}`] ? '🔄' : '📝'} Тест ордер
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingTab;
