export default async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    // Simple rate limit — only allow one trigger per 3 minutes
    // We store the last trigger time in a module-level variable
    const now = Date.now();
    if (lastTrigger && now - lastTrigger < 180000) {
        return new Response(
            JSON.stringify({ ok: true, message: 'recently synced, skipping' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }
    lastTrigger = now;

    // Call sync-spotify internally
    const syncRes = await fetch(
        `${process.env.URL}/.netlify/functions/sync-spotify`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-cron-secret': process.env.CRON_SECRET,
            },
        }
    );

    const data = await syncRes.json();
    return new Response(JSON.stringify(data), {
        status: syncRes.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
};

let lastTrigger = null;