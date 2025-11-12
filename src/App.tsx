import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AuthForm from '@/components/AuthForm';
import TradingDashboard from '@/components/TradingDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Компонент для тестирования баланса и Telegram
const BalanceTest = () => {
  const { user } = useAuth();
  const [balanceResult, setBalanceResult] = useState<any>(null);
  const [telegramResult, setTelegramResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);

  const testRealBalance = async (exchange: string) => {
    setLoading(true);
    try {
      console.log(`🔍 Тестируем реальный баланс на ${exchange}...`);
      
      const { data, error } = await supabase.functions.invoke('real_balance_checker_2025_11_12_06_05', {
        body: { 
          action: 'check_real_balance', 
          exchange: exchange 
        }
      });

      if (error) {
        console.error('❌ Ошибка Edge Function:', error);
        throw error;
      }

      console.log('✅ Результат проверки баланса:', data);
      setBalanceResult(data);
      
    } catch (error: any) {
      console.error('❌ Ошибка тестирования баланса:', error);
      setBalanceResult({
        success: false,
        error: error.message,
        exchange: exchange
      });
    } finally {
      setLoading(false);
    }
  };

  const testTelegram = async () => {
    setTelegramLoading(true);
    try {
      console.log('📱 Тестируем Telegram уведомления...');
      
      const { data, error } = await supabase.functions.invoke('funding_arbitrage_bot_2025_11_12_05_20', {
        body: { 
          action: 'send_telegram_notification',
          message: '🧪 Тестовое уведомление от торгового бота!\n\n✅ Система работает корректно\n📊 Время: ' + new Date().toLocaleString('ru-RU')
        }
      });

      if (error) {
        console.error('❌ Ошибка Telegram:', error);
        throw error;
      }

      console.log('✅ Результат Telegram:', data);
      setTelegramResult(data);
      
    } catch (error: any) {
      console.error('❌ Ошибка тестирования Telegram:', error);
      setTelegramResult({
        success: false,
        error: error.message
      });
    } finally {
      setTelegramLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">🧪 Тест Реального Баланса</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => testRealBalance('bybit')} 
                disabled={loading}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                🟡 Bybit
              </Button>
              <Button 
                onClick={() => testRealBalance('binance')} 
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                🟨 Binance
              </Button>
              <Button 
                onClick={() => testRealBalance('gate')} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                🟦 Gate.io
              </Button>
            </div>

            {loading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <p className="mt-2">Проверяем реальный баланс...</p>
              </div>
            )}

            {balanceResult && (
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-sm">
                    {balanceResult.success ? '✅ Успех' : '❌ Ошибка'} - {balanceResult.exchange?.toUpperCase()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {balanceResult.success ? (
                    <div className="space-y-2">
                      <p><strong>Биржа:</strong> {balanceResult.exchange}</p>
                      <p><strong>Общий баланс:</strong> {balanceResult.balance?.total_usdt?.toFixed(2) || '0'} USDT</p>
                      <p><strong>USDT доступно:</strong> {balanceResult.balance?.USDT?.available?.toFixed(2) || '0'}</p>
                      <p><strong>BTC доступно:</strong> {balanceResult.balance?.BTC?.available?.toFixed(8) || '0'}</p>
                      <p><strong>Это реальные данные:</strong> {balanceResult.is_real ? '✅ Да' : '❌ Нет'}</p>
                      {balanceResult.balance?.total_usdt > 0 && (
                        <div className="bg-green-800 p-3 rounded mt-4">
                          <p className="text-green-200">🎉 <strong>ОТЛИЧНО!</strong> Баланс больше 0 - можно приступать к установке ордеров!</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-400">
                      <p><strong>Ошибка:</strong> {balanceResult.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Тест Telegram */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">📱 Тест Telegram Уведомлений</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-400 mb-4">
              <p>Bot Token: 8580424708:AAG***</p>
              <p>Chat ID: 5498907359</p>
            </div>
            
            <Button 
              onClick={testTelegram} 
              disabled={telegramLoading}
              className="bg-blue-600 hover:bg-blue-700 w-full"
            >
              📱 Отправить тестовое сообщение
            </Button>

            {telegramLoading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <p className="mt-2">Отправляем Telegram сообщение...</p>
              </div>
            )}

            {telegramResult && (
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-sm">
                    {telegramResult.success ? '✅ Telegram работает' : '❌ Ошибка Telegram'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {telegramResult.success ? (
                    <div className="text-green-400">
                      <p>✅ Сообщение успешно отправлено в Telegram!</p>
                      <p className="text-sm text-gray-400 mt-2">Проверьте ваш Telegram чат</p>
                    </div>
                  ) : (
                    <div className="text-red-400">
                      <p><strong>Ошибка:</strong> {telegramResult.error}</p>
                    </div>
                  )}
                  <pre className="mt-4 text-xs bg-gray-800 p-2 rounded overflow-auto">
                    {JSON.stringify(telegramResult, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">👤 Информация о пользователе</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>ID:</strong> {user?.id}</p>
            <p><strong>Создан:</strong> {user?.created_at ? new Date(user.created_at).toLocaleString('ru-RU') : 'N/A'}</p>
          </CardContent>
        </Card>

        <div className="text-center space-x-4">
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-green-600 hover:bg-green-700"
          >
            🔄 Перезагрузить страницу
          </Button>
          <Button 
            onClick={() => {
              // Восстанавливаем полную версию
              const restoreFullVersion = async () => {
                try {
                  // Здесь можно добавить логику восстановления
                  alert('Для восстановления полной версии обратитесь к администратору');
                } catch (error) {
                  console.error('Ошибка восстановления:', error);
                }
              };
              restoreFullVersion();
            }} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            🚀 Восстановить полную панель
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

  // Показываем тест баланса вместо полной панели
  return <BalanceTest />;
};

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
