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
    
    console.log('🟨 BINANCE WORKING: Starting action:', action, { exchange, symbol, side, leverage, amount })

    // Проверяем API ключи
    const apiKey = Deno.env.get('BINANCE_API_KEY')
    const apiSecret = Deno.env.get('BINANCE_API_SECRET')
    
    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Binance API ключи не найдены' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔑 BINANCE WORKING: API keys found')

    // Обработка размещения ордера
    if (action === 'place_order' || action === 'place_order_with_tp_sl') {
      return await handlePlaceOrder(apiKey, apiSecret, symbol, side, leverage, amount)
    }

    return new Response(
      JSON.stringify({ success: false, error: `Неизвестное действие: ${action}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ BINANCE WORKING Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Размещение ордера на Binance (на основе рабочего кода из старого проекта)
async function handlePlaceOrder(apiKey: string, apiSecret: string, symbol: string = 'BTCUSDT', side: string = 'BUY', leverage: string = '10', amount: string = '100') {
  console.log('🟨 BINANCE WORKING: Placing order')
  
  try {
    // 1. Получаем текущую цену
    const priceResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
    const priceData = await priceResponse.json()
    const currentPrice = parseFloat(priceData.price || '0')
    
    if (currentPrice === 0) {
      throw new Error('Не удалось получить цену символа')
    }
    
    // 2. Рассчитываем количество
    const orderAmountUSD = parseFloat(amount) || 100
    const leverageNum = parseInt(leverage) || 10
    const totalAmount = orderAmountUSD * leverageNum
    const quantity = (totalAmount / currentPrice).toFixed(6)
    
    console.log('🟨 BINANCE WORKING: Order calculation:', {
      symbol,
      currentPrice,
      orderAmountUSD,
      leverageNum,
      totalAmount,
      quantity
    })

    // 3. Подготавливаем параметры ордера (как в старом проекте)
    const timestamp = Date.now()
    const params = {
      symbol: symbol,
      side: side.toUpperCase(),
      type: 'MARKET',
      quantity: quantity,
      timestamp: timestamp
    }

    // Создаем query string
    const queryString = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join('&')

    // Создаем подпись HMAC SHA256
    const signature = await createSignature(queryString, apiSecret)
    
    // Отправляем запрос к Binance API v3
    const response = await fetch('https://api.binance.com/api/v3/order', {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `${queryString}&signature=${signature}`
    })

    const data = await response.json()
    console.log('🟨 BINANCE WORKING: Order response:', data)

    if (response.ok && data.orderId) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `✅ Binance ордер размещен: ${symbol}`,
          order: {
            order_id: data.orderId,
            symbol: symbol,
            side: side,
            quantity: quantity,
            current_price: currentPrice,
            order_amount_usd: orderAmountUSD,
            leverage: leverageNum,
            total_amount: totalAmount,
            status: data.status,
            exchange: 'BINANCE',
            timestamp: new Date().toISOString()
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Binance order error: ${data.msg || 'Unknown error'}`,
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

// Создание подписи HMAC SHA-256 для Binance
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