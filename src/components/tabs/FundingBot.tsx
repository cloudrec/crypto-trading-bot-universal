import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  Play, 
  Square, 
  RefreshCw,
  DollarSign,
  Clock,
  Settings,
  TestTube,
  X,
  Power,
  TrendingDown,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface FundingPosition {
  id: string;
  exchange: string;
  symbol: string;
  side: string;
  size: number;
  entry_price: number;
  leverage: number;
  funding_received: number;
  unrealized_pnl: number;
  status: string;
  opened_at: string;
  next_funding_time: string;
}

interface FundingRate {
  exchange: string;
  symbol: string;
  funding_rate: number;
  next_funding_time: string;
  mark_price: number;
}

const FundingBot = () => {
  const { user } = useAuth();
  const [positions, setPositions] = useState<FundingPosition[]>([]);
  const [fundingRates, setFundingRates] = useState<FundingRate[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [botRunning, setBotRunning] = useState(false);

  // Настройки бота
  const [settings, setSettings] = useState({
    exchange: 'bybit',
    symbol: 'BTCUSDT',
    order_amount_usd: 100,
    leverage: 1,
    take_profit_percent: 0.5,
    stop_loss_percent: 1.0,
    delay_ms: 5000,
    order_timeout_minutes: 60,
    telegram_enabled: false
  });

  // Загрузка данных при монтировании
  useEffect(() => {
    loadFundingData();
    loadSettings();
    const interval = setInterval(loadFundingData, 30000); // Обновляем каждые 30 секунд
    return () => clearInterval(interval);
  }, []);

  const loadFundingData = async () => {
    try {
      // Загружаем позиции
      const { data: positionsData, error: posError } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { action: 'get_funding_positions' }
      });

      if (posError) throw posError;
      if (positionsData.success) {
        setPositions(positionsData.positions);
      }

      // Загружаем ставки фандинга
      const { data: ratesData, error: ratesError } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { action: 'check_funding_rates', exchange: settings.exchange }
      });

      if (ratesError) throw ratesError;
      if (ratesData.success) {
        setFundingRates(ratesData.funding_rates);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных фандинга:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { action: 'get_funding_settings' }
      });

      if (error) throw error;
      if (data.success && data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { action: 'update_funding_settings', ...settings }
      });

      if (error) throw error;
      
      toast({
        title: "✅ Настройки сохранены",
        description: "Настройки фандинг-бота обновлены",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startFundingBot = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { action: 'start_funding_bot', ...settings }
      });

      if (error) throw error;

      if (data.success) {
        setBotRunning(true);
        toast({
          title: "🤖 Фандинг-бот запущен",
          description: data.message,
        });
        await loadFundingData();
      }
    } catch (error: any) {
      toast({
        title: "Ошибка запуска",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const stopFundingBot = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { action: 'stop_funding_bot' }
      });

      if (error) throw error;

      setBotRunning(false);
      toast({
        title: "⏹️ Фандинг-бот остановлен",
        description: "Бот успешно остановлен",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка остановки",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const checkBalance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { action: 'check_balance', exchange: settings.exchange }
      });

      if (error) throw error;

      if (data.success) {
        setBalance(data.balance);
        toast({
          title: "💰 Баланс обновлен",
          description: `${settings.exchange.toUpperCase()}: $${data.balance.USDT.available.toFixed(2)} доступно`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка проверки баланса",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { action: 'test_order_without_funding', ...settings }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "🧪 Тестовый ордер размещен",
          description: "Ордер успешно размещен в тестовом режиме",
        });
        await loadFundingData();
      }
    } catch (error: any) {
      toast({
        title: "Ошибка тестового ордера",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelAllOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { action: 'cancel_all_orders', exchange: settings.exchange }
      });

      if (error) throw error;

      toast({
        title: "❌ Ордера отменены",
        description: `Все ордера на ${settings.exchange.toUpperCase()} отменены`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка отмены ордеров",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const closeAllPositions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { action: 'close_all_positions', exchange: settings.exchange }
      });

      if (error) throw error;

      toast({
        title: "🔒 Позиции закрыты",
        description: `Все позиции на ${settings.exchange.toUpperCase()} закрыты`,
      });
      await loadFundingData();
    } catch (error: any) {
      toast({
        title: "Ошибка закрытия позиций",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNextFundingTime = () => {
    if (fundingRates.length > 0) {
      return new Date(fundingRates[0].next_funding_time);
    }
    
    const now = new Date();
    const currentHour = now.getUTCHours();
    const fundingHours = [0, 8, 16];
    let nextHour = fundingHours.find(hour => hour > currentHour) || fundingHours[0];
    
    const nextFunding = new Date(now);
    nextFunding.setUTCHours(nextHour, 0, 0, 0);
    
    if (nextHour <= currentHour) {
      nextFunding.setUTCDate(nextFunding.getUTCDate() + 1);
    }
    
    return nextFunding;
  };

  const getTimeToFunding = () => {
    const nextFunding = getNextFundingTime();
    const now = new Date();
    const diff = nextFunding.getTime() - now.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}ч ${minutes}м`;
  };

  return (
    <div className="space-y-6">
      {/* Управление ботом */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Power className="h-5 w-5 mr-2" />
            🤖 Фандинг-Арбитраж Бот
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Статус и управление */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Статус бота:</span>
                <Badge variant={botRunning ? "default" : "secondary"}>
                  {botRunning ? "🟢 Активен" : "🔴 Остановлен"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Следующий фандинг:</span>
                <span className="text-white font-mono text-sm">
                  {getTimeToFunding()}
                </span>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={botRunning ? stopFundingBot : startFundingBot}
                  disabled={loading}
                  className={botRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                >
                  {botRunning ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Остановить
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Запустить
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={checkBalance}
                  disabled={loading}
                  variant="outline"
                  className="border-gray-600"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Баланс
                </Button>
              </div>
            </div>

            {/* Баланс */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">💰 Баланс</h3>
              {balance ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Доступно USDT:</span>
                    <span className="text-green-400 font-mono">${balance.USDT.available.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">В позициях:</span>
                    <span className="text-yellow-400 font-mono">${balance.positions_value.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Нереализованный PnL:</span>
                    <span className={`font-mono ${balance.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${balance.unrealized_pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Нажмите "Баланс" для проверки</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Настройки бота */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            ⚙️ Настройки Бота
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-300">Биржа</Label>
              <Select value={settings.exchange} onValueChange={(value) => setSettings(prev => ({ ...prev, exchange: value }))}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700">
                  <SelectItem value="bybit">Bybit</SelectItem>
                  <SelectItem value="binance">Binance</SelectItem>
                  <SelectItem value="gate">Gate.io</SelectItem>
                  <SelectItem value="kucoin">KuCoin</SelectItem>
                  <SelectItem value="okx">OKX</SelectItem>
                  <SelectItem value="mexc">MEXC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Символ</Label>
              <Select value={settings.symbol} onValueChange={(value) => setSettings(prev => ({ ...prev, symbol: value }))}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700">
                  <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                  <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                  <SelectItem value="BNBUSDT">BNBUSDT</SelectItem>
                  <SelectItem value="ADAUSDT">ADAUSDT</SelectItem>
                  <SelectItem value="DOTUSDT">DOTUSDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Сумма ордера (USD)</Label>
              <Input
                type="number"
                value={settings.order_amount_usd}
                onChange={(e) => setSettings(prev => ({ ...prev, order_amount_usd: Number(e.target.value) }))}
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div>
              <Label className="text-gray-300">Плечо</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={settings.leverage}
                onChange={(e) => setSettings(prev => ({ ...prev, leverage: Number(e.target.value) }))}
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div>
              <Label className="text-gray-300">Take Profit (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.take_profit_percent}
                onChange={(e) => setSettings(prev => ({ ...prev, take_profit_percent: Number(e.target.value) }))}
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div>
              <Label className="text-gray-300">Stop Loss (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.stop_loss_percent}
                onChange={(e) => setSettings(prev => ({ ...prev, stop_loss_percent: Number(e.target.value) }))}
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div>
              <Label className="text-gray-300">Задержка (мс)</Label>
              <Input
                type="number"
                value={settings.delay_ms}
                onChange={(e) => setSettings(prev => ({ ...prev, delay_ms: Number(e.target.value) }))}
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div>
              <Label className="text-gray-300">Таймаут ордера (мин)</Label>
              <Input
                type="number"
                value={settings.order_timeout_minutes}
                onChange={(e) => setSettings(prev => ({ ...prev, order_timeout_minutes: Number(e.target.value) }))}
                className="bg-gray-700 border-gray-600"
              />
            </div>
          </div>

          <div className="flex space-x-2 mt-4">
            <Button onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700">
              <Settings className="h-4 w-4 mr-2" />
              Сохранить настройки
            </Button>
            
            <Button onClick={testOrder} disabled={loading} variant="outline" className="border-gray-600">
              <TestTube className="h-4 w-4 mr-2" />
              Тестовый ордер
            </Button>
            
            <Button onClick={cancelAllOrders} disabled={loading} variant="destructive">
              <X className="h-4 w-4 mr-2" />
              Отменить ордера
            </Button>
            
            <Button onClick={closeAllPositions} disabled={loading} variant="destructive">
              <Power className="h-4 w-4 mr-2" />
              Закрыть позиции
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ставки фандинга */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">📊 Ставки Фандинга</CardTitle>
        </CardHeader>
        <CardContent>
          {fundingRates.length > 0 ? (
            <div className="space-y-3">
              {fundingRates.map((rate, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Badge className="bg-blue-600">{rate.exchange.toUpperCase()}</Badge>
                    <span className="text-white font-semibold">{rate.symbol}</span>
                    <span className="text-gray-400">${rate.mark_price.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${rate.funding_rate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {rate.funding_rate >= 0 ? '+' : ''}{(rate.funding_rate * 100).toFixed(4)}%
                      </div>
                      <div className="text-xs text-gray-400">фандинг</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-300">
                        {new Date(rate.next_funding_time).toLocaleTimeString('ru-RU')}
                      </div>
                      <div className="text-xs text-gray-400">следующий</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">Нет данных о ставках фандинга</p>
          )}
        </CardContent>
      </Card>

      {/* Активные позиции */}
      {positions.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">📈 Активные Фандинг-Позиции</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {positions.map((position) => (
                <div key={position.id} className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-purple-600">{position.exchange.toUpperCase()}</Badge>
                      <span className="text-white font-semibold">{position.symbol}</span>
                      <Badge variant={position.side === 'short' ? 'destructive' : 'default'}>
                        {position.side === 'short' ? (
                          <>
                            <TrendingDown className="h-3 w-3 mr-1" />
                            SHORT
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            LONG
                          </>
                        )}
                      </Badge>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-bold ${position.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {position.unrealized_pnl >= 0 ? '+' : ''}${position.unrealized_pnl.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">PnL</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Размер:</span>
                      <div className="text-white font-mono">{position.size.toFixed(4)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Цена входа:</span>
                      <div className="text-white font-mono">${position.entry_price.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Плечо:</span>
                      <div className="text-white font-mono">{position.leverage}x</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Фандинг получен:</span>
                      <div className="text-green-400 font-mono">+${position.funding_received.toFixed(4)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FundingBot;
