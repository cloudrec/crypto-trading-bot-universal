import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, user_id, exchange } = await req.json();
    console.log(`🔍 BALANCE CCXT APPROACH: ${action} for ${exchange || 'all exchanges'}`);

    if (action === 'check_balance' && exchange) {
      return await checkSingleExchangeBalance(supabaseClient, user_id, exchange);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Неизвестное действие или отсутствует exchange' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ BALANCE CCXT APPROACH Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Проверка баланса одной биржи
async function checkSingleExchangeBalance(supabaseClient: any, user_id: string, exchange: string) {
  console.log(`🔍 BALANCE CCXT APPROACH: Checking ${exchange}`);

  // Пробуем обе таблицы
  let apiKeys = null;
  
  // Сначала пробуем новую таблицу
  const { data: newKeys, error: newKeysError } = await supabaseClient
    .from('api_keys_2025_11_12_05_30')
    .select('*')
    .eq('user_id', user_id)
    .eq('exchange', exchange)
    .single();

  if (newKeys && !newKeysError) {
    apiKeys = newKeys;
    console.log(`🔍 Найдены ключи в новой таблице api_keys_2025_11_12_05_30`);
  } else {
    // Пробуем старую таблицу
    const { data: oldKeys, error: oldKeysError } = await supabaseClient
      .from('api_keys_dev')
      .select('*')
      .eq('user_id', user_id)
      .eq('exchange', exchange)
      .single();

    if (oldKeys && !oldKeysError) {
      apiKeys = oldKeys;
      console.log(`🔍 Найдены ключи в старой таблице api_keys_dev`);
    }
  }

  if (!apiKeys) {
    console.log(`❌ API ключи для ${exchange} не найдены в обеих таблицах`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `API ключи для ${exchange} не найдены`,
        balance: 'N/A'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`🔍 Найдены ключи для ${exchange}:`, {
    api_key: apiKeys.api_key ? `${apiKeys.api_key.substring(0, 8)}...` : 'пусто',
    secret: (apiKeys.secret || apiKeys.api_secret) ? `${(apiKeys.secret || apiKeys.api_secret).substring(0, 8)}...` : 'пусто',
    passphrase: apiKeys.passphrase ? '***' : 'пусто'
  });

  const secretKey = apiKeys.secret || apiKeys.api_secret;
  if (!apiKeys.api_key || !secretKey) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'API ключи отсутствуют',
        balance: 'N/A'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    let balance = 0;
    let currency = 'USDT';

    switch (exchange) {
      case 'binance':
        balance = await getBinanceBalance(apiKeys);
        break;
      case 'bybit':
        balance = await getBybitBalance(apiKeys);
        break;
      case 'mexc':
        balance = await getMexcBalanceCCXT(apiKeys);
        break;
      case 'gate':
        balance = await getGateBalance(apiKeys);
        break;
      case 'okx':
        balance = await getOkxBalance(apiKeys);
        break;
      case 'kucoin':
        balance = await getKucoinBalance(apiKeys);
        break;
      default:
        throw new Error(`Неподдерживаемая биржа: ${exchange}`);
    }

    console.log(`✅ ${exchange} баланс получен: ${balance} ${currency}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        balance: parseFloat(balance).toFixed(2),
        currency,
        exchange
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ ${exchange} balance error:`, error.message);
    
    let errorMessage = error.message;
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMessage = 'Ошибка авторизации (Неверные ключи)';
    } else if (error.message.includes('timeout') || error.message.includes('network')) {
      errorMessage = 'Ошибка сети/Таймаут';
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        balance: 'N/A'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// MEXC Balance - ПРАВИЛЬНЫЙ CCXT ПОДХОД
async function getMexcBalanceCCXT(apiKeys: any) {
  console.log('🟠 MEXC CCXT APPROACH: Getting balance like in your example');
  
  try {
    const secretKey = apiKeys.secret || apiKeys.api_secret;
    
    console.log(`MEXC CCXT request details:`, {
      api_key: apiKeys.api_key.substring(0, 8) + '...',
      secret_field: apiKeys.secret ? 'secret' : 'api_secret',
      approach: 'CCXT-like futures balance'
    });
    
    // ПРАВИЛЬНО: Используем подход как в вашем примере
    // Делаем запрос к futures balance endpoint
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = await createMEXCSignature(queryString, secretKey);
    
    // ИСПРАВЛЕНО: Используем правильный endpoint для futures баланса
    const response = await fetch(`https://contract.mexc.com/api/v1/private/account/assets?${queryString}&signature=${signature}`, {
      method: 'GET',
      headers: {
        'ApiKey': apiKeys.api_key,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`MEXC CCXT API error response:`, errorText);
      throw new Error(`MEXC API error: HTTP ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('MEXC CCXT API response:', data);
    
    if (!data.success) {
      throw new Error(`MEXC API error: ${data.errorMsg || data.message || 'Unknown error'}`);
    }

    // ПРАВИЛЬНО: Ищем USDT как в вашем примере
    const usdtAsset = data.data?.find((asset: any) => asset.currency === 'USDT');
    
    // ИСПРАВЛЕНО: Используем правильное поле для баланса
    let balance = 0;
    if (usdtAsset) {
      // Пробуем разные поля как в CCXT
      balance = parseFloat(usdtAsset.availableBalance || usdtAsset.equity || usdtAsset.balance || usdtAsset.total || '0');
    }
    
    console.log('🟠 MEXC CCXT: Balance extracted:', balance);
    
    return balance;
    
  } catch (error) {
    console.error('❌ MEXC CCXT balance error:', error.message);
    throw error;
  }
}

// MEXC Signature - ПРАВИЛЬНАЯ ВЕРСИЯ
async function createMEXCSignature(queryString: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(queryString);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hexSignature = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return hexSignature;
}

// Остальные функции остаются такими же
async function getBinanceBalance(apiKeys: any) {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  
  const secretKey = apiKeys.secret || apiKeys.api_secret;
  const signature = await createHmacSignature(queryString, secretKey);
  
  const response = await fetch(`https://fapi.binance.com/fapi/v2/balance?${queryString}&signature=${signature}`, {
    method: 'GET',
    headers: {
      'X-MBX-APIKEY': apiKeys.api_key,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Binance API error: HTTP ${response.status}`);
  }

  const data = await response.json();
  const usdtBalance = data.find((asset: any) => asset.asset === 'USDT');
  return usdtBalance ? parseFloat(usdtBalance.balance) : 0;
}

async function getBybitBalance(apiKeys: any) {
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  const queryString = 'accountType=UNIFIED';
  
  const secretKey = apiKeys.secret || apiKeys.api_secret;
  const signature = await createBybitSignature(timestamp, apiKeys.api_key, recvWindow, queryString, secretKey);
  
  const response = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
    method: 'GET',
    headers: {
      'X-BAPI-API-KEY': apiKeys.api_key,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'X-BAPI-SIGN': signature,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Bybit API error: HTTP ${response.status}`);
  }

  const data = await response.json();
  
  if (data.retCode !== 0) {
    throw new Error(`Bybit API error: ${data.retMsg}`);
  }

  if (data.result?.list?.[0]?.coin) {
    const usdtCoin = data.result.list[0].coin.find((coin: any) => coin.coin === 'USDT');
    return usdtCoin ? parseFloat(usdtCoin.walletBalance) : 0;
  }
  
  return 0;
}

async function getGateBalance(apiKeys: any) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'GET';
  const url = '/api/v4/futures/usdt/accounts';
  const queryString = '';
  const bodyHash = await createSha512Hash('');
  
  const message = `${method}\n${url}\n${queryString}\n${bodyHash}\n${timestamp}`;
  const secretKey = apiKeys.secret || apiKeys.api_secret;
  const signature = await createHmacSignature(message, secretKey, 'SHA-512');
  
  const response = await fetch(`https://api.gateio.ws${url}`, {
    method: 'GET',
    headers: {
      'KEY': apiKeys.api_key,
      'Timestamp': timestamp,
      'SIGN': signature,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Gate.io API error: HTTP ${response.status}`);
  }

  const data = await response.json();
  
  if (data.available !== undefined) {
    return parseFloat(data.available);
  } else if (data.total !== undefined) {
    return parseFloat(data.total);
  } else if (data.balance !== undefined) {
    return parseFloat(data.balance);
  }
  
  return 0;
}

async function getOkxBalance(apiKeys: any) {
  const timestamp = new Date().toISOString();
  const method = 'GET';
  const requestPath = '/api/v5/account/balance';
  const body = '';
  
  const message = timestamp + method + requestPath + body;
  const secretKey = apiKeys.secret || apiKeys.api_secret;
  const signature = await createHmacSignatureBase64(message, secretKey);
  
  const response = await fetch(`https://www.okx.com${requestPath}`, {
    method: 'GET',
    headers: {
      'OK-ACCESS-KEY': apiKeys.api_key,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': apiKeys.passphrase || '',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`OKX API error: HTTP ${response.status}`);
  }

  const data = await response.json();
  
  if (data.code !== '0') {
    throw new Error(`OKX API error: ${data.msg}`);
  }

  const usdtBalance = data.data?.[0]?.details?.find((detail: any) => detail.ccy === 'USDT');
  return usdtBalance ? parseFloat(usdtBalance.availBal) : 0;
}

async function getKucoinBalance(apiKeys: any) {
  const timestamp = Date.now().toString();
  const method = 'GET';
  const endpoint = '/api/v1/account-overview?currency=USDT';
  const body = '';
  
  const message = timestamp + method + endpoint + body;
  const secretKey = apiKeys.secret || apiKeys.api_secret;
  const signature = await createHmacSignatureBase64(message, secretKey);
  
  const passphrase = apiKeys.passphrase ? 
    await createHmacSignatureBase64(apiKeys.passphrase, secretKey) : 
    '';
  
  const response = await fetch(`https://api-futures.kucoin.com${endpoint}`, {
    method: 'GET',
    headers: {
      'KC-API-KEY': apiKeys.api_key,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': timestamp,
      'KC-API-PASSPHRASE': passphrase,
      'KC-API-KEY-VERSION': '2',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`KuCoin API error: HTTP ${response.status}`);
  }

  const data = await response.json();
  
  if (data.code !== '200000') {
    throw new Error(`KuCoin API error: ${data.msg}`);
  }

  return data.data?.availableBalance ? parseFloat(data.data.availableBalance) : 0;
}

// Утилиты для подписей
async function createHmacSignature(message: string, secret: string, algorithm: string = 'SHA-256') {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createHmacSignatureBase64(message: string, secret: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function createBybitSignature(timestamp: string, apiKey: string, recvWindow: string, queryString: string, secret: string) {
  const message = timestamp + apiKey + recvWindow + queryString;
  return await createHmacSignature(message, secret);
}

async function createSha512Hash(data: string) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-512', dataBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}