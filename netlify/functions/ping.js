export default async function handler(req) {
  // Add CORS headers for local dev testing
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers });
  }

  try {
    const data = await req.json();
    const { name, message } = data;

    if (!name || name.trim() === '') {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.PING_TO_EMAIL || 'your-email@example.com'; 
    const fromEmail = process.env.PING_FROM_EMAIL || 'onboarding@resend.dev'; // Resend's default testing email

    if (resendApiKey) {
      // Fire it off to Resend
      const emailBody = {
        from: `00ALIVE Ping <${fromEmail}>`,
        to: [toEmail],
        subject: `🚨 00ALIVE Doshboard Ping from ${name}!`,
        html: `
          <div style="font-family: monospace; background: #000; color: #fff; padding: 20px; border-radius: 8px;">
            <h2 style="color: #4ade80;">Someone is checking on you.</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Message:</strong> ${message && message.trim() !== '' ? message : '<em>No message provided</em>'}</p>
          </div>
        `
      };

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify(emailBody)
      });

      if (!resendRes.ok) {
        throw new Error('Resend API failed: ' + await resendRes.text());
      }
    } else {
      console.log('NOTICE: RESEND_API_KEY is not set. Ping simulated:', { name, message });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Ping error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
}