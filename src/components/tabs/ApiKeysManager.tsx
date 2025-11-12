import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Key, Save, Eye, EyeOff, TestTube } from 'lucide-react';

interface ApiKey {
  id: string;
  exchange: string;
  api_key: string;
  api_secret: string;
  passphrase?: string;
  is_testnet: boolean;
  created_at: string;
  updated_at: string;
}

const EXCHANGES = [
  { value: 'bybit', label: 'Bybit', icon: '🟡', needsPassphrase: false },
  { value: 'binance', label: 'Binance', icon: '🟨', needsPassphrase: false },
  { value: 'gate', label: 'Gate.io', icon: '🟦', needsPassphrase: false },
  { value: 'kucoin', label: 'KuCoin', icon: '🟩', needsPassphrase: true },
  { value: 'okx', label: 'OKX', icon: '⚫', needsPassphrase: true },
  { value: 'mexc', label: 'MEXC', icon: '🔵', needsPassphrase: false }
];

const ApiKeysManager = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    exchange: 'bybit',
    api_key: '',
    api_secret: '',
    passphrase: '',
    is_testnet: false
  });

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys_new')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setApiKeys(data || []);
    } catch (error) {
      console.error('Ошибка загрузки API ключей:', error);
    }
  };

  const saveApiKey = async () => {
    if (!formData.api_key || !formData.api_secret) {
      toast({
        title: "Ошибка",
        description: "API Key и Secret обязательны для заполнения",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const keyData = {
        user_id: user?.id,
        exchange: formData.exchange,
        api_key: formData.api_key,
        api_secret: formData.api_secret,
        passphrase: formData.passphrase || null,
        is_testnet: formData.is_testnet,
        updated_at: new Date().toISOString()
      };

      if (editingKey) {
        const { error } = await supabase
          .from('api_keys_new')
          .update(keyData)
          .eq('id', editingKey);

        if (error) throw error;
        
        toast({
          title: "✅ Ключ обновлен",
          description: `API ключ для ${formData.exchange.toUpperCase()} обновлен`,
        });
      } else {
        const { error } = await supabase
          .from('api_keys_new')
          .insert([keyData]);

        if (error) throw error;
        
        toast({
          title: "✅ Ключ добавлен",
          description: `API ключ для ${formData.exchange.toUpperCase()} добавлен`,
        });
      }

      setFormData({
        exchange: 'bybit',
        api_key: '',
        api_secret: '',
        passphrase: '',
        is_testnet: false
      });
      setEditingKey(null);
      await loadApiKeys();
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const editApiKey = (key: ApiKey) => {
    setFormData({
      exchange: key.exchange,
      api_key: key.api_key,
      api_secret: key.api_secret,
      passphrase: key.passphrase || '',
      is_testnet: key.is_testnet
    });
    setEditingKey(key.id);
  };

  const deleteApiKey = async (keyId: string, exchange: string) => {
    if (!confirm(`Удалить API ключ для ${exchange.toUpperCase()}?`)) return;

    try {
      const { error } = await supabase
        .from('api_keys_new')
        .delete()
        .eq('id', keyId);

      if (error) throw error;
      
      toast({
        title: "✅ Ключ удален",
        description: `API ключ для ${exchange.toUpperCase()} удален`,
      });
      
      await loadApiKeys();
    } catch (error: any) {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const testApiKey = async (key: ApiKey) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { 
          action: 'check_balance', 
          exchange: key.exchange 
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "✅ Ключ работает",
          description: `Подключение к ${key.exchange.toUpperCase()} успешно`,
        });
      } else {
        toast({
          title: "❌ Ошибка ключа",
          description: data.message || "Не удалось подключиться к бирже",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка тестирования",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSecretVisibility = (keyId: string) => {
    setShowSecrets(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const maskSecret = (secret: string, show: boolean) => {
    if (show) return secret;
    return secret.substring(0, 8) + '•'.repeat(secret.length - 12) + secret.substring(secret.length - 4);
  };

  const selectedExchange = EXCHANGES.find(e => e.value === formData.exchange);

  return (
    <div className="space-y-6">
      {/* Форма добавления/редактирования ключа */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Key className="h-5 w-5 mr-2" />
            🔑 {editingKey ? 'Редактировать' : 'Добавить'} API Ключ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Биржа</Label>
              <select
                value={formData.exchange}
                onChange={(e) => setFormData(prev => ({ ...prev, exchange: e.target.value }))}
                className="w-full mt-2 p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                {EXCHANGES.map(exchange => (
                  <option key={exchange.value} value={exchange.value}>
                    {exchange.icon} {exchange.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-4 mt-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_testnet}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_testnet: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-gray-300">Testnet</span>
              </label>
            </div>
          </div>

          <div>
            <Label className="text-gray-300">API Key</Label>
            <Input
              value={formData.api_key}
              onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
              className="bg-gray-700 border-gray-600 mt-2"
              placeholder="Введите API Key"
            />
          </div>

          <div>
            <Label className="text-gray-300">API Secret</Label>
            <Input
              type="password"
              value={formData.api_secret}
              onChange={(e) => setFormData(prev => ({ ...prev, api_secret: e.target.value }))}
              className="bg-gray-700 border-gray-600 mt-2"
              placeholder="Введите API Secret"
            />
          </div>

          {selectedExchange?.needsPassphrase && (
            <div>
              <Label className="text-gray-300">Passphrase</Label>
              <Input
                type="password"
                value={formData.passphrase}
                onChange={(e) => setFormData(prev => ({ ...prev, passphrase: e.target.value }))}
                className="bg-gray-700 border-gray-600 mt-2"
                placeholder="Введите Passphrase"
              />
            </div>
          )}

          <div className="flex space-x-2">
            <Button onClick={saveApiKey} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              {editingKey ? 'Обновить' : 'Сохранить'}
            </Button>
            
            {editingKey && (
              <Button 
                onClick={() => {
                  setEditingKey(null);
                  setFormData({
                    exchange: 'bybit',
                    api_key: '',
                    api_secret: '',
                    passphrase: '',
                    is_testnet: false
                  });
                }}
                variant="outline"
                className="border-gray-600"
              >
                Отмена
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Список сохраненных ключей */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">🗝️ Сохраненные API Ключи</CardTitle>
        </CardHeader>
        <CardContent>
          {apiKeys.length > 0 ? (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-purple-600">
                        {EXCHANGES.find(e => e.value === key.exchange)?.icon} {key.exchange.toUpperCase()}
                      </Badge>
                      {key.is_testnet && (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                          TESTNET
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => testApiKey(key)}
                        disabled={loading}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        onClick={() => editApiKey(key)}
                        size="sm"
                        variant="outline"
                        className="border-gray-600"
                      >
                        Изменить
                      </Button>
                      
                      <Button
                        onClick={() => deleteApiKey(key.id, key.exchange)}
                        size="sm"
                        variant="destructive"
                      >
                        Удалить
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-400">API Key:</span>
                      <div className="text-white font-mono break-all">
                        {maskSecret(key.api_key, showSecrets[key.id])}
                        <Button
                          onClick={() => toggleSecretVisibility(key.id)}
                          size="sm"
                          variant="ghost"
                          className="ml-2 p-1 h-6 w-6"
                        >
                          {showSecrets[key.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Создан:</span>
                      <span className="text-white ml-2">
                        {new Date(key.created_at).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">Нет сохраненных API ключей</p>
              <p className="text-gray-500 text-sm mt-2">Добавьте API ключи для начала торговли</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeysManager;
