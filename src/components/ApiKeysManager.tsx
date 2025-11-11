import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
// DEV: Убираем ненужный импорт
import { 
  Key, 
  Eye, 
  EyeOff, 
  Save, 
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ApiKey {
  id?: string;
  exchange: string;
  api_key: string;
  api_secret: string;
  passphrase?: string;
  testnet: boolean;
  is_active: boolean;
}

const ApiKeysManager: React.FC = () => {
  const { toast } = useToast();
const [user, setUser] = useState<any>(null); // DEV: Состояние пользователя
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  const [newApiKey, setNewApiKey] = useState<ApiKey>({
    exchange: 'bybit',
    api_key: '',
    api_secret: '',
    passphrase: '',
    testnet: false,
    is_active: true
  });

// DEV: Получаем пользователя при загрузке
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadApiKeys();
      }
    };
    getUser();
  }, []);

const loadApiKeys = async () => {
    try {
      if (!user?.id) {
        console.log('DEV: No user, skipping API keys load');
        return;
      }
      
      setLoading(true);
      console.log('DEV: Loading API keys for user:', user.id, user.email);
      
      // DEV: Используем DEV таблицу и фильтруем по user_id
      const { data, error } = await supabase
        .from('api_keys_dev')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
if (data) {
        console.log('Loaded API keys:', data);
        setApiKeys(data);
      }
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    try {
      if (!newApiKey.api_key || !newApiKey.api_secret) {
        toast({
          title: "Ошибка",
          description: "API Key и Secret обязательны для заполнения",
          variant: "destructive",
        });
        return;
      }

      if ((newApiKey.exchange === 'kucoin') && !newApiKey.passphrase) {
        toast({
          title: "Ошибка",
          description: "Для KuCoin требуется Passphrase",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

// DEV: Добавляем user_id вручную
      console.log('DEV: Saving API keys for user:', user?.id, user?.email);
      
      const { error } = await supabase
        .from('api_keys_dev') // DEV таблица
        .upsert({
          user_id: user?.id, // Обязательно добавляем user_id
          exchange: newApiKey.exchange,
          api_key: newApiKey.api_key,
          api_secret: newApiKey.api_secret,
          passphrase: newApiKey.passphrase || null,
          is_testnet: newApiKey.testnet, // Правильное название поля
        }, {
          onConflict: 'user_id,exchange' // Обновляем если уже существует
        });
        
      console.log('DEV: API keys save result:', { error });

      if (error) throw error;

      toast({
        title: "API ключ сохранен",
        description: `Ключи для ${newApiKey.exchange.toUpperCase()} успешно добавлены`,
      });

      // Сброс формы
      setNewApiKey({
        exchange: 'bybit',
        api_key: '',
        api_secret: '',
        passphrase: '',
        testnet: false,
        is_active: true
      });

      loadApiKeys();
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

  const deleteApiKey = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
.from('api_keys_dev') // DEV таблица
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "API ключ удален",
        description: "Ключи успешно удалены",
      });

      loadApiKeys();
    } catch (error: any) {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleApiKeyStatus = async (id: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      const { error } = await supabase
.from('api_keys_dev') // DEV таблица
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Статус обновлен",
        description: `API ключ ${!currentStatus ? 'активирован' : 'деактивирован'}`,
      });

      loadApiKeys();
    } catch (error: any) {
      toast({
        title: "Ошибка обновления",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSecretVisibility = (keyId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const maskSecret = (secret: string, show: boolean) => {
    if (show) return secret;
    return '*'.repeat(Math.min(secret.length, 20));
  };

  const getExchangeRequirements = (exchange: string) => {
    const requirements: {[key: string]: string[]} = {
      bybit: ['API Key', 'API Secret'],
      binance: ['API Key', 'API Secret'],
      mexc: ['API Key', 'API Secret'],
      gate: ['API Key', 'API Secret'],
      kucoin: ['API Key', 'API Secret', 'Passphrase']
    };
    return requirements[exchange] || ['API Key', 'API Secret'];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Управление API ключами</h2>
          <p className="text-muted-foreground">Добавьте и управляйте API ключами для торговых бирж</p>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Важно:</strong> API ключи хранятся в зашифрованном виде. Убедитесь, что у ваших ключей есть права на торговлю и чтение баланса.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="add" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add">Добавить ключи</TabsTrigger>
          <TabsTrigger value="manage">Управление ключами</TabsTrigger>
        </TabsList>

        {/* Add API Keys Tab */}
        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Добавить новые API ключи
              </CardTitle>
              <CardDescription>
                Добавьте API ключи для торговли на выбранной бирже
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exchange">Биржа</Label>
                  <Select 
                    value={newApiKey.exchange} 
                    onValueChange={(value) => setNewApiKey(prev => ({ 
                      ...prev, 
                      exchange: value,
                      passphrase: value === 'kucoin' ? prev.passphrase : ''
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bybit">Bybit</SelectItem>
                      <SelectItem value="binance">Binance</SelectItem>
                      <SelectItem value="mexc">MEXC</SelectItem>
                      <SelectItem value="gate">Gate.io</SelectItem>
                      <SelectItem value="kucoin">KuCoin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Требуется: {getExchangeRequirements(newApiKey.exchange).join(', ')}
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="testnet"
                    checked={newApiKey.testnet}
                    onChange={(e) => setNewApiKey(prev => ({ ...prev, testnet: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="testnet" className="text-sm">
                    Testnet (тестовая сеть)
                  </Label>
                </div>
              </div>

              <div>
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="text"
                  value={newApiKey.api_key}
                  onChange={(e) => setNewApiKey(prev => ({ ...prev, api_key: e.target.value }))}
                  placeholder="Введите ваш API Key"
                />
              </div>

              <div>
                <Label htmlFor="api_secret">API Secret</Label>
                <Input
                  id="api_secret"
                  type="password"
                  value={newApiKey.api_secret}
                  onChange={(e) => setNewApiKey(prev => ({ ...prev, api_secret: e.target.value }))}
                  placeholder="Введите ваш API Secret"
                />
              </div>

              {newApiKey.exchange === 'kucoin' && (
                <div>
                  <Label htmlFor="passphrase">Passphrase</Label>
                  <Input
                    id="passphrase"
                    type="password"
                    value={newApiKey.passphrase}
                    onChange={(e) => setNewApiKey(prev => ({ ...prev, passphrase: e.target.value }))}
                    placeholder="Введите ваш Passphrase (только для KuCoin)"
                  />
                </div>
              )}

              <Button onClick={saveApiKey} disabled={loading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Сохранение..." : "Сохранить API ключи"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage API Keys Tab */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Сохраненные API ключи
              </CardTitle>
              <CardDescription>
                Управляйте существующими API ключами
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Нет сохраненных API ключей</p>
                  <p className="text-sm text-muted-foreground">Добавьте ключи на вкладке "Добавить ключи"</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="uppercase">
                            {apiKey.exchange}
                          </Badge>
                          {apiKey.testnet && (
                            <Badge variant="secondary">Testnet</Badge>
                          )}
                          <Badge variant={apiKey.is_active ? "default" : "secondary"}>
                            {apiKey.is_active ? "Активен" : "Неактивен"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleApiKeyStatus(apiKey.id!, apiKey.is_active)}
                            disabled={loading}
                          >
                            {apiKey.is_active ? "Деактивировать" : "Активировать"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteApiKey(apiKey.id!)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">API Key</Label>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs flex-1">
                              {maskSecret(apiKey.api_key, showSecrets[apiKey.id!])}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSecretVisibility(apiKey.id!)}
                            >
                              {showSecrets[apiKey.id!] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">API Secret</Label>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs flex-1">
                              {maskSecret(apiKey.api_secret, showSecrets[apiKey.id!])}
                            </code>
                          </div>
                        </div>

                        {apiKey.passphrase && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Passphrase</Label>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded text-xs flex-1">
                                {maskSecret(apiKey.passphrase, showSecrets[apiKey.id!])}
                              </code>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiKeysManager;