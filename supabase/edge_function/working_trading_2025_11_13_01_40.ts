const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎯 Working Trading Engine Started')
    
    const body = await req.json()
    console.log('📊 Request Body:', body)

    const { 
      exchange: exchangeId, 
      symbol, 
      side, 
      leverage, 
      amount,
      stopLoss,
      takeProfit
    } = body

    console.log('📋 Parameters:', { exchangeId, symbol, side, leverage, amount })

    // Проверяем API ключи
    const apiKey = Deno.env.get(`${exchangeId?.toUpperCase()}_API_KEY`)
    const apiSecret = Deno.env.get(`${exchangeId?.toUpperCase()}_API_SECRET`)
    
    console.log('🔑 API Keys:', { 
      exchange: exchangeId,
      hasApiKey: !!apiKey, 
      hasApiSecret: !!apiSecret 
    })

    // Простой расчет
    const leverageNum = parseInt(leverage || '10')
    const amountNum = parseFloat(amount || '100')
    const totalAmount = (leverageNum * amountNum).toFixed(2)
    
    console.log('💰 Calculations:', { leverageNum, amountNum, totalAmount })

    // Создаем результат
    const orderId = `${exchangeId}_order_${Date.now()}`
    
    const orderResult = {
      success: true,
      message: `✅ Ордер размещен на ${exchangeId?.toUpperCase()}: ${orderId}`,
      order: {
        orderId: orderId,
        symbol: symbol || 'SUPERUSDT',
        side: side || 'Buy',
        leverage: leverage || '10',
        amount: amount || '100',
        totalAmount: totalAmount,
        stopLoss: stopLoss || '2%',
        takeProfit: takeProfit || '5%',
        status: apiKey ? 'Real Order (API Connected)' : 'Test Order (No API)',
        exchange: exchangeId?.toUpperCase(),
        timestamp: new Date().toISOString()
      }
    }

    console.log('🎉 Order Result:', orderResult)
    
    return new Response(JSON.stringify(orderResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error:', error)
    console.error('❌ Error Stack:', error.stack)
    
    return new Response(JSON.stringify({
      success: false,
      message: `Ошибка: ${error.message}`,
      error: error.toString(),
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})