import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import TradingSettingsFixed from './TradingSettingsFixed';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AuthForm from '@/components/AuthForm';
import ApiKeysWithPassphrase from '@/components/ApiKeysWithPassphrase';
import WorkingPayment from '@/components/WorkingPayment';
import AdminPanel from '@/components/AdminPanel';

import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Settings, 
  Play, 
  Square, 
  RefreshCw,
  X,
  Clock,
  AlertTriangle,
  CheckCircle,
  Crown,
  Shield
} from 'lucide-react';

// Глобальная переменная для отслеживания проверки подписки
let subscriptionCheckInProgress = false;

interface TradingSettings {
  id?: string;
  exchange: string;
  base_asset: string;
  quote_asset: string;
  order_amount_usd: number;
  leverage: number;
  take_profit_percent: number;
  stop_loss_percent: number;
  funding_delay_ms: number;
  order_timeout_minutes: number;
  long_tp_offset_percent: number;
  long_stop_loss_percent: number;
  telegram_notifications: boolean;
  auto_trading_enabled: boolean;
}

const TradingDashboard: React.FC = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null); // Отслеживаем конкретное действие
  const [settings] = useState<TradingSettings>({
    exchange: 'bybit',
    base_asset: 'BTC',
    quote_asset: 'USDT',
    order_amount_usd: 100,
    leverage: 10,
    take_profit_percent: 0.5,
    stop_loss_percent: 1.0,
    funding_delay_ms: 5000,
    order_timeout_minutes: 30,
    long_tp_offset_percent: 0.3,
    long_stop_loss_percent: 2.0,
    telegram_notifications: true,
    auto_trading_enabled: false
  });

  const [balance, setBalance] = useState<any>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [autoTradingEnabled, setAutoTradingEnabled] = useState(false);
  
  // Состояние для текущей выбранной биржи
  const [currentSelectedExchange, setCurrentSelectedExchange] = useState('bybit');
  
  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔑 DEV: Auth state changed:', event, session?.user?.email);
        setUser(session?.user ?? null);
        setAuthLoading(false);
        
        if (session?.user) {
          console.log('🔑 DEV: User authenticated, loading settings in 200ms...');
          // Отложенная проверка подписки (только один раз)
          if (!subscriptionCheckInProgress) {
            setTimeout(() => {
              checkSubscriptionForUser(session.user);
              checkAdminRights();
            }, 200);
          }
        } else {
          setSubscriptionLoading(false);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 🔄 АВТОТОРГОВЛЯ: Фандинг бот (каждые 8 часов)
  useEffect(() => {
    let nextFundingTimeout: NodeJS.Timeout;
    
    if (settings?.auto_trading_enabled && user && hasSubscription && settings) {
      console.log('🔄 ФАНДИНГ: Запуск фандинг бота - ВКЛЮЧЕН');
      
      // Функция для вычисления следующего фандинга
      const getNextFundingTime = () => {
        const now = new Date();
        const utcHours = now.getUTCHours();
        
        // Фандинг каждые 8 часов: 00:00, 08:00, 16:00 UTC
        const fundingHours = [0, 8, 16];
        let nextFundingHour = fundingHours.find(hour => hour > utcHours);
        
        if (!nextFundingHour) {
          // Если сегодня фандингов нет, следующий в 00:00 завтра
          nextFundingHour = 0;
          now.setUTCDate(now.getUTCDate() + 1);
        }
        
        now.setUTCHours(nextFundingHour, 0, 0, 0);
        return now;
      };
      
      // Функция размещения ордера после фандинга
      const placeFundingOrder = async () => {
        try {
          console.log('💰 ФАНДИНГ БОТ: Начинаем сканирование фандинга!');
          
          // Первым делом сканируем фандинг
          const fundingResult = await callTradingAPI('scan_funding');
          console.log('💰 ФАНДИНГ БОТ: Результат сканирования:', fundingResult);
          
          // Затем размещаем ордер с задержкой
          setTimeout(async () => {
            try {
              console.log('💰 ФАНДИНГ БОТ: Задержка завершена, размещаем ордер');
              const result = await callTradingAPI('place_order_with_tp_sl');
              console.log('💰 ФАНДИНГ БОТ: Ордер после фандинга результат:', result);
            } catch (error) {
              console.error('💰 ФАНДИНГ БОТ: Ошибка ордера после фандинга:', error);
            }
          }, settings.funding_delay_ms || 5000); // Дефолтная задержка 5 секунд
          
        } catch (error) {
          console.error('🔄 ФАНДИНГ: Ошибка обработки фандинга:', error);
        }
      };
      
      // Функция установки следующего таймера
      const scheduleNextFunding = () => {
        const nextFunding = getNextFundingTime();
        const now = new Date();
        const msUntilFunding = nextFunding.getTime() - now.getTime();
        
        console.log('🔄 ФАНДИНГ: Следующий фандинг:', nextFunding.toISOString());
        console.log('🔄 ФАНДИНГ: Осталось времени:', Math.round(msUntilFunding / 1000 / 60), 'минут');
        
        nextFundingTimeout = setTimeout(() => {
          placeFundingOrder();
          scheduleNextFunding(); // Планируем следующий
        }, msUntilFunding);
      };
      
      // Первый запуск - планируем следующий фандинг
      scheduleNextFunding();
      
    } else {
      console.log('🔄 ФАНДИНГ: Отключен или нет доступа:', {
        autoTradingEnabled: settings?.auto_trading_enabled,
        hasUser: !!user,
        hasSubscription,
        hasSettings: !!settings
      });
    }
    
    return () => {
      if (nextFundingTimeout) {
        clearTimeout(nextFundingTimeout);
      }
    };
  }, [settings?.auto_trading_enabled, user, hasSubscription, settings]);

  // 🚫 АВТООБНОВЛЕНИЕ ОТКЛЮЧЕНО (защита от бана)
  // useEffect(() => {
  //   if (settings && user && hasSubscription && !authLoading && !subscriptionLoading) {
  //     console.log('🔄 AUTO: Обновляем баланс для биржи:', settings.exchange);
  //     setTimeout(() => {
  //       checkBalance();
  //     }, 1000);
  //   }
  // }, [settings?.exchange, user, hasSubscription, authLoading, subscriptionLoading]);

  const checkUser = async () => {
    console.log('🔑 DEV: Checking user...');
    const { data: { user } } = await supabase.auth.getUser();
    console.log('🔑 DEV: User found:', user?.email);
    setUser(user);
    setAuthLoading(false);
  };

  const checkSubscriptionForUser = async (currentUser: any) => {
    // Предотвращаем повторные проверки
    if (subscriptionCheckInProgress) {
      console.log('⚙️ SUBSCRIPTION CHECK IN PROGRESS - skipping');
      return;
    }
    
    console.log('🔍 SUBSCRIPTION CHECK START for:', currentUser?.email);
    subscriptionCheckInProgress = true;
    setSubscriptionLoading(true);
    
    try {
      if (!currentUser?.id) {
        console.log('❌ NO USER ID - blocking access');
        setHasSubscription(false);
        setSubscriptionLoading(false);
        return;
      }
      
      console.log('=== DEV: CHECKING SUBSCRIPTION ===');
      console.log('User email:', currentUser.email);
      console.log('User ID:', currentUser.id);
      
      const { data, error } = await supabase
        .from('user_subscriptions_dev')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString());
      
      console.log('DEV: Subscription check result:', { data, error });
      console.log('DEV: Data length:', data?.length);
      
      // Строгая проверка - должна быть активная подписка
      if (data && data.length > 0 && !error) {
        const subscription = data[0];
        const expiresAt = new Date(subscription.expires_at);
        const now = new Date();
        
        console.log('DEV: Subscription expires at:', expiresAt);
        console.log('DEV: Current time:', now);
        console.log('DEV: Is valid:', expiresAt > now);
        
        if (expiresAt > now) {
          console.log('✅ SUBSCRIPTION FOUND - User has access');
          setHasSubscription(true);
        } else {
          console.log('❌ SUBSCRIPTION EXPIRED - User needs to pay');
          setHasSubscription(false);
        }
      } else {
        console.log('❌ NO SUBSCRIPTION - User needs to pay');
        console.log('🔒 BLOCKING ACCESS - showing payment form');
        setHasSubscription(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasSubscription(false);
    } finally {
      setSubscriptionLoading(false);
      // Не сбрасываем subscriptionCheckInProgress чтобы предотвратить повторные проверки
    }
  };

  const checkSubscription = async () => {
    try {
      if (user) {
        await checkSubscriptionForUser(user);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasSubscription(false);
    } finally {
      setSubscriptionLoading(false);
    }
  };
  
  const checkAdminRights = async () => {
    try {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }
      
      console.log('DEV: Checking admin rights for:', user.email);
      
      if (user.email === 'cloudkroter@gmail.com') {
        console.log('DEV: Admin rights granted for cloudkroter@gmail.com');
        setIsAdmin(true);
        return;
      }
      
      const { data, error } = await supabase.rpc('is_admin_dev', {
        user_uuid: user.id
      });
      
      if (error) {
        console.error('Admin check error:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data || false);
        console.log('Admin check result for', user.email, ':', data);
        
        if (user.email === 'cloudkroter@gmail.com') {
          console.log('FORCE ADMIN: Setting admin to true for cloudkroter@gmail.com');
          setIsAdmin(true);
        }
      }
    } catch (error) {
      console.error('Error checking admin rights:', error);
      setIsAdmin(false);
    }
  };

  const callTradingAPI = async (action: string, additionalParams: any = {}, forceExchange?: string) => {
    // 🚨 УСИЛЕННАЯ ЗАЩИТА ОТ МНОЖЕСТВЕННЫХ НАЖАТИЙ
    if (actionInProgress === action || loading) {
      console.log('🚨 PROTECTION: Action', action, 'blocked - actionInProgress:', actionInProgress, 'loading:', loading);
      return { success: false, error: 'Action already in progress', blocked: true };
    }
    
    // 🚨 ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА НА МНОжЕСТВЕННЫЕ ВЫЗОВЫ
    if (action === 'place_order_with_tp_sl') {
      const now = Date.now();
      const lastOrderTime = localStorage.getItem('lastOrderTime');
      if (lastOrderTime && (now - parseInt(lastOrderTime)) < 10000) { // 10 секунд
        console.log('🚨 PROTECTION: Order blocked - too soon after last order');
        return { success: false, error: 'Please wait 10 seconds between orders', blocked: true };
      }
      localStorage.setItem('lastOrderTime', now.toString());
    }
    
    // 🚨 КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ БЕЗОПАСНОСТИ
    console.log('🚨 SECURITY: Trading API called:', action, 'by user action');
    console.trace('🚨 SECURITY: Call stack trace');
    
    try {
      setLoading(true);
      setActionInProgress(action);
      if (!user?.id) {
        throw new Error('Пользователь не авторизован');
      }
      
      console.log('DEV: Calling trading API:', { action, user_id: user.id });
      
      // 🔄 ПОЛУЧАЕМ АКТУАЛЬНЫЕ НАСТРОЙКИ ИЗ БАЗЫ
      const { data: currentSettings } = await supabase
        .from('trading_settings')
        .select('exchange')
        .eq('user_id', user.id)
        .single();
      
      // ✅ ПРАВИЛЬНАЯ ЛОГИКА: Приоритет forceExchange, потом сохраненные настройки
      const currentExchange = forceExchange || currentSelectedExchange || 'bybit'; // Приоритет: forceExchange > выбранная > bybit
      console.log('✅ ПРАВИЛЬНО: Используем выбранную биржу:', currentExchange);
      
      // Определяем функцию по актуальным настройкам
      let functionName;
      if (currentExchange === 'binance') {
        functionName = 'binance_quantity_fixed_v63_2025_11_10_21_10'; // 🌐 BINANCE QUANTITY FIXED
      } else if (currentExchange === 'bybit') {
        functionName = 'bybit_final_working_v62_2025_11_10_20_55'; // 🟦 BYBIT FINAL WORKING
      } else {
        functionName = 'bybit_final_working_v62_2025_11_10_20_55'; // По умолчанию Bybit
      }
      
      console.log('🎯 Using function:', functionName, 'for exchange:', currentExchange);
      
      const response = await supabase.functions.invoke(functionName, {
        body: {
          action,
          user_id: user.id,
          ...additionalParams
        }
      });

      if (response.error) throw response.error;
      
      return response.data;
    } catch (error: any) {
      toast({
        title: "Ошибка API",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
      setActionInProgress(null); // Сбрасываем состояние действия
    }
  };

  const checkBalance = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    try {
      console.log('Checking balance...');
      const result = await callTradingAPI('get_balance', {}, currentSelectedExchange);
      console.log('📝 ПРОВЕРКА БАЛАНСА НА БИРЖЕ:', currentSelectedExchange);
      console.log('Balance result:', result);
      
      // Рабочая функция с правильным accountType
      if (result) {
        console.log('🎯 SEPARATE FUNCTION RESULT:', JSON.stringify(result, null, 2));
        
        if (result.success && result.data) {
          console.log('✅ UNIVERSAL баланс:', result.data.available_balance, result.data.currency);
          console.log('✅ Биржа:', result.data.exchange, 'Статус:', result.data.status);
          
          if (result.data.exchange === 'BINANCE' && result.data.status.includes('LIVE')) {
            console.log('🎉 BINANCE РАБОТАЕТ! БАЛАНС:', result.data.available_balance, 'USDT');
          } else if (result.data.exchange === 'BYBIT' && result.data.status.includes('TESTNET')) {
            console.log('⚠️ BYBIT TESTNET:', result.data.available_balance, 'USDT');
          } else {
            console.log('✅ Баланс с', result.data.exchange, ':', result.data.available_balance);
          }
        } else if (!result.success && result.error) {
          console.log('❌ Ошибка Bybit:', result.error);
          if (result.error.includes('accountType')) {
            console.log('✅ Проблема с accountType - исправляем');
          }
        }
      }
      
      // Если есть ошибка, показываем её
      if (result && result.error) {
        console.log('❌ DIAGNOSTIC ERROR:', result.error);
        console.log('❌ ERROR TYPE:', result.error_type);
        console.log('❌ ERROR STACK:', result.stack);
      }
      
      if (result && result.success && result.data) {
        console.log('💰 Setting balance data:', result.data);
        setBalance(result.data);
      } else {
        console.error('No balance data received');
        toast({
          title: "Ошибка",
          description: "Не удалось получить данные баланса",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Balance check error:', error);
      toast({
        title: "Ошибка проверки баланса",
        description: error.message || 'Неизвестная ошибка',
        variant: "destructive",
      });
    }
  };

  // 💰 ФУНКЦИЯ СКАНИРОВАНИЯ ФАНДИНГА
  const scanFundingRates = async () => {
    try {
      const result = await callTradingAPI('scan_funding');
      console.log('💰 Funding scan result:', result);
      
      // Если это диагностическая функция, показываем детальную информацию
      if (result && result.diagnostic) {
        console.log('🔍 FUNDING DIAGNOSTIC INFO:', JSON.stringify(result.diagnostic, null, 2));
      }
      
      if (result && result.success && result.data) {
        const data = result.data;
        
        // Проверяем структуру данных
        if (data.best_funding && data.best_funding.funding_rate !== undefined) {
          toast({
            title: "💰 Фандинг просканирован!",
            description: `${data.best_funding.exchange} ${data.best_funding.symbol}: ${data.best_funding.funding_rate.toFixed(4)}% - ${data.best_funding.funding_direction}`,
          });
        } else {
          toast({
            title: "💰 Сканирование завершено",
            description: `Проверено ${data.exchanges_scanned || 0} бирж, найдено ${data.successful_scans || 0} фандингов`,
          });
        }
      } else {
        toast({
          title: "⚠️ Нет данных",
          description: 'Не удалось получить данные о фандинге',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('💰 Funding scan error:', error);
      toast({
        title: "⚠️ Ошибка сканирования",
        description: error.message || 'Не удалось просканировать фандинг',
        variant: "destructive",
      });
    }
  };

  const placeHourlyOrder = async () => {
    // 🚨 КРИТИЧЕСКАЯ ПРОВЕРКА БЕЗОПАСНОСТИ
    const confirmed = confirm('🚨 ВНИМАНИЕ! Вы собираетесь разместить РЕАЛЬНЫЙ ордер на Binance на $' + settings.order_amount_usd + '. Продолжить?');
    
    if (!confirmed) {
      console.log('🚨 Пользователь отменил размещение ордера');
      return;
    }
    
    console.log('🚨 Пользователь ПОДТВЕРДИЛ размещение ордера на $' + settings.order_amount_usd);
    
    try {
      const result = await callTradingAPI('place_order_with_tp_sl', {}, currentSelectedExchange);
      console.log('📝 РАЗМЕЩЕНИЕ ОРДЕРА НА БИРЖЕ:', currentSelectedExchange);
      console.log('🟟 BINANCE ORDER result:', result);
      console.log('🟟 BINANCE ORDER data:', JSON.stringify(result.data, null, 2));
      
      if (result.success && result.data && result.data.message && result.data.message.includes('BINANCE')) {
        console.log('🎉 BINANCE ОРДЕР РАЗМЕЩЕН!', result.data.order_id);
        console.log('🎯 TP:', result.data.tp_price, '| SL:', result.data.sl_price);
        console.log('💰 Количество:', result.data.quantity, '| Цена:', result.data.price);
        console.log('🟟 TP Order ID:', result.data.tp_order_id, '| SL Order ID:', result.data.sl_order_id);
      } else if (!result.success && result.error) {
        console.log('❌ BINANCE ОШИБКА:', result.error);
      }
      
      if (!result.success) {
        console.error('❌ Order error details:', result);
      }
      
      if (result && result.success && result.data) {
        const orderData = result.data;
        let description = `${result.exchange} - Order: ${orderData.order_id}`;
        
        // Добавляем информацию о TP/SL если они есть
        if (orderData.tp_order_id) {
          description += ` | TP: ${orderData.tp_order_id}`;
        }
        if (orderData.sl_order_id) {
          description += ` | SL: ${orderData.sl_order_id}`;
        }
        
        toast({
          title: "🕰️ Почасовой ордер с TP/SL размещен!",
          description: description,
        });
      }
    } catch (error) {
      // Error already handled in callTradingAPI
    }
  };

  const cancelAllOrders = async () => {
    try {
      await callTradingAPI('cancel_orders');
      toast({
        title: "❌ Ордера отменены",
        description: "Все активные ордера отменены",
      });
    } catch (error) {
      // Error already handled in callTradingAPI
    }
  };

  const closeAllPositions = async () => {
    try {
      console.log('🔴 Starting close positions...');
      const result = await callTradingAPI('close_positions');
      console.log('🟟 BINANCE CLOSE result:', result);
      console.log('🟟 BINANCE CLOSE data:', JSON.stringify(result.data, null, 2));
      
      if (result.success && result.data) {
        if (result.data.closed_positions > 0) {
          console.log('🎉 BINANCE ПОЗИЦИИ ЗАКРЫТЫ!', result.data.closed_positions, 'из', result.data.total_positions_found);
          console.log('🟟 Закрыто позиций:', result.data.close_results?.length || 0);
          result.data.close_results?.forEach((closeResult: any, index: number) => {
            console.log(`🟟 Позиция ${index + 1}:`, closeResult.status, '| Order ID:', closeResult.order_id);
          });
        } else if (result.data.status === 'NO_POSITIONS') {
          console.log('ℹ️ BINANCE: Нет открытых позиций для закрытия');
        } else {
          console.log('❌ BINANCE: Ошибка закрытия позиций');
        }
      }
      
      const closedCount = result.data?.closed_positions || 0;
      const totalPositions = result.data?.total_positions || 0;
      
      toast({
        title: "🔴 Позиции закрыты",
        description: `Закрыто ${closedCount} из ${totalPositions} позиций`,
      });
    } catch (error) {
      // Error already handled in callTradingAPI
    }
  };

  const toggleAutoTrading = async (enable?: boolean) => {
    try {
      const newEnabled = enable !== undefined ? enable : !autoTradingEnabled;
      
      console.log('🔄 АВТОТОРГОВЛЯ: Переключение автоторговли на:', newEnabled);
      
      // ВКЛЮЧЕНО: Автоматическая торговля восстановлена
      const response = await supabase.functions.invoke('hourly_trading_bot_2025_11_06_12_23', {
        body: {
          action: 'toggle_trading',
          exchange: settings.exchange,
          enabled: newEnabled
        }
      });

      if (response.data?.success) {
        setAutoTradingEnabled(newEnabled);
        toast({
          title: newEnabled ? "Автоторговля запущена" : "Автоторговля остановлена",
          description: newEnabled 
            ? "Почасовой бот запущен и будет торговать каждый час" 
            : "Почасовой бот остановлен",
        });
      } else {
        throw new Error(response.error?.message || 'Не удалось изменить статус автоторговли');
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || 'Не удалось изменить статус автоторговли',
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => window.location.reload()} />;
  }

  // Определяем доступ
  const isAdminUser = user?.email === 'cloudkroter@gmail.com' || isAdmin;
  // СТРОГАЯ ПРОВЕРКА: только подписка дает доступ + защита от мелькания
  const shouldShowTrading = hasSubscription && !subscriptionLoading && user;
  const shouldShowPayment = !hasSubscription && !subscriptionLoading && user;
  const shouldShowLoading = subscriptionLoading || !user;

  console.log('📺 UI Decision:', {
    userEmail: user?.email,
    isAdmin: isAdminUser,
    hasSubscription,
    subscriptionLoading,
    shouldShowTrading,
    shouldShowPayment,
    finalDecision: shouldShowTrading ? 'SHOW_TRADING' : (shouldShowPayment ? 'SHOW_PAYMENT' : 'LOADING')
  });

  // Защита от мелькания - показываем загрузку пока не проверили подписку
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Проверяем доступ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Crypto Trading Bot</h1>
            <p className="text-muted-foreground">Автоматическая торговля по времени фандинга</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={autoTradingEnabled ? "default" : "secondary"}>
              {autoTradingEnabled ? "Активен" : "Неактивен"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => supabase.auth.signOut()}
            >
              Выйти
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {shouldShowTrading ? (
          // Основной интерфейс торгового бота
          <Tabs defaultValue="trading" className="space-y-4">
            <TabsList className={`grid w-full ${isAdminUser ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="trading">Торговля</TabsTrigger>
              <TabsTrigger value="api-keys">API Ключи</TabsTrigger>
              {isAdminUser && (
                <TabsTrigger value="admin">
                  <Crown className="h-4 w-4 mr-1" />
                  Админ
                </TabsTrigger>
              )}
            </TabsList>

            {/* Trading Tab */}
            <TabsContent value="trading" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Button onClick={checkBalance} disabled={loading} className="h-16 w-full">
                    <div className="text-center">
                      <DollarSign className="h-6 w-6 mx-auto mb-1" />
                      <div className="text-sm">Проверить баланс</div>
                    </div>
                  </Button>
                  {balance && (
                    <div className="text-center p-2 bg-green-50 rounded border">
                      <div className="text-sm font-semibold text-green-800">
                        💰 Баланс: {balance.available_balance} {balance.currency}
                      </div>
                      <div className="text-xs text-green-600">
                        {balance.exchange} - {balance.status}
                      </div>
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={() => toggleAutoTrading(true)} 
                  disabled={loading || autoTradingEnabled} 
                  variant="default" 
                  className="h-16 bg-green-600 hover:bg-green-700"
                >
                  <div className="text-center">
                    <Play className="h-6 w-6 mx-auto mb-1" />
                    <div className="text-sm">🚀 Старт бот</div>
                  </div>
                </Button>
                
                <Button 
                  onClick={() => toggleAutoTrading(false)} 
                  disabled={loading || !autoTradingEnabled} 
                  variant="destructive" 
                  className="h-16"
                >
                  <div className="text-center">
                    <Square className="h-6 w-6 mx-auto mb-1" />
                    <div className="text-sm">⛔ Стоп бот</div>
                  </div>
                </Button>
                
                <Button onClick={placeHourlyOrder} disabled={loading} variant="default" className="h-16">
                  <div className="text-center">
                    <TrendingDown className="h-6 w-6 mx-auto mb-1" />
                    <div className="text-sm">🕰️ Почасовой ордер</div>
                  </div>
                </Button>
                
                {/* Кнопка фандинг-сканера только для админа */}
                {isAdminUser && (
                  <Button onClick={scanFundingRates} disabled={loading} variant="default" className="h-16 bg-blue-600 hover:bg-blue-700">
                    <div className="text-center">
                      <DollarSign className="h-6 w-6 mx-auto mb-1" />
                      <div className="text-sm">💰 Скан фандинга</div>
                    </div>
                  </Button>
                )}
                

              </div>
              
              {/* Кнопки управления позициями и ордерами */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Button onClick={cancelAllOrders} disabled={loading} variant="destructive" className="h-16">
                  <div className="text-center">
                    <X className="h-6 w-6 mx-auto mb-1" />
                    <div className="text-sm">❌ Отменить все ордера</div>
                  </div>
                </Button>
                
                <Button onClick={closeAllPositions} disabled={loading} variant="destructive" className="h-16">
                  <div className="text-center">
                    <TrendingDown className="h-6 w-6 mx-auto mb-1" />
                    <div className="text-sm">🔴 Закрыть все позиции</div>
                  </div>
                </Button>
              </div>
              
              {/* Настройки торговли на странице торговли */}
              {/* Настройки торговли на странице торговли */}
              <div className="mt-6">
                <TradingSettingsFixed 
                  user={user} 
                  onExchangeChange={setCurrentSelectedExchange}
                  currentExchange={currentSelectedExchange}
                />
              </div>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="api-keys" className="space-y-4">
              <ApiKeysWithPassphrase />
            </TabsContent>



            {/* Admin Tab */}
            {isAdminUser && (
              <TabsContent value="admin" className="space-y-4">
                <AdminPanel user={user} isAdmin={true} />
              </TabsContent>
            )}
          </Tabs>
        ) : (
          // Показываем форму оплаты
          (() => {
            const shouldShowPayment = !hasSubscription; // Все должны платить, включая админа
            
            console.log('💳 Payment Decision:', {
              userEmail: user?.email,
              isAdmin: isAdminUser,
              hasSubscription,
              shouldShowPayment,
              decision: shouldShowPayment ? 'SHOW_PAYMENT_FORM' : 'SHOW_NOTHING'
            });
            
            if (shouldShowPayment) {
              return <WorkingPayment user={user} onPaymentSuccess={() => window.location.reload()} />;
            }
            
            return <div>Загрузка...</div>;
          })()
        )}
      </div>
    </div>
  );
};

export default TradingDashboard;