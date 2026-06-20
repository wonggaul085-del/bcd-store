export async function onRequest(context) {
  const request = context.request;

  if(request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if(request.method !== 'POST') {
    return new Response('Method not allowed', {status: 405});
  }

  try {
    const body = await request.json();
    const {orderId, productName, price, customerName, customerEmail, phoneTarget} = body;

    const MIDTRANS_SERVER_KEY = 'Mid-server-WB7wE7wHD319yqJgyflgYE28';
    const authStr = btoa(MIDTRANS_SERVER_KEY + ':');

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: price
      },
      item_details: [{
        id: orderId,
        price: price,
        quantity: 1,
        name: productName
      }],
      customer_details: {
        first_name: customerName || 'Pelanggan',
        email: customerEmail || 'pelanggan@bcdstore.com',
        phone: phoneTarget
      },
      enabled_payments: ['gopay', 'credit_card'],
      callbacks: {
        finish: 'https://bcd-store.pages.dev/?payment=success',
        error: 'https://bcd-store.pages.dev/?payment=error',
        pending: 'https://bcd-store.pages.dev/?payment=pending'
      }
    };

    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + authStr
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if(!data.token) {
      return new Response(JSON.stringify({error: 'Gagal buat token: ' + JSON.stringify(data)}), {
        status: 400,
        headers: {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
      });
    }

    return new Response(JSON.stringify({token: data.token, redirect_url: data.redirect_url}), {
      status: 200,
      headers: {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    });

  } catch(e) {
    return new Response(JSON.stringify({error: e.message}), {
      status: 500,
      headers: {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    });
  }
}
