import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TradingTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    exchange: 'bybit',
    symbol: 'SUPERUSDT',
    side: 'Buy',
    leverage: '10',
    amount: '100'
  });

  const exchanges = [
    { id: 'bybit', name: 'Bybit', icon: '🟡' },
    { id: 'binance', name: 'Binance', icon: '🟨' },
    { id: 'gate', name: 'Gate.io', icon: '🟦' },
    { id: 'huobi', name: 'Huobi (HTX)', icon: '🔴' },
    { id: 'okx', name: 'OKX', icon: '⚫' },
    { id: 'bitget', name: 'Bitget', icon: '🟣' },
    { id: 'kucoin', name: 'KuCoin', icon: '🟢' },
    { id: 'mexc', name: 'MEXC', icon: '🔵' }
  ];

  const placeTestOrder = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('🚀 Отправляем запрос:', formData);
      
      const { data, error } = await supabase.functions.invoke('working_trading_2025_11_13_01_40', {
        body: formData
      });
      
      console.log('📡 Ответ получен:', { data, error });
      
      if (error) {
        throw error;
      }
      
      setResult(data);
      
    } catch (error) {
      console.error('❌ Ошибка:', error);
      setResult({
        success: false,
        message: `Ошибка: ${error.message}`,
        error: error.toString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white rounded-lg">
      <h1 className="text-3xl font-bold mb-6">🚀 Тест торговой системы</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">📝 Тестовый ордер</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Биржа:</label>
            <select 
              value={formData.exchange}
              onChange={(e) => handleInputChange('exchange', e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg"
            >
              {exchanges.map(exchange => (
                <option key={exchange.id} value={exchange.id}>
                  {exchange.icon} {exchange.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Символ:</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => handleInputChange('symbol', e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg"
              placeholder="BTCUSDT"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Сторона:</label>
            <select 
              value={formData.side}
              onChange={(e) => handleInputChange('side', e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg"
            >
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Плечо:</label>
            <input
              type="number"
              value={formData.leverage}
              onChange={(e) => handleInputChange('leverage', e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg"
              min="1"
              max="100"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Сумма (USDT):</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg"
              min="1"
              step="0.01"
            />
          </div>
        </div>
        
        <button
          onClick={placeTestOrder}
          disabled={loading}
          className="mt-6 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          {loading ? '⏳ Размещение...' : '📝 Разместить тестовый ордер'}
        </button>
      </div>
      
      {result && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">📊 Результат</h2>
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-900 border-l-4 border-green-500' : 'bg-red-900 border-l-4 border-red-500'}`}>
            <div className="font-semibold mb-2">
              {result.success ? '✅ УСПЕХ!' : '❌ ОШИБКА!'}
            </div>
            <div className="mb-2">{result.message}</div>
            {result.order && (
              <pre className="text-sm bg-gray-800 p-3 rounded mt-3 overflow-auto">
                {JSON.stringify(result.order, null, 2)}
              </pre>
            )}
            {result.error && (
              <pre className="text-sm bg-gray-800 p-3 rounded mt-3 overflow-auto">
                {JSON.stringify(result.error, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingTest;