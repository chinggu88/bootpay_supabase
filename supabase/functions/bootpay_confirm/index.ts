// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders } from '../_shared/cors.ts'
interface CancelPaymentRequest {
  receipt_id: string;
}

interface BootpayTokenResponse {
  access_token: string;
}

Deno.serve(async (req) => {
  try {
    
    // CORS 처리
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }
    // 요청 데이터 파싱
    const { receipt_id }: CancelPaymentRequest = await req.json()

    console.log('Deno.env.get', Deno.env.get('BOOTPAY_APPLICATION_ID'))
    console.log('Deno.env.get', Deno.env.get('BOOTPAY_PRIVATE_KEY'))
    // Bootpay 토큰 발급
    const tokenResponse = await fetch('https://api.bootpay.co.kr/v2/request/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        application_id: Deno.env.get('BOOTPAY_APPLICATION_ID'),
        private_key: Deno.env.get('BOOTPAY_PRIVATE_KEY'),
      }),
    })

    const { access_token }: BootpayTokenResponse = await tokenResponse.json()
    // 결제 정보 조회
    const verifyResponse = await fetch(`https://api.bootpay.co.kr/v2/receipt/${receipt_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    })

    const verifyResult = await verifyResponse.json()

    // 결제 상태 확인 (status: 1 = 결제 완료)
    if (verifyResult.status !== 1) {
      throw new Error('유효하지 않은 결제입니다.')
    }

    // 결제 취소 요청
    // const cancelResponse = await fetch(`https://api.bootpay.co.kr/v2/cancel`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${access_token}`,
    //   },
    //   body: JSON.stringify({
    //     receipt_id,
    //     cancel_price,
    //     cancel_reason,
    //     cancel_id: Date.now().toString(),
    //     cancel_username: '관리자'
    //   }),
    // })

    // const cancelResult = await cancelResponse.json()
    return new Response(JSON.stringify(verifyResult), {
      headers: { ...corsHeaders,'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders,'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/bootpay_confirm' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
