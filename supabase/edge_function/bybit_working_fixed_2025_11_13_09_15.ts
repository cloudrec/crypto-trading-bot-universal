const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, exchange, symbol, side, leverage, amount } = await req.json()
    
    console.log('🎯 BYBIT WORKING: Starting action:', action, { exchange, symbol, side, leverage, amount })

    // Проверяем API ключи
    const apiKey = Deno.env.get('BYBIT_API_KEY')
    const apiSecret = Deno.env.get('BYBIT_API_SECRET')
    
    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bybit API ключи не найдены' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔑 BYBIT WORKING: API keys found')

    // Обработка размещения ордера
    if (action === 'place_order' || action === 'place_order_with_tp_sl') {
      return await handlePlaceOrderWithTPSL(apiKey, apiSecret, symbol, side, leverage, amount)
    }

    return new Response(
      JSON.stringify({ success: false, error: `Неизвестное действие: ${action}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ BYBIT WORKING Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Размещение ордера с TP/SL (на основе рабочего кода из старого проекта)
async function handlePlaceOrderWithTPSL(apiKey: string, apiSecret: string, symbol: string = 'BTCUSDT', side: string = 'Buy', leverage: string = '10', amount: string = '100') {
  console.log('🎯 BYBIT WORKING: Placing order with TP/SL')
  
  try {
    // 1. Получаем текущую цену (используем правильный endpoint из старого проекта)
    const priceResponse = await fetch(`https://api.bybit.com/v2/public/tickers?symbol=${symbol}`)
    const priceData = await priceResponse.json()
    const currentPrice = parseFloat(priceData.result?.[0]?.last_price || '0')
    
    if (currentPrice === 0) {
      throw new Error('Не удалось получить цену символа')
    }
    
    // 2. Рассчитываем количество (как в старом проекте)
    const orderAmountUSD = parseFloat(amount) || 100
    const leverageNum = parseInt(leverage) || 10
    const totalAmount = orderAmountUSD * leverageNum
    const qty = Math.floor(totalAmount / currentPrice).toString()
    
    console.log('🎯 BYBIT WORKING: Order calculation:', {
      symbol,
      currentPrice,
      orderAmountUSD,
      leverageNum,
      totalAmount,
      qty
    })

    // 3. Рассчитываем TP/SL цены (как в старом проекте)
    const tpPrice = (currentPrice * 1.02).toFixed(2) // +2%
    const slPrice = (currentPrice * 0.98).toFixed(2) // -2%

    // 4. Размещаем ордер с TP/SL (точно как в рабочем старом проекте)
    const timestamp = Date.now().toString()
    const params = {
      api_key: apiKey,
      symbol: symbol,
      side: side,
      order_type: 'Market',
      qty: qty,
      time_in_force: 'GoodTillCancel',
      take_profit: tpPrice,
      stop_loss: slPrice,
      timestamp: timestamp
    }

    // Создаем query string (точно как в старом проекте)
    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')

    // Создаем подпись (точно как в старом проекте)
    const signature = await createSignature(queryString, apiSecret)
    
    // Отправляем запрос (используем правильный endpoint v2 из старого проекта)
    const response = await fetch('https://api.bybit.com/v2/private/order/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `${queryString}&sign=${signature}`
    })

    const data = await response.json()
    console.log('🎯 BYBIT WORKING: Order response:', data)

    if (response.ok && data.ret_code === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `✅ Bybit ордер размещен: ${symbol}`,
          order: {
            order_id: data.result?.order_id,
            symbol: symbol,
            side: side,
            qty: qty,
            current_price: currentPrice,
            tp_price: tpPrice,
            sl_price: slPrice,
            order_amount_usd: orderAmountUSD,
            leverage: leverageNum,
            total_amount: totalAmount,
            status: 'placed',
            exchange: 'BYBIT',
            timestamp: new Date().toISOString()
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Bybit order error: ${data.ret_msg || 'Unknown error'}`,
          details: data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Order placement error: ${error.message}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// Создание подписи HMAC SHA-256 (точно как в рабочем старом проекте)
async function createSignature(queryString: string, secret: string) {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(queryString)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}