-- Создание таблицы настроек торговли если её нет
CREATE TABLE IF NOT EXISTS public.trading_settings_2025_11_12_05_30 (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exchange TEXT NOT NULL,
    base_currency TEXT DEFAULT 'BTC',
    quote_currency TEXT DEFAULT 'USDT',
    order_amount TEXT DEFAULT '100',
    leverage TEXT DEFAULT '1',
    side TEXT DEFAULT 'Buy',
    stop_loss TEXT DEFAULT '2',
    take_profit TEXT DEFAULT '5',
    delay_ms TEXT DEFAULT '1000',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, exchange)
);

-- Включаем RLS
ALTER TABLE public.trading_settings_2025_11_12_05_30 ENABLE ROW LEVEL SECURITY;

-- Политика для пользователей - могут видеть только свои настройки
CREATE POLICY "Users can view own trading settings" ON public.trading_settings_2025_11_12_05_30
    FOR SELECT USING (auth.uid() = user_id);

-- Политика для пользователей - могут изменять только свои настройки
CREATE POLICY "Users can update own trading settings" ON public.trading_settings_2025_11_12_05_30
    FOR ALL USING (auth.uid() = user_id);

-- Индекс для быстрого поиска по пользователю и бирже
CREATE INDEX IF NOT EXISTS idx_trading_settings_user_exchange 
ON public.trading_settings_2025_11_12_05_30(user_id, exchange);

-- Проверяем что таблица создана
SELECT 'Таблица trading_settings_2025_11_12_05_30 готова к использованию' as status;