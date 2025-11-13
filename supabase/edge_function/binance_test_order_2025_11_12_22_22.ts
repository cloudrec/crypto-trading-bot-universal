import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { exchange, symbol, side, leverage, amount, totalAmount, stopLoss, takeProfit, delayMs } = await req.json();
    
    console.log('🟡 Binance Test Order Request:', {
      exchange,
      symbol,
      side,
      leverage,
      amount,
      totalAmount,
      stopLoss,
      takeProfit,
      delayMs
    });

    // Simulate order placement delay
    if (delayMs && parseInt(delayMs) > 0) {
      await new Promise(resolve => setTimeout(resolve, parseInt(delayMs)));
    }

    // Calculate position size based on leverage and amount
    const positionSize = (parseFloat(totalAmount || amount) / 50000).toFixed(6);
    
    // Simulate Binance API response
    const mockOrder = {
      orderId: `binance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: symbol || 'SUPERUSDT',
      side: side || 'Buy',
      orderType: 'Market',
      qty: positionSize,
      leverage: leverage || '10',
      amount: amount || '100',
      totalAmount: totalAmount || (parseFloat(amount || '100') * parseFloat(leverage || '10')).toFixed(2),
      stopLoss: stopLoss ? `${stopLoss}%` : null,
      takeProfit: takeProfit ? `${takeProfit}%` : null,
      status: 'Filled',
      exchange: 'Binance',
      timestamp: new Date().toISOString(),
      fee: '0.1%',
      executedPrice: '50000.00'
    };

    console.log('✅ Binance Mock Order Created:', mockOrder);

    return new Response(
      JSON.stringify({
        success: true,
        order: mockOrder,
        message: `🟡 Binance тестовый ордер размещен: ${mockOrder.orderId}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('❌ Binance Test Order Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: '❌ Ошибка размещения тестового ордера на Binance'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});