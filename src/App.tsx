import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthForm from "@/components/AuthForm";
import ArbitrageScanner from "@/components/ArbitrageScanner";
import TriangularArbitrage from "@/components/TriangularArbitrage";

const queryClient = new QueryClient();

// Главная торговая панель с арбитражем
const TradingDashboard = () => {
  const { user, isAdmin } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-6">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🤖 Арбитражный Торговый Бот</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>👤 {user?.email}</span>
            {isAdmin && <span className="text-yellow-400">👑 Админ</span>}
            <span>🕒 {new Date().toLocaleString('ru-RU')}</span>
          </div>
        </div>

        {/* Вкладки арбитража */}
        <Tabs defaultValue="cross-exchange" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="cross-exchange" className="data-[state=active]:bg-blue-600">
              🔄 Межбиржевой Арбитраж
            </TabsTrigger>
            <TabsTrigger value="triangular" className="data-[state=active]:bg-purple-600">
              🔺 Треугольный Арбитраж
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cross-exchange" className="mt-6">
            <ArbitrageScanner />
          </TabsContent>

          <TabsContent value="triangular" className="mt-6">
            <TriangularArbitrage />
          </TabsContent>
        </Tabs>

        {/* Информационная панель */}
        <div className="mt-8 bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">📚 Что такое арбитраж?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">
                🔄 Межбиржевой Арбитраж
              </h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Покупка на одной бирже, продажа на другой</li>
                <li>• Использование разницы в ценах между биржами</li>
                <li>• Лимитные ордера для минимизации проскальзывания</li>
                <li>• Автоматическое закрытие при сходимости цен</li>
                <li>• Telegram уведомления о входе и выходе</li>
              </ul>
            </div>

            <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-700">
              <h3 className="text-lg font-semibold text-purple-300 mb-2">
                🔺 Треугольный Арбитраж
              </h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Три последовательные сделки на одной бирже</li>
                <li>• Использование неэффективности между парами</li>
                <li>• Например: BTC→ETH→USDT→BTC</li>
                <li>• Быстрое выполнение (секунды)</li>
                <li>• Высокая частота возможностей</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 bg-green-900/30 p-4 rounded-lg border border-green-700">
            <h3 className="text-lg font-semibold text-green-300 mb-2">
              ⚙️ Настройки системы
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div>
                <strong>Минимальный оборот:</strong> $20M за 24ч
              </div>
              <div>
                <strong>Плечо:</strong> Настраиваемое (1x-10x)
              </div>
              <div>
                <strong>Уведомления:</strong> Telegram интеграция
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <TradingDashboard />
          </ProtectedRoute>
        } 
      />
      <Route path="/login" element={<AuthForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
