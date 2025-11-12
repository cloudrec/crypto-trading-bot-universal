import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import DebugPanel from '@/components/DebugPanel';

interface ApiKeysManagerProps {
  onKeysUpdate?: () => void;
}

const ApiKeysManager: React.FC<ApiKeysManagerProps> = ({ onKeysUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [keysInDb, setKeysInDb] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [apiKeys, setApiKeys] = useState({
    bybit: { api_key: '', api_secret: '', status: 'empty' },
    binance: { api_key: '', api_secret: '', status: 'empty' },
    gate: { api_key: '', api_secret: '', passphrase: '', status: 'empty' },
    kucoin: { api_key: '', api_secret: '', passphrase: '', status: 'empty' },
    okx: { api_key: '', api_secret: '', passphrase: '', status: 'empty' },
    mexc: { api_key: '', api_secret: '', status: 'empty' }
  });

  const exchanges = [
    { 
      id: 'bybit', 
      name: 'Bybit', 
      icon: '🟡', 
      color: 'bg-yellow-600',
      requirements: 'API Key: 18+ символов, Secret: 64 символа',
      needsPassphrase: false
    },
    { 
      id: 'binance', 
      name: 'Binance', 
      icon: '🟨', 
      color: 'bg-orange-600',
      requirements: 'API Key: 64 символа, Secret: 64 символа',
      needsPassphrase: false
    },
    { 
      id: 'gate', 
      name: 'Gate.io', 
      icon: '🟦', 
      color: 'bg-blue-600',
      requirements: 'API Key + Secret + Passphrase (обязательно!)',
      needsPassphrase: true
    },
    { 
      id: 'kucoin', 
      name: 'KuCoin', 
      icon: '🟢', 
      color: 'bg-green-600',
      requirements: 'API Key + Secret + Passphrase (обязательно!)',
      needsPassphrase: true
    },
    { 
      id: 'okx', 
      name: 'OKX', 
      icon: '⚫', 
      color: 'bg-gray-600',
      requirements: 'API Key + Secret + Passphrase (обязательно!)',
      needsPassphrase: true
    },
    { 
      id: 'mexc', 
      name: 'MEXC', 
      icon: '🔵', 
      color: 'bg-indigo-600',
      requirements: 'API Key: 64 символа, Secret: 64 символа',
      needsPassphrase: false
    }
  ];

  useEffect(() => {
    loadKeysFromDb();
  }, []);

  const loadKeysFromDb = async () => {
    try {
      const { data: keys, error } = await supabase
        .from('api_keys_new')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setKeysInDb(keys || []);
      
      // Обновляем статусы ключей
      const newApiKeys = { ...apiKeys };
      (keys || []).forEach(key => {
        if (newApiKeys[key.exchange as keyof typeof newApiKeys]) {
          const isPlaceholder = key.api_key?.includes('TEST_') || key.api_key?.includes('DEMO_');
          newApiKeys[key.exchange as keyof typeof newApiKeys].status = isPlaceholder ? 'placeholder' : 'configured';
        }
      });
      setApiKeys(newApiKeys);

    } catch (error: any) {
      console.error('Ошибка загрузки ключей:', error);
      toast({
        title: "Ошибка",
        description: `Не удалось загрузить ключи: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const addTestKey = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`test_${exchange}`]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('extended_keys_manager_6_exchanges_2025_11_12_07_50', {
        body: { action: 'add_test_key', exchange: exchange }
      });

      if (error) throw error;

      toast({
        title: "Успех",
        description: `Тестовый ключ для ${exchange} добавлен`,
      });

      setTimeout(() => {
        loadKeysFromDb();
        onKeysUpdate?.();
      }, 500);
      
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: `Ошибка добавления тестового ключа: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [`test_${exchange}`]: false }));
    }
  };

  const saveApiKey = async (exchange: string) => {
    const keyData = apiKeys[exchange as keyof typeof apiKeys];
    
    if (!keyData.api_key || !keyData.api_secret) {
      toast({
        title: "Ошибка",
        description: `${exchange}: Заполните API ключ и секрет`,
        variant: "destructive",
      });
      return;
    }

    if (['gate', 'kucoin', 'okx'].includes(exchange) && !keyData.passphrase) {
      toast({
        title: "Ошибка",
        description: `${exchange}: Требуется passphrase`,
        variant: "destructive",
      });
      return;
    }

    setLoading(prev => ({ ...prev, [`save_${exchange}`]: true }));
    
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

      if (error) throw error;

      toast({
        title: "Успех",
        description: `${exchange}: API ключи сохранены`,
      });

      setApiKeys(prev => ({
        ...prev,
        [exchange]: { ...prev[exchange as keyof typeof prev], status: 'configured' }
      }));
      
      setTimeout(() => {
        loadKeysFromDb();
        onKeysUpdate?.();
      }, 500);
      
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: `${exchange}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [`save_${exchange}`]: false }));
    }
  };

  const checkBalance = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`balance_${exchange}`]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('improved_trading_engine_with_smart_demo_2025_11_12_09_00', {
        body: { action: 'check_balance', exchange: exchange }
      });

      if (error) throw error;

      if (data.success) {
        setBalances(prev => ({ ...prev, [exchange]: data.balance }));
        toast({
          title: "Успех",
          description: `Баланс ${exchange}: ${data.balance.total_usdt?.toFixed(2)} USDT ${data.is_demo ? '(демо)' : ''}`,
        });
      } else {
        toast({
          title: "Ошибка",
          description: `Ошибка баланса ${exchange}: ${data.error}`,
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: `Ошибка баланса ${exchange}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [`balance_${exchange}`]: false }));
    }
  };

  const testConnection = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`test_${exchange}`]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('api_keys_diagnostics_2025_11_12_07_00', {
        body: { action: 'test_connection', exchange: exchange }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Успех",
          description: `${exchange}: Подключение успешно`,
        });
      } else {
        toast({
          title: "Ошибка",
          description: `${exchange}: ${data.test_result?.error || 'Ошибка подключения'}`,
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: `Тест ${exchange}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [`test_${exchange}`]: false }));
    }
  };

  const clearAllKeys = async () => {
    if (!confirm('Удалить все API ключи?')) return;

    setLoading(prev => ({ ...prev, clear: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('extended_keys_manager_6_exchanges_2025_11_12_07_50', {
        body: { action: 'clear_all' }
      });

      if (error) throw error;

      toast({
        title: "Успех",
        description: "Все API ключи удалены",
      });

      setKeysInDb([]);
      setBalances({});
      setApiKeys({
        bybit: { api_key: '', api_secret: '', status: 'empty' },
        binance: { api_key: '', api_secret: '', status: 'empty' },
        gate: { api_key: '', api_secret: '', passphrase: '', status: 'empty' },
        kucoin: { api_key: '', api_secret: '', passphrase: '', status: 'empty' },
        okx: { api_key: '', api_secret: '', passphrase: '', status: 'empty' },
        mexc: { api_key: '', api_secret: '', status: 'empty' }
      });

      onKeysUpdate?.();
      
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: `Ошибка удаления: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, clear: false }));
    }
  };

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
    <div className="space-y-6">
      <DebugPanel />

      {/* Заголовок и управление */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>🔑 Управление API Ключами (6 Бирж)</span>
            <div className="flex space-x-2">
              <Button 
                onClick={loadKeysFromDb}
                variant="outline"
                size="sm"
              >
                🔄 Обновить
              </Button>
              <Button 
                onClick={clearAllKeys}
                disabled={loading.clear}
                variant="destructive"
                size="sm"
              >
                {loading.clear ? '🔄' : '🗑️'} Очистить все
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-xl font-bold text-blue-400">{keysInDb.length}</div>
              <div className="text-xs text-gray-300">Всего ключей</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-xl font-bold text-green-400">
                {keysInDb.filter(k => !k.api_key?.includes('TEST_')).length}
              </div>
              <div className="text-xs text-gray-300">Реальных</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-xl font-bold text-yellow-400">
                {keysInDb.filter(k => k.api_key?.includes('TEST_')).length}
              </div>
              <div className="text-xs text-gray-300">Тестовых</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-xl font-bold text-purple-400">
                {Object.keys(balances).length}
              </div>
              <div className="text-xs text-gray-300">Балансов</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Карточки бирж */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

              {/* Баланс если есть */}
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
                    {balances[exchange.id].is_demo && (
                      <div className="text-xs text-yellow-400">🧪 Демо данные</div>
                    )}
                  </div>
                </div>
              )}

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
                
                {exchange.needsPassphrase && (
                  <div>
                    <Label className="text-gray-300 text-sm">Passphrase</Label>
                    <Input
                      value={apiKeys[exchange.id as keyof typeof apiKeys].passphrase || ''}
                      onChange={(e) => setApiKeys(prev => ({
                        ...prev,
                        [exchange.id]: { ...prev[exchange.id as keyof typeof prev], passphrase: e.target.value }
                      }))}
                      className="bg-gray-700 border-gray-600 text-sm"
                      placeholder={`Passphrase для ${exchange.name}`}
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
                
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => addTestKey(exchange.id)}
                    disabled={loading[`test_${exchange.id}`]}
                    variant="outline"
                    className="border-gray-600 text-xs"
                  >
                    {loading[`test_${exchange.id}`] ? '🔄' : '➕'}
                  </Button>
                  
                  <Button
                    onClick={() => testConnection(exchange.id)}
                    disabled={loading[`test_${exchange.id}`]}
                    className="bg-green-600 hover:bg-green-700 text-xs"
                  >
                    🧪
                  </Button>

                  <Button
                    onClick={() => checkBalance(exchange.id)}
                    disabled={loading[`balance_${exchange.id}`]}
                    className="bg-blue-600 hover:bg-blue-700 text-xs"
                  >
                    💰
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Список ключей в базе данных */}
      {keysInDb.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">📋 Ключи в базе данных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {keysInDb.map((key, index) => (
                <div key={index} className="bg-gray-700 p-3 rounded text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{key.exchange}</span>
                    <Badge variant={key.api_key?.includes('TEST_') ? "secondary" : "default"}>
                      {key.api_key?.includes('TEST_') ? "🟡 Тест" : "✅ Реал"}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-300">
                    Key: {key.api_key?.substring(0, 10)}... ({key.api_key?.length} символов)
                  </div>
                  <div className="text-xs text-gray-300">
                    Secret: {key.api_secret?.substring(0, 10)}... ({key.api_secret?.length} символов)
                  </div>
                  {key.passphrase && (
                    <div className="text-xs text-gray-300">
                      🔐 Passphrase: Да
                    </div>
                  )}
                  <div className="text-xs text-gray-300">
                    Создан: {new Date(key.created_at).toLocaleString('ru-RU')}
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

export default ApiKeysManager;
