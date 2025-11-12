import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ArbitrageTab = () => {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>🔺 Фандинг Арбитраж</span>
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "🟢 Активен" : "🔴 Остановлен"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-xl font-semibold text-white mb-2">В разработке</h3>
            <p className="text-gray-400 mb-4">
              Модуль фандинг арбитража находится в стадии разработки
            </p>
            <Button
              onClick={() => setIsActive(!isActive)}
              className={isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {isActive ? "🛑 Остановить" : "▶️ Запустить"} арбитраж
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArbitrageTab;
