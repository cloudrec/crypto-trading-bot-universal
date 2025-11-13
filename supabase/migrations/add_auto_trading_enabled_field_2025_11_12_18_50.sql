-- Добавляем поле auto_trading_enabled в таблицу настроек торговли
ALTER TABLE trading_settings_2025_11_12_05_30 
ADD COLUMN IF NOT EXISTS auto_trading_enabled BOOLEAN DEFAULT false;

-- Обновляем существующие записи
UPDATE trading_settings_2025_11_12_05_30 
SET auto_trading_enabled = false 
WHERE auto_trading_enabled IS NULL;

-- Добавляем комментарий к полю
COMMENT ON COLUMN trading_settings_2025_11_12_05_30.auto_trading_enabled IS 'Включены ли автоматические ордеры для данной биржи';