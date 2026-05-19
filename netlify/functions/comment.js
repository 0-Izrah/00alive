import { getComment } from "./templates.js";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getGroqComments(track, artist, tier, energy, valence) {
    const moodHint = valence > 0.6 ? "upbeat/happy" : valence < 0.4 ? "melancholic/introspective" : "neutral/chill";
    const energyHint = energy > 0.7 ? "high energy" : energy < 0.3 ? "low energy/calm" : "moderate energy";

    const prompt = `You are writing witty, funny, deadpan one-liners for a website called izrah.live. The site answers "is Izrah still alive?" and your lines appear as proof of life commentary.

Track: "${track}" by ${artist}
Mood: ${moodHint}, ${energyHint}
Status: ${tier}

Give me exactly 5 different witty, funny, slightly existential one-liners about this track. No exclamation marks, no emojis, no quotes. Reference the song or artist specifically.
Return them ONLY as a raw JSON array of 5 strings. Do not wrap in markdown or backticks. Just the raw array bracket to bracket.`;

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: 300,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!res.ok) throw new Error(`Groq Error: ${res.status}`);
        const data = await res.json();
        let content = data.choices[0].message.content.trim();
        
        // Remove backticks if present
        if (content.startsWith('```')) {
            content = content.replace(/```(json)?\n?/g, '').trim();
        }

        const comments = JSON.parse(content);
        if (Array.isArray(comments) && comments.length > 0) {
            return comments;
        }
    } catch (err) {
        console.error("Groq API error:", err);
    }
    return null;
}

export default async (req) => {
	// Only allow POST requests for this function
    const method = req.method;
    if (method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

	let body;
	try {
        // req.json() reads the body stream for Web standard Request objects
		body = await req.json();
	} catch (err) {
		body = {};
	}

	const { trackId, track, artist, tier, energy, valence } = body;

	// Fast fallback if missing required fields
    if (!trackId || !track || !artist) {
        return new Response(JSON.stringify({ 
            comment: getComment(artist, tier), source: "template" 
        }), { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }});
    }

	try {
        // 1. Try hitting cache first
        const { data: cacheData, error: cacheError } = await supabase
            .from('comment_cache')
            .select('comments')
            .eq('track_id', trackId)
            .single();

        if (!cacheError && cacheData && Array.isArray(cacheData.comments) && cacheData.comments.length > 0) {
            const randomPick = cacheData.comments[Math.floor(Math.random() * cacheData.comments.length)];
            return new Response(JSON.stringify({ 
                comment: randomPick, source: "groq-cache" 
            }), { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }});
        }

        // 2. Not in cache -> Generate with Groq
        const groqComments = await getGroqComments(track, artist, tier, parseFloat(energy) || 0.5, parseFloat(valence) || 0.5);

        // 3. Save to Supabase and Return
        if (groqComments) {
            // Upsert async
            await supabase.from('comment_cache').upsert({
                track_id: trackId,
                track_name: track,
                artist: artist,
                comments: groqComments
            });

            const returnPick = groqComments[Math.floor(Math.random() * groqComments.length)];
            
            return new Response(JSON.stringify({ 
                comment: returnPick, source: "groq-fresh" 
            }), { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }});
        }
    } catch (err) {
        console.error("Cache/Groq logic failed:", err);
    }

	// Fallback to template pool if the API fails or hits a rate limit
	const comment = getComment(artist, tier);
	return new Response(JSON.stringify({ comment, source: "template" }), {
		status: 200,
		headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
	});
};
