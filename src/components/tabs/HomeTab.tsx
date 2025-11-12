import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HomeTabProps {
  systemStatus: {
    apiKeys: number;
    activeStrategies: number;
    totalProfit: number;
    isConnected: boolean;
  };
  onRefresh: () => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ systemStatus, onRefresh }) => {
  return (
    <div className="space-y-6">
      {/* Статус системы */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>🏠 Обзор системы</span>
            <Button onClick={onRefresh} variant="outline" size="sm">
              🔄 Обновить
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{systemStatus.apiKeys}</div>
              <div className="text-gray-300">API Ключи</div>
              <Badge variant={systemStatus.apiKeys > 0 ? "default" : "secondary"} className="mt-2">
                {systemStatus.apiKeys > 0 ? "✅ Настроены" : "⚠️ Не настроены"}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{systemStatus.activeStrategies}</div>
              <div className="text-gray-300">Активные стратегии</div>
              <Badge variant={systemStatus.activeStrategies > 0 ? "default" : "secondary"} className="mt-2">
                {systemStatus.activeStrategies > 0 ? "🟢 Работают" : "🔴 Остановлены"}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">${systemStatus.totalProfit.toFixed(2)}</div>
              <div className="text-gray-300">Прибыль за 24ч</div>
              <Badge variant={systemStatus.totalProfit > 0 ? "default" : "secondary"} className="mt-2">
                {systemStatus.totalProfit > 0 ? "📈 Прибыль" : "📊 Нет данных"}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {systemStatus.isConnected ? "🟢" : "🔴"}
              </div>
              <div className="text-gray-300">Подключение</div>
              <Badge variant={systemStatus.isConnected ? "default" : "destructive"} className="mt-2">
                {systemStatus.isConnected ? "✅ Подключен" : "❌ Отключен"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Быстрые действия */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">🔑 API Ключи</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 text-sm mb-4">
              Настройте API ключи для торговли на биржах
            </p>
            <div className="space-y-2">
              <div className="text-xs text-gray-400">Поддерживаемые биржи:</div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">🟡 Bybit</Badge>
                <Badge variant="outline">🟨 Binance</Badge>
                <Badge variant="outline">🟦 Gate.io</Badge>
                <Badge variant="outline">🟢 KuCoin</Badge>
                <Badge variant="outline">⚫ OKX</Badge>
                <Badge variant="outline">🔵 MEXC</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">📊 Торговля</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 text-sm mb-4">
              Настройте торговые параметры и стратегии
            </p>
            <div className="space-y-2">
              <div className="text-xs text-gray-400">Доступные функции:</div>
              <div className="space-y-1">
                <div className="text-xs">• Тестовые ордера</div>
                <div className="text-xs">• Проверка балансов</div>
                <div className="text-xs">• Настройка параметров</div>
                <div className="text-xs">• Stop Loss / Take Profit</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">🔺 Арбитраж</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 text-sm mb-4">
              Фандинг арбитраж между биржами
            </p>
            <div className="space-y-2">
              <div className="text-xs text-gray-400">Возможности:</div>
              <div className="space-y-1">
                <div className="text-xs">• Поиск возможностей</div>
                <div className="text-xs">• Автоматическое исполнение</div>
                <div className="text-xs">• Мониторинг спредов</div>
                <div className="text-xs">• Управление рисками</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Последние события */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">📝 Последние события</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
              <div className="flex items-center space-x-3">
                <div className="text-green-400">✅</div>
                <div>
                  <div className="text-white text-sm">Система запущена</div>
                  <div className="text-gray-400 text-xs">Торговый бот готов к работе</div>
                </div>
              </div>
              <div className="text-gray-400 text-xs">
                {new Date().toLocaleString('ru-RU')}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
              <div className="flex items-center space-x-3">
                <div className="text-blue-400">🔑</div>
                <div>
                  <div className="text-white text-sm">API ключи: {systemStatus.apiKeys}</div>
                  <div className="text-gray-400 text-xs">Настроено ключей для торговли</div>
                </div>
              </div>
              <div className="text-gray-400 text-xs">
                Сейчас
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
              <div className="flex items-center space-x-3">
                <div className="text-yellow-400">📊</div>
                <div>
                  <div className="text-white text-sm">Поддержка 6 бирж</div>
                  <div className="text-gray-400 text-xs">Bybit, Binance, Gate.io, KuCoin, OKX, MEXC</div>
                </div>
              </div>
              <div className="text-gray-400 text-xs">
                Доступно
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Инструкции */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">📋 Быстрый старт</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-semibold mb-3">🚀 Первые шаги:</h4>
              <ol className="space-y-2 text-sm text-gray-300">
                <li>1. Перейдите на вкладку "🔑 API Ключи"</li>
                <li>2. Добавьте тестовые ключи или настройте реальные</li>
                <li>3. Проверьте подключение к биржам</li>
                <li>4. Перейдите на "📊 Торговля" для настройки</li>
                <li>5. Запустите торговый бот</li>
              </ol>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">⚠️ Важные замечания:</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Начните с тестовых ключей</li>
                <li>• Проверьте балансы перед торговлей</li>
                <li>• Настройте Telegram уведомления</li>
                <li>• Используйте Stop Loss для защиты</li>
                <li>• Мониторьте логи операций</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomeTab;
