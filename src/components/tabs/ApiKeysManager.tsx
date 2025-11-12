import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Save, Key } from 'lucide-react';

interface ApiKey {
  id: string;
  exchange: string;
  api_key: string;
  api_secret: string;
  is_active: boolean;
}

const EXCHANGES = [
  { value: 'bybit', label: 'Bybit', icon: '🟡', docs: 'https://bybit-exchange.github.io/docs/v5/intro' },
  { value: 'binance', label: 'Binance', icon: '🟨', docs: 'https://binance-docs.github.io/apidocs/futures/en/' },
  { value: 'gate', label: 'Gate.io', icon: '🟦', docs: 'https://www.gate.io/docs/developers/apiv4/en/' },
  { value: 'kucoin', label: 'KuCoin', icon: '🟩', docs: 'https://docs.kucoin.com/futures/' },
  { value: 'okx', label: 'OKX', icon: '⚫', docs: 'https://www.okx.com/docs-v5/en/' },
  { value: 'mexc', label: 'MEXC', icon: '🔵', docs: 'https://mexcdevelop.github.io/apidocs/contract_v1_en/' }
];

export default function ApiKeysManager() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKey>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, { apiKey: string; apiSecret: string }>>({});

  useEffect(() => {
    if (user) {
      loadApiKeys();
    }
  }, [user]);

  const loadApiKeys = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('api_keys_dev')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const keysMap: Record<string, ApiKey> = {};
      const formMap: Record<string, { apiKey: string; apiSecret: string }> = {};
      
      data?.forEach(key => {
        keysMap[key.exchange] = key;
        formMap[key.exchange] = {
          apiKey: key.api_key || '',
          apiSecret: key.api_secret || ''
        };
      });
      
      setApiKeys(keysMap);
      setFormData(formMap);
    } catch (error: any) {
      console.error('Ошибка загрузки API ключей:', error);
    }
  };

  const saveApiKey = async (exchange: string) => {
    if (!user) return;

    const { apiKey, apiSecret } = formData[exchange] || {};
    if (!apiKey || !apiSecret) {
      toast({
        title: "Ошибка",
        description: "Заполните оба поля",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys_dev')
        .upsert({
          user_id: user.id,
          exchange,
          api_key: apiKey,
          api_secret: apiSecret,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setApiKeys(prev => ({
        ...prev,
        [exchange]: data
      }));

      toast({
        title: "API ключ сохранен",
        description: `Ключ для ${exchange} успешно обновлен`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSecretVisibility = (exchange: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [exchange]: !prev[exchange]
    }));
  };

  const updateFormData = (exchange: string, field: 'apiKey' | 'apiSecret', value: string) => {
    setFormData(prev => ({
      ...prev,
      [exchange]: {
        ...prev[exchange],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gradient-primary mb-2">
          🔑 Настройка API ключей
        </h2>
        <p className="text-gray-400">
          Добавьте API ключи для торговли на биржах. Все ключи хранятся в зашифрованном виде.
        </p>
      </div>

      {EXCHANGES.map(exchange => {
        const currentKey = apiKeys[exchange.value];
        const currentForm = formData[exchange.value] || { apiKey: '', apiSecret: '' };

        return (
          <Card key={exchange.value} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>{exchange.icon} {exchange.label}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {currentKey?.is_active && (
                    <Badge variant="default" className="bg-green-600">Активен</Badge>
                  )}
                  <a 
                    href={exchange.docs} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    📖 Документация
                  </a>
                </div>
              </CardTitle>
              <CardDescription>
                API ключи для торговли на {exchange.label}. 
                <span className="text-yellow-400 ml-2">
                  ⚠️ Включите фьючерсную торговлю в настройках API
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor={`${exchange.value}-key`}>API Key</Label>
                <Input
                  id={`${exchange.value}-key`}
                  value={currentForm.apiKey}
                  onChange={(e) => updateFormData(exchange.value, 'apiKey', e.target.value)}
                  placeholder="Введите API ключ"
                  className="bg-gray-700 border-gray-600 font-mono"
                />
              </div>
              
              <div>
                <Label htmlFor={`${exchange.value}-secret`}>API Secret</Label>
                <div className="relative">
                  <Input
                    id={`${exchange.value}-secret`}
                    type={showSecrets[exchange.value] ? 'text' : 'password'}
                    value={currentForm.apiSecret}
                    onChange={(e) => updateFormData(exchange.value, 'apiSecret', e.target.value)}
                    placeholder="Введите секретный ключ"
                    className="bg-gray-700 border-gray-600 pr-10 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => toggleSecretVisibility(exchange.value)}
                  >
                    {showSecrets[exchange.value] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-gray-700 p-3 rounded text-sm">
                <p className="text-yellow-400 font-semibold mb-1">Важные настройки API:</p>
                <ul className="text-gray-300 space-y-1 text-xs">
                  <li>✅ Включите <strong>Фьючерсную торговлю</strong></li>
                  <li>✅ Разрешите <strong>Чтение</strong> и <strong>Торговлю</strong></li>
                  <li>❌ НЕ включайте <strong>Вывод средств</strong></li>
                  <li>🔒 Добавьте IP-адрес сервера в белый список (рекомендуется)</li>
                </ul>
              </div>

              <Button
                onClick={() => saveApiKey(exchange.value)}
                disabled={loading || !currentForm.apiKey || !currentForm.apiSecret}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {currentKey ? 'Обновить ключи' : 'Сохранить ключи'}
              </Button>
            </CardContent>
          </Card>
        );
      })}

      <Card className="bg-blue-900/20 border-blue-700">
        <CardContent className="p-6">
          <h3 className="font-semibold text-blue-400 mb-3">🛡️ Безопасность</h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li>• Все API ключи хранятся в зашифрованном виде в базе данных</li>
            <li>• Бот использует только разрешения на чтение и торговлю</li>
            <li>• Никогда не предоставляйте права на вывод средств</li>
            <li>• Регулярно проверяйте активность API ключей на биржах</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
