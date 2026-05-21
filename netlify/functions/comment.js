import { getComment } from "./templates.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
);

// Helper to ensure time is ALWAYS calculated in West Africa Time (WAT)
function getWATHour() {
    return parseInt(new Intl.DateTimeFormat('en-GB', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: 'Africa/Lagos'
    }).format(new Date()));
}

async function getGroqComments(track, artist, tier, energy, valence) {
    const hour = getWATHour();
    
    // Adjusted the time boundaries to better match Nigerian internet culture
    const timeContext =
        hour >= 0 && hour < 5
            ? "it's past midnight (devil's hours)"
            : hour < 12
                ? "it's morning"
                : hour < 17
                    ? "it's the afternoon"
                    : hour < 21
                        ? "it's evening"
                        : "it's late at night";

    const moodHint =
        valence > 0.6
            ? "upbeat/vibing"
            : valence < 0.4
                ? "melancholic/brooding/in the trenches"
                : "neutral/reflective";

    const energyHint =
        energy > 0.7
            ? "high energy"
            : energy < 0.3
                ? "low energy, very calm"
                : "mid energy";

    // Adding specific lore about you makes the AI roasts exponentially funnier to friends
const prompt = `You write short, funny comments for "izrah.live" — a site that tracks if Izrah is alive based on his Spotify. His friends visit to check on him and laugh.

Current listening:
- Track: "${track}" by ${artist}
- Vibe: ${moodHint}, ${energyHint}  
- Time: ${timeContext}
- Status: ${tier}



Write 10 comments. Mix up the structures — some are observations, some are accusations, some are fake concern, some are just stating facts with no emotion. Third person only, referring to him as "he" or "this man" or "bro" or "izrah."

Examples of the  register to match — vary your structure like these do:
- "${artist} at this hour. he already knows what he's doing."
- "he is alive. the music choice is doing a lot of talking though."
- "lore accurate. ${artist} fits exactly what he has going on right now."

BANNED phrases and patterns (do not use any of these):
- "vibes", "feeling", "lost in", "immersed in"
- starting with "In the" 
- any exclamation marks
- rhetorical questions
- anything that sounds like a music review

- Do NOT write anything that sounds like a therapy observation or a deep life quote
- Write like a friend in a group chat who just saw something embarrassing, not a narrator
- Refere to him as "he" , "broski" , "this man" , "izrah" — it's more group chat

Maximum 18 words each. Emojis allowed, max one per line, only when it genuinely adds something.

Return a raw JSON array of 10 strings. No markdown. No object wrapper. Just the array starting with [ and ending with ].`;

    try {
        const res = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                max_tokens: 700,
                messages: [
                    {
                    role: 'system',
                    content: 'You are a witty Nigerian Gen Z friend writing roast comments. You always respond with only a valid JSON array of strings. Nothing else. No object, no markdown, no explanation. Start your response with [ and end with ].'
                    },
                    { role: 'user', content: prompt }
                ],
                }),
            },
        );

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Groq Error: ${res.status} ${errBody}`);
        }
        const data = await res.json();
        let content = data.choices[0].message.content.trim();

        // Strip any markdown wrapping
        content = content.replace(/```(json)?\n?/g, '').replace(/```$/g, '').trim();

        // If model returned an object instead of array, extract first array value
        let parsed;
        try {
        parsed = JSON.parse(content);
        } catch {
        // Last resort: extract anything between [ and ]
        const match = content.match(/\[[\s\S]*\]/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('Could not parse Groq response');
        }

        const comments = Array.isArray(parsed) ? parsed : Object.values(parsed)[0];
        if (Array.isArray(comments) && comments.length > 0) return comments;
    } catch (err) {
        console.error("Groq error:", err);
    }
    return null;
}

export const handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { trackId, track, artist, tier, energy, valence } = JSON.parse(
        event.body || "{}",
    );

    if (!trackId || !track || !artist) {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                comment: getComment(artist, tier),
                source: "template",
            }),
        };
    }

    // Cache key now utilizes the fixed WAT hour logic
    const hour = getWATHour();
    const timeSlot =
        hour < 6
            ? "late-night"
            : hour < 12
                ? "morning"
                : hour < 18
                    ? "afternoon"
                    : "evening";
                    
    const cacheKey = `${trackId}_${timeSlot}`;

    try {
        const { data: cacheData, error: cacheError } = await supabase
            .from("comment_cache")
            .select("comments")
            .eq("track_id", cacheKey)
            .single();

        if (!cacheError && cacheData?.comments?.length > 0) {
            const pick =
                cacheData.comments[
                    Math.floor(Math.random() * cacheData.comments.length)
                ];
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ comment: pick, source: "cache" }),
            };
        }

        const groqComments = await getGroqComments(
            track,
            artist,
            tier,
            parseFloat(energy) || 0.5,
            parseFloat(valence) || 0.5,
        );

        if (groqComments) {
            // Non-blocking cache write
            supabase
                .from("comment_cache")
                .upsert({
                    track_id: cacheKey,
                    track_name: track,
                    artist,
                    comments: groqComments,
                })
                .then(({ error }) => {
                    if (error) console.error("Cache write failed:", error);
                });

            const pick =
                groqComments[Math.floor(Math.random() * groqComments.length)];
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ comment: pick, source: "groq-fresh" }),
            };
        }
    } catch (err) {
        console.error("Comment function error:", err);
    }

    // Ultimate fallback
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            comment: getComment(artist, tier),
            source: "template-fallback",
        }),
    };
};