import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AuthForm from '@/components/AuthForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Компонент для диагностики и управления API ключами
const ApiKeysDiagnostics = () => {
  const { user } = useAuth();
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [showApiForm, setShowApiForm] = useState<string | null>(null);
  const [apiForm, setApiForm] = useState({
    exchange: '',
    api_key: '',
    api_secret: '',
    passphrase: ''
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const diagnoseDiagnose = async () => {
    setLoading(prev => ({ ...prev, diagnose: true }));
    addLog('🔍 Запускаем диагностику API ключей...');
    
    try {
      const { data, error } = await supabase.functions.invoke('api_keys_diagnostics_2025_11_12_07_00', {
        body: { action: 'diagnose_keys' }
      });

      if (error) {
        console.error('❌ Ошибка диагностики:', error);
        throw error;
      }

      console.log('✅ Диагностика завершена:', data);
      setDiagnosis(data.diagnosis);
      
      addLog(`✅ Диагностика завершена: найдено ${data.diagnosis.total_keys} ключей`);
      if (data.diagnosis.issues.length > 0) {
        addLog(`⚠️ Найдено проблем: ${data.diagnosis.issues.length}`);
      }
      
    } catch (error: any) {
      console.error('❌ Ошибка диагностики:', error);
      addLog(`❌ Ошибка диагностики: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, diagnose: false }));
    }
  };

  const testConnection = async (exchange: string) => {
    setLoading(prev => ({ ...prev, [`test_${exchange}`]: true }));
    addLog(`🧪 Тестируем подключение к ${exchange}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('api_keys_diagnostics_2025_11_12_07_00', {
        body: { 
          action: 'test_connection',
          exchange: exchange
        }
      });

      if (error) {
        console.error('❌ Ошибка тестирования:', error);
        throw error;
      }

      console.log('✅ Тест завершен:', data);
      
      if (data.success) {
        addLog(`✅ ${exchange}: Подключение успешно`);
        if (data.test_result.balance_test) {
          addLog(`💰 ${exchange}: Баланс доступен`);
        }
      } else {
        addLog(`❌ ${exchange}: ${data.test_result.error}`);
      }
      
    } catch (error: any) {
      console.error('❌ Ошибка тестирования:', error);
      addLog(`❌ Тест ${exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [`test_${exchange}`]: false }));
    }
  };

  const updateApiKey = async () => {
    if (!apiForm.exchange || !apiForm.api_key || !apiForm.api_secret) {
      addLog('❌ Заполните все обязательные поля');
      return;
    }

    setLoading(prev => ({ ...prev, update: true }));
    addLog(`🔧 Обновляем API ключ для ${apiForm.exchange}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('api_keys_diagnostics_2025_11_12_07_00', {
        body: { 
          action: 'update_api_key',
          exchange: apiForm.exchange,
          api_key: apiForm.api_key,
          api_secret: apiForm.api_secret,
          passphrase: apiForm.passphrase || undefined
        }
      });

      if (error) {
        console.error('❌ Ошибка обновления:', error);
        throw error;
      }

      console.log('✅ Ключ обновлен:', data);
      addLog(`✅ API ключ для ${apiForm.exchange} обновлен`);
      
      // Сбрасываем форму
      setApiForm({ exchange: '', api_key: '', api_secret: '', passphrase: '' });
      setShowApiForm(null);
      
      // Перезапускаем диагностику
      setTimeout(() => diagnoseDiagnose(), 1000);
      
    } catch (error: any) {
      console.error('❌ Ошибка обновления:', error);
      addLog(`❌ Ошибка обновления ${apiForm.exchange}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, update: false }));
    }
  };

  const resetAllKeys = async () => {
    if (!confirm('Вы уверены, что хотите удалить ВСЕ API ключи?')) {
      return;
    }

    setLoading(prev => ({ ...prev, reset: true }));
    addLog('🗑️ Удаляем все API ключи...');
    
    try {
      const { data, error } = await supabase.functions.invoke('api_keys_diagnostics_2025_11_12_07_00', {
        body: { action: 'reset_all_keys' }
      });

      if (error) throw error;

      addLog('✅ Все API ключи удалены');
      setDiagnosis(null);
      
    } catch (error: any) {
      addLog(`❌ Ошибка удаления: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, reset: false }));
    }
  };

  const openApiForm = (exchange: string) => {
    setApiForm(prev => ({ ...prev, exchange }));
    setShowApiForm(exchange);
  };

  // Автоматическая диагностика при загрузке
  useEffect(() => {
    diagnoseDiagnose();
  }, []);

  const exchanges = [
    { id: 'bybit', name: 'Bybit', icon: '🟡', color: 'bg-yellow-600' },
    { id: 'binance', name: 'Binance', icon: '🟨', color: 'bg-orange-600' },
    { id: 'gate', name: 'Gate.io', icon: '🟦', color: 'bg-blue-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Заголовок */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-center">
              🔧 Диагностика и Управление API Ключами
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-300 mb-4">
              Проверьте состояние ваших API ключей и исправьте проблемы
            </p>
            <div className="space-x-4">
              <Button 
                onClick={diagnoseDiagnose} 
                disabled={loading.diagnose}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading.diagnose ? '🔄 Диагностика...' : '🔍 Запустить диагностику'}
              </Button>
              <Button 
                onClick={resetAllKeys} 
                disabled={loading.reset}
                variant="destructive"
              >
                {loading.reset ? '🔄 Удаление...' : '🗑️ Удалить все ключи'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Результаты диагностики */}
        {diagnosis && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">📊 Результаты Диагностики</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Общая информация */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">📈 Общая информация</h3>
                  <div className="bg-gray-700 p-4 rounded space-y-2">
                    <div className="flex justify-between">
                      <span>Всего ключей:</span>
                      <Badge variant={diagnosis.total_keys > 0 ? "default" : "secondary"}>
                        {diagnosis.total_keys}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Проблем найдено:</span>
                      <Badge variant={diagnosis.issues.length === 0 ? "default" : "destructive"}>
                        {diagnosis.issues.length}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Проблемы */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">⚠️ Найденные проблемы</h3>
                  <div className="bg-gray-700 p-4 rounded max-h-40 overflow-y-auto">
                    {diagnosis.issues.length > 0 ? (
                      <div className="space-y-1">
                        {diagnosis.issues.map((issue: string, index: number) => (
                          <div key={index} className="text-sm text-red-400">
                            {issue}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-green-400 text-center">✅ Проблем не найдено</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Рекомендации */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">💡 Рекомендации</h3>
                <div className="bg-gray-700 p-4 rounded">
                  {diagnosis.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="text-sm text-blue-400 mb-1">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API ключи по биржам */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exchanges.map(exchange => {
            const exchangeData = diagnosis?.keys_by_exchange?.[exchange.id];
            return (
              <Card key={exchange.id} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>{exchange.icon} {exchange.name}</span>
                    <Badge variant={exchangeData ? "default" : "secondary"}>
                      {exchangeData ? (exchangeData.is_placeholder ? "🟡 Тестовый" : "✅ Настроен") : "❌ Нет ключей"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Информация о ключах */}
                  {exchangeData && (
                    <div className="bg-gray-700 p-3 rounded">
                      <h4 className="text-sm font-semibold mb-2">🔑 Информация о ключах:</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>API Key:</span>
                          <span className="font-mono">{exchangeData.api_key}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Длина ключа:</span>
                          <span className="font-mono">{exchangeData.api_key_length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Secret:</span>
                          <span className="font-mono">{exchangeData.api_secret}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Длина секрета:</span>
                          <span className="font-mono">{exchangeData.api_secret_length}</span>
                        </div>
                        {exchange.id === 'gate' && (
                          <div className="flex justify-between">
                            <span>Passphrase:</span>
                            <span className="font-mono">{exchangeData.passphrase}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Кнопки управления */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => openApiForm(exchange.id)}
                      className={`w-full ${exchange.color} hover:opacity-80`}
                    >
                      🔧 {exchangeData ? 'Обновить ключи' : 'Добавить ключи'}
                    </Button>
                    
                    {exchangeData && (
                      <Button
                        onClick={() => testConnection(exchange.id)}
                        disabled={loading[`test_${exchange.id}`]}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {loading[`test_${exchange.id}`] ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Тестируем...
                          </div>
                        ) : (
                          `🧪 Тест подключения`
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Форма добавления/обновления API ключей */}
        {showApiForm && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                🔑 {apiForm.exchange ? `Настройка API ключей для ${exchanges.find(e => e.id === apiForm.exchange)?.name}` : 'Настройка API ключей'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Биржа</Label>
                  <Select value={apiForm.exchange} onValueChange={(value) => setApiForm(prev => ({ ...prev, exchange: value }))}>
                    <SelectTrigger className="bg-gray-700 border-gray-600">
                      <SelectValue placeholder="Выберите биржу" />
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
              </div>
              
              <div>
                <Label className="text-gray-300">API Key *</Label>
                <Input
                  value={apiForm.api_key}
                  onChange={(e) => setApiForm(prev => ({ ...prev, api_key: e.target.value }))}
                  className="bg-gray-700 border-gray-600"
                  placeholder="Вставьте ваш API ключ"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">API Secret *</Label>
                <Textarea
                  value={apiForm.api_secret}
                  onChange={(e) => setApiForm(prev => ({ ...prev, api_secret: e.target.value }))}
                  className="bg-gray-700 border-gray-600"
                  placeholder="Вставьте ваш API секрет"
                  rows={3}
                />
              </div>
              
              {apiForm.exchange === 'gate' && (
                <div>
                  <Label className="text-gray-300">Passphrase (для Gate.io) *</Label>
                  <Input
                    value={apiForm.passphrase}
                    onChange={(e) => setApiForm(prev => ({ ...prev, passphrase: e.target.value }))}
                    className="bg-gray-700 border-gray-600"
                    placeholder="Passphrase для Gate.io"
                  />
                </div>
              )}
              
              <div className="flex space-x-4">
                <Button
                  onClick={updateApiKey}
                  disabled={loading.update}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading.update ? '🔄 Сохранение...' : '💾 Сохранить ключи'}
                </Button>
                <Button
                  onClick={() => setShowApiForm(null)}
                  variant="outline"
                  className="border-gray-600"
                >
                  ❌ Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Логи */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">📝 Логи Операций</CardTitle>
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

        {/* Управление */}
        <div className="text-center space-x-4">
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-green-600 hover:bg-green-700"
          >
            🔄 Перезагрузить страницу
          </Button>
          <Button 
            onClick={() => {
              alert('После настройки API ключей вернитесь к торговому тестированию');
            }} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            🚀 К торговому тестированию
          </Button>
        </div>
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

  return <ApiKeysDiagnostics />;
};

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
