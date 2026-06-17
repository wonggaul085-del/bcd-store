const MIDTRANS_SERVER_KEY = 'Mid-server-WB7wE7wHD319yqJgyflgYE28';
const MIDTRANS_API_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const EMAILJS_SERVICE_ID = 'service_8xe034j';
const EMAILJS_TEMPLATE_ID = 'template_j0bfvjx';
const EMAILJS_PUBLIC_KEY = 'J7KiANLFAHx5tDhdO';
const EMAILJS_PRIVATE_KEY = 'IGSv77DkyhoCcu_tZP_c9';

exports.handler = async function(event) {
  const path = event.path.replace('/.netlify/functions/create-payment', '') || '/';

  // Handle Midtrans notification webhook
  if(event.httpMethod === 'POST' && path === '/notify') {
    try {
      const body = JSON.parse(event.body);
      const {order_id, transaction_status, gross_amount} = body;

      if(transaction_status === 'capture' || transaction_status === 'settlement') {
        // Kirim email notifikasi via EmailJS REST API
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
              order_id: order_id,
              product_name: body.item_details?.[0]?.name || '-',
              price: 'Rp' + Number(gross_amount).toLocaleString('id-ID'),
              phone_target: body.customer_details?.phone || '-',
              customer_name: body.customer_details?.first_name || 'Pelanggan',
              customer_email: body.customer_details?.email || '-',
            }
          })
        });
      }
      return {statusCode: 200, body: 'OK'};
    } catch(e) {
      return {statusCode: 500, body: e.message};
    }
  }

  // Handle create payment token
  if(event.httpMethod !== 'POST') {
    return {statusCode: 405, body: 'Method not allowed'};
  }

  try {
    const body = JSON.parse(event.body);
    const {orderId, productName, price, customerName, customerEmail, phoneTarget} = body;

    const authStr = Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64');

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
      callbacks: {
        finish: 'https://bachidv2.netlify.app/?payment=success',
        error: 'https://bachidv2.netlify.app/?payment=error',
        pending: 'https://bachidv2.netlify.app/?payment=pending'
      }
    };

    const response = await fetch(MIDTRANS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + authStr
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if(!data.token) {
      return {
        statusCode: 400,
        body: JSON.stringify({error: 'Gagal buat token: ' + JSON.stringify(data)})
      };
    }

    return {
      statusCode: 200,
      headers: {'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({token: data.token, redirect_url: data.redirect_url})
    };

  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({error: e.message})
    };
  }
};
