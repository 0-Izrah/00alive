import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req) {
  // Catch Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      }
    });
  }

  try {
    // Get the IP directly from the Netlify Network Layer
    const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('client-ip') || 'unknown';
    
    // Securely hash the IP so we don't store raw PII in Supabase
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    const today = new Date().toISOString().split('T')[0];

    // Supabase needs to be explicitly required here. 
    // Vite projects require you to set these in Netlify UI
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return new Response(JSON.stringify({ error: 'Missing DB string' }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert the visitor. If they visit multiple times in a day, it just updates 'last_visit'
    await supabase
      .from('visitors')
      .upsert({ ip_hash: `${ipHash}-${today}`, last_visit: today }, { onConflict: 'ip_hash' });

    // Get total unique site visitors today
    const { count, error } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .eq('last_visit', today);
      
    if (error) throw error;

    return new Response(JSON.stringify({ todayCount: count || 0 }), { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Visitor counter error:', error);
    return new Response(JSON.stringify({ todayCount: '...' }), { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
}