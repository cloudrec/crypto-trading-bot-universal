import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DebugPanel = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const testBalance = async (exchange: string) => {
    setLoading(true);
    addLog(`🧪 Тестируем баланс ${exchange}...`);
    
    try {
      console.log(`Вызываем функцию для ${exchange}...`);
      
      const { data, error } = await supabase.functions.invoke('fixed_trading_engine_with_demo_2025_11_12_08_30', {
        body: { action: 'check_balance', exchange: exchange }
      });

      console.log(`Результат для ${exchange}:`, { data, error });

      if (error) {
        addLog(`❌ ${exchange}: ${error.message}`);
        console.error(`Ошибка ${exchange}:`, error);
      } else if (data) {
        if (data.success) {
          addLog(`✅ ${exchange}: ${data.balance.total_usdt?.toFixed(2)} USDT ${data.is_demo ? '(демо)' : ''}`);
        } else {
          addLog(`❌ ${exchange}: ${data.error}`);
        }
      } else {
        addLog(`⚠️ ${exchange}: Нет данных`);
      }
      
    } catch (error: any) {
      addLog(`💥 ${exchange}: ${error.message}`);
      console.error(`Критическая ошибка ${exchange}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const testAllBalances = async () => {
    const exchanges = ['bybit', 'binance', 'gate', 'kucoin', 'okx', 'mexc'];
    
    for (const exchange of exchanges) {
      await testBalance(exchange);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза между запросами
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700 mb-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>🔧 Панель отладки</span>
          <Badge variant="secondary">Debug Mode</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <Button 
            onClick={() => testBalance('bybit')} 
            disabled={loading}
            className="bg-yellow-600 hover:bg-yellow-700 text-xs"
          >
            🟡 Bybit
          </Button>
          <Button 
            onClick={() => testBalance('binance')} 
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-xs"
          >
            🟨 Binance
          </Button>
          <Button 
            onClick={() => testBalance('gate')} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-xs"
          >
            🟦 Gate.io
          </Button>
          <Button 
            onClick={() => testBalance('kucoin')} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-xs"
          >
            🟢 KuCoin
          </Button>
          <Button 
            onClick={() => testBalance('okx')} 
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-700 text-xs"
          >
            ⚫ OKX
          </Button>
          <Button 
            onClick={() => testBalance('mexc')} 
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-xs"
          >
            🔵 MEXC
          </Button>
        </div>

        <div className="flex space-x-2 mb-4">
          <Button 
            onClick={testAllBalances} 
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? '🔄 Тестируем...' : '🚀 Тест всех бирж'}
          </Button>
          <Button 
            onClick={() => setLogs([])} 
            variant="outline"
          >
            🗑️ Очистить
          </Button>
        </div>

        <div className="bg-gray-900 p-3 rounded max-h-48 overflow-y-auto">
          <div className="text-xs font-mono text-gray-300">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            ) : (
              <div className="text-gray-500">Логи отладки появятся здесь...</div>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          <div>Пользователь: {user?.email}</div>
          <div>ID: {user?.id?.substring(0, 8)}...</div>
          <div>Функция: fixed_trading_engine_with_demo_2025_11_12_08_30</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebugPanel;
