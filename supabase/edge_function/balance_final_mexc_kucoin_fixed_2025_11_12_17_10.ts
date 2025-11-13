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
    console.log(`🔍 BALANCE FINAL: ${action} for ${exchange || 'all exchanges'}`);

    if (action === 'check_balance' && exchange) {
      return await checkSingleExchangeBalance(supabaseClient, user_id, exchange);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Неизвестное действие или отсутствует exchange' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ BALANCE FINAL Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Проверка баланса одной биржи
async function checkSingleExchangeBalance(supabaseClient: any, user_id: string, exchange: string) {
  console.log(`🔍 BALANCE FINAL: Checking ${exchange}`);

  // Получаем API ключи
  const { data: apiKeys, error: keysError } = await supabaseClient
    .from('api_keys_2025_11_12_05_30')
    .select('*')
    .eq('user_id', user_id)
    .eq('exchange', exchange)
    .single();

  if (keysError || !apiKeys) {
    console.log(`❌ API ключи для ${exchange} не найдены:`, keysError);
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
    secret: apiKeys.secret ? `${apiKeys.secret.substring(0, 8)}...` : 'пусто',
    passphrase: apiKeys.passphrase ? '***' : 'пусто'
  });

  if (!apiKeys.api_key || !apiKeys.secret) {
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
        balance = await getMexcBalance(apiKeys);
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

// Binance Futures Balance
async function getBinanceBalance(apiKeys: any) {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  
  const signature = await createHmacSignature(queryString, apiKeys.secret);
  
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

// Bybit Balance
async function getBybitBalance(apiKeys: any) {
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  const queryString = 'accountType=UNIFIED';
  
  const signature = await createBybitSignature(timestamp, apiKeys.api_key, recvWindow, queryString, apiKeys.secret);
  
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

  // Ищем USDT баланс
  if (data.result?.list?.[0]?.coin) {
    const usdtCoin = data.result.list[0].coin.find((coin: any) => coin.coin === 'USDT');
    return usdtCoin ? parseFloat(usdtCoin.walletBalance) : 0;
  }
  
  return 0;
}

// MEXC Balance - ИСПРАВЛЕННЫЙ ENDPOINT
async function getMexcBalance(apiKeys: any) {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  
  const signature = await createHmacSignature(queryString, apiKeys.secret);
  
  // ИСПРАВЛЕН: Используем правильный endpoint для MEXC futures
  const response = await fetch(`https://contract.mexc.com/api/v1/private/account/assets?${queryString}&signature=${signature}`, {
    method: 'GET',
    headers: {
      'ApiKey': apiKeys.api_key,
      'Request-Time': timestamp.toString(),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`MEXC API error response:`, errorText);
    throw new Error(`MEXC API error: HTTP ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('MEXC API response:', data);
  
  if (!data.success) {
    throw new Error(`MEXC API error: ${data.code} - ${data.message || 'Unknown error'}`);
  }

  const usdtAsset = data.data?.find((asset: any) => asset.currency === 'USDT');
  return usdtAsset ? parseFloat(usdtAsset.availableBalance || usdtAsset.equity || 0) : 0;
}

// Gate.io Balance
async function getGateBalance(apiKeys: any) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'GET';
  const url = '/api/v4/futures/usdt/accounts';
  const queryString = '';
  const bodyHash = await createSha512Hash('');
  
  const message = `${method}\n${url}\n${queryString}\n${bodyHash}\n${timestamp}`;
  const signature = await createHmacSignature(message, apiKeys.secret, 'SHA-512');
  
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
  return data.total ? parseFloat(data.total) : 0;
}

// OKX Balance
async function getOkxBalance(apiKeys: any) {
  const timestamp = new Date().toISOString();
  const method = 'GET';
  const requestPath = '/api/v5/account/balance';
  const body = '';
  
  const message = timestamp + method + requestPath + body;
  const signature = await createHmacSignatureBase64(message, apiKeys.secret);
  
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

// KuCoin Balance - ИСПРАВЛЕННЫЙ PASSPHRASE
async function getKucoinBalance(apiKeys: any) {
  const timestamp = Date.now().toString();
  const method = 'GET';
  const endpoint = '/api/v1/account-overview?currency=USDT';
  const body = '';
  
  const message = timestamp + method + endpoint + body;
  const signature = await createHmacSignatureBase64(message, apiKeys.secret);
  
  // ИСПРАВЛЕНО: Passphrase должен быть подписан отдельно
  const passphrase = apiKeys.passphrase ? 
    await createHmacSignatureBase64(apiKeys.passphrase, apiKeys.secret) : 
    '';
  
  console.log(`KuCoin request details:`, {
    endpoint,
    timestamp,
    signature: signature.substring(0, 10) + '...',
    passphrase: passphrase ? passphrase.substring(0, 10) + '...' : 'empty'
  });
  
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
    const errorText = await response.text();
    console.error(`KuCoin API error response:`, errorText);
    throw new Error(`KuCoin API error: HTTP ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('KuCoin API response:', data);
  
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