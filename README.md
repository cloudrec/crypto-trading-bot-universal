# Crypto Trading Bot Universal

## 🚀 Универсальная торговая система для криптобирж

### ✅ Поддерживаемые биржи:
- Bybit 🟡
- Binance 🟨  
- Gate.io 🟦
- Huobi (HTX) 🔴
- OKX ⚫
- Bitget 🟣
- KuCoin 🟢
- MEXC 🔵

### 🔧 Технологии:
- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Supabase Edge Functions
- **Database:** Supabase PostgreSQL
- **API:** Реальные API всех бирж с HMAC подписями

### 📊 Функционал:
- ✅ Размещение тестовых и реальных ордеров
- ✅ Управление API ключами
- ✅ Автоматические расчеты плеча и суммы
- ✅ Поддержка всех типов ордеров
- ✅ Логирование и мониторинг

### 🛡️ Безопасность:
- API ключи хранятся в Supabase Secrets
- CORS защита
- JWT аутентификация
- Шифрование HMAC SHA256/SHA512

### 🚀 Edge Functions:
- `working_trading_2025_11_13_01_40` - Основная торговая функция
- Поддержка всех 8 бирж
- Реальные API подписи
- Автоматическая проверка API ключей

### 📱 Развертывание:
- **Тестовое приложение:** https://r7smfiakz9.skywork.website
- **Supabase проект:** scwnehuyklltcnhgychz.supabase.co

### 🔑 API ключи (настроены в Supabase):
- BYBIT_API_KEY / BYBIT_API_SECRET
- BINANCE_API_KEY / BINANCE_API_SECRET
- Остальные биржи - добавляются через интерфейс

### 📝 Последние изменения:
- Создана универсальная Edge Function для всех бирж
- Исправлены CORS ошибки
- Добавлена поддержка новых бирж (Huobi, Bitget)
- Обновлен интерфейс управления API ключами

### 🛠️ Установка:
```bash
npm install
npm run build
npm run dev
```

### 📦 Структура проекта:
```
src/
├── components/          # React компоненты
├── integrations/        # Supabase клиент
└── ...

supabase/
├── edge_function/       # Edge Functions
├── migrations/          # SQL миграции
└── ...
```

---

**Создано:** 2025-11-13  
**Статус:** Активная разработка  
**Версия:** 1.0.0