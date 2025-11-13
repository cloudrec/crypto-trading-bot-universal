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

    const { action, user_id, exchange, symbol, side, order_type, quantity, price, leverage, order_amount_usdt } = await req.json();
    console.log(`🔍 MEXC BYPASS FUTURES: ${action} for ${exchange}`);

    if (action === 'place_order_with_tp_sl' && exchange === 'mexc') {
      return await placeMexcFuturesOrder(supabaseClient, user_id, {
        symbol,
        side,
        order_type,
        quantity,
        price,
        leverage,
        order_amount_usdt
      });
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Неизвестное действие или не MEXC' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ MEXC BYPASS FUTURES Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// MEXC Futures Order - ОБХОДНОЙ API
async function placeMexcFuturesOrder(supabaseClient: any, user_id: string, orderParams: any) {
  console.log(`🟠 MEXC BYPASS: Placing futures order`, orderParams);

  // Получаем API ключи из обеих таблиц
  let apiKeys = null;
  
  const { data: newKeys, error: newKeysError } = await supabaseClient
    .from('api_keys_2025_11_12_05_30')
    .select('*')
    .eq('user_id', user_id)
    .eq('exchange', 'mexc')
    .single();

  if (newKeys && !newKeysError) {
    apiKeys = newKeys;
    console.log(`🔍 Найдены ключи в новой таблице`);
  } else {
    const { data: oldKeys, error: oldKeysError } = await supabaseClient
      .from('api_keys_dev')
      .select('*')
      .eq('user_id', user_id)
      .eq('exchange', 'mexc')
      .single();

    if (oldKeys && !oldKeysError) {
      apiKeys = oldKeys;
      console.log(`🔍 Найдены ключи в старой таблице`);
    }
  }

  if (!apiKeys) {
    throw new Error('API ключи MEXC не найдены');
  }

  const secretKey = apiKeys.secret || apiKeys.api_secret;
  if (!apiKeys.api_key || !secretKey) {
    throw new Error('API ключи MEXC отсутствуют');
  }

  try {
    // ОБХОДНОЙ ПОДХОД 1: Попробуем альтернативный endpoint
    const result = await placeMexcBypassOrder(apiKeys, orderParams);
    
    console.log('✅ MEXC BYPASS: Order placed successfully', result);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        order_id: result.orderId || result.id,
        message: 'Ордер размещен через обходной API',
        details: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ MEXC BYPASS order error:', error.message);
    
    // Если обходной API не работает, возвращаем информативную ошибку
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `MEXC Futures API недоступен: ${error.message}`,
        suggestion: 'Попробуйте использовать другую биржу (Bybit, Binance, Gate.io)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// MEXC BYPASS Order - ОБХОДНОЙ МЕТОД
async function placeMexcBypassOrder(apiKeys: any, orderParams: any) {
  console.log('🟠 MEXC BYPASS: Trying alternative futures API approach');
  
  const secretKey = apiKeys.secret || apiKeys.api_secret;
  
  // ПОДХОД 1: Попробуем использовать WebSocket подход (как в обходных API)
  try {
    return await placeMexcWebSocketOrder(apiKeys, orderParams);
  } catch (wsError) {
    console.log('🟠 WebSocket approach failed, trying REST bypass');
    
    // ПОДХОД 2: Попробуем REST с другими параметрами
    return await placeMexcRestBypass(apiKeys, orderParams);
  }
}

// ПОДХОД 1: WebSocket-based order (как в обходных решениях)
async function placeMexcWebSocketOrder(apiKeys: any, orderParams: any) {
  console.log('🟠 MEXC BYPASS: WebSocket-based order approach');
  
  // Этот подход имитирует браузерную сессию
  const timestamp = Date.now();
  const { symbol, side, order_type, price, quantity } = orderParams;
  
  // Специальная подпись для WebSocket API
  const wsSignature = await createMexcWebSocketSignature(apiKeys, timestamp, {
    symbol,
    side: side.toLowerCase(),
    type: order_type.toLowerCase(),
    price: price || '0',
    quantity: quantity || '1'
  });
  
  // Используем альтернативный endpoint
  const response = await fetch('https://contract.mexc.com/api/v1/private/order/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': 'https://futures.mexc.com',
      'Referer': 'https://futures.mexc.com/',
      'ApiKey': apiKeys.api_key,
      'Request-Time': timestamp.toString(),
      'Signature': wsSignature
    },
    body: JSON.stringify({
      symbol,
      side: side.toLowerCase(),
      type: order_type.toLowerCase(),
      price: price || null,
      vol: quantity || 1,
      leverage: orderParams.leverage || 10,
      openType: 2, // Cross margin
      positionId: 1,
      externalOid: `bypass_${timestamp}`,
      timestamp
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WebSocket bypass failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`WebSocket bypass error: ${data.message || data.errorMsg}`);
  }

  return data.data || data;
}

// ПОДХОД 2: REST Bypass с альтернативными параметрами
async function placeMexcRestBypass(apiKeys: any, orderParams: any) {
  console.log('🟠 MEXC BYPASS: REST bypass approach');
  
  const timestamp = Date.now();
  const { symbol, side, order_type, price, quantity } = orderParams;
  
  // Альтернативная подпись (как в обходных решениях)
  const bypassParams = {
    symbol,
    side: side.toLowerCase(),
    type: order_type.toLowerCase(),
    vol: quantity || 1,
    price: price || null,
    leverage: orderParams.leverage || 10,
    openType: 2,
    timestamp
  };
  
  const signature = await createMexcBypassSignature(apiKeys, bypassParams);
  
  // Используем обходной endpoint
  const response = await fetch('https://contract.mexc.com/api/v1/private/order/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ApiKey': apiKeys.api_key,
      'Request-Time': timestamp.toString(),
      'Signature': signature,
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(bypassParams)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`REST bypass failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`REST bypass error: ${data.message || data.errorMsg}`);
  }

  return data.data || data;
}

// WebSocket Signature для обходного API
async function createMexcWebSocketSignature(apiKeys: any, timestamp: number, params: any): Promise<string> {
  const secretKey = apiKeys.secret || apiKeys.api_secret;
  
  // Специальный формат для WebSocket API
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const signatureTarget = `${apiKeys.api_key}${timestamp}${paramString}`;
  
  return await createHmacSignature(signatureTarget, secretKey);
}

// Bypass Signature для REST API
async function createMexcBypassSignature(apiKeys: any, params: any): Promise<string> {
  const secretKey = apiKeys.secret || apiKeys.api_secret;
  
  // Сортируем параметры и создаем строку
  const sortedParams = Object.keys(params)
    .filter(key => params[key] !== null && params[key] !== undefined)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  // Альтернативный формат подписи
  const signatureTarget = `${apiKeys.api_key}${params.timestamp}${sortedParams}`;
  
  return await createHmacSignature(signatureTarget, secretKey);
}

// Утилита для HMAC подписи
async function createHmacSignature(message: string, secret: string): Promise<string> {
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
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}