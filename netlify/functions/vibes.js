import { createClient } from "@supabase/supabase-js";

export const handler = async (event) => {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
    );
    const { httpMethod, body } = event;

    // GET: Fetch the global running tally
    if (httpMethod === 'GET') {
        const { data } = await supabase
            .from('global_vibes')
            .select('fire_votes, flag_votes')
            .eq('id', 1)
            .single();

        return {
            statusCode: 200,
            body: JSON.stringify(data || { fire_votes: 0, flag_votes: 0 }),
        };
    }

    // POST: Submit a new global vote
    if (httpMethod === 'POST') {
        const { voteType } = JSON.parse(body);
        
        await supabase.rpc('increment_global_vibe', { 
            v_type: voteType 
        });

        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
};