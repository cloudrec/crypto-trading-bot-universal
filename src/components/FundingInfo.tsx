import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ExternalLink, Clock, DollarSign } from 'lucide-react';

interface FundingInfoProps {
  className?: string;
}

const FundingInfo: React.FC<FundingInfoProps> = ({ className }) => {
  const currentTimeUTC = new Date().toLocaleString('ru-RU', { 
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const fundingLinks = [
    {
      name: 'Binance Funding Rate',
      url: 'https://www.binance.com/en/futures/funding-history/1',
      description: 'История ставок фандинга Binance'
    },
    {
      name: 'Bybit Funding Rate',
      url: 'https://www.bybit.com/en/trading/funding-rate/',
      description: 'Ставки фандинга Bybit'
    },
    {
      name: 'Gate.io Funding Rate',
      url: 'https://www.gate.io/futures_trade/USDT/BTC_USDT',
      description: 'Фандинг Gate.io'
    },
    {
      name: 'CoinGlass Funding',
      url: 'https://www.coinglass.com/FundingRate',
      description: 'Агрегатор ставок фандинга'
    }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          💰 Информация о фандинге
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Текущее время UTC */}
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            Текущее время UTC: {currentTimeUTC}
          </span>
        </div>

        {/* Информация о фандинге */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-800">📊 Ставки фандинга обновляются каждые 8 часов:</h4>
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Badge variant="outline">00:00 UTC</Badge>
              <span>Первое начисление фандинга</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">08:00 UTC</Badge>
              <span>Второе начисление фандинга</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">16:00 UTC</Badge>
              <span>Третье начисление фандинга</span>
            </div>
          </div>
        </div>

        {/* Кликабельные ссылки */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-800">🔗 Полезные ссылки:</h4>
          <div className="grid grid-cols-1 gap-2">
            {fundingLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-blue-600" />
                <div className="flex-1">
                  <div className="font-medium text-gray-800 group-hover:text-blue-800">
                    {link.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {link.description}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>💡 Совет:</strong> Фандинг начисляется через несколько секунд после указанного времени. 
            Рекомендуется устанавливать задержку 5-10 секунд в настройках.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FundingInfo;