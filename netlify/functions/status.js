import { createClient } from "@supabase/supabase-js";

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateVibe(energy, valence, playedAt) {
    const hour = new Date(playedAt).getHours();
    let timePhrase = "day";
    if (hour >= 5 && hour < 12) timePhrase = "morning";
    else if (hour >= 12 && hour < 17) timePhrase = "mid-day";
    else if (hour >= 17 && hour < 21) timePhrase = "evening";
    else timePhrase = "late night";

    if (energy > 0.7 && valence > 0.6) return `high-energy ${timePhrase}`;
    if (energy > 0.7 && valence <= 0.6) return `intense ${timePhrase} session`;
    if (energy <= 0.4 && valence <= 0.4) return `${timePhrase} melancholy`;
    if (energy <= 0.5 && valence > 0.5) return `breezy ${timePhrase}`;
    if (energy > 0.5 && valence < 0.3) return `grind mode ${timePhrase}`;
    return `steady ${timePhrase} flow`;
}

function calculateTier(playedAt, isPlaying) {
    if (isPlaying) {
        return {
            tier: "LIVE",
            label: "actively not dead",
            color: "alive",
            message: "literally on the aux rn",
        };
    }

    const minutesAgo = (Date.now() - new Date(playedAt)) / (1000 * 60);

    if (minutesAgo < 120) {
        return { tier: "ALIVE", label: "alive", color: "alive", message: null };
    }
    if (minutesAgo < 480) {
        return {
            tier: "QUIET",
            label: "quiet",
            color: "alive",
            message: "around, just off the aux for a bit.",
        };
    }
    if (minutesAgo < 900) {
        return {
            tier: "STILL HERE",
            label: "still here",
            color: "warn",
            message: "no music today. suspicious, but not alarming.",
        };
    }
    if (minutesAgo < 1440) {
        return {
            tier: "UNKNOWN",
            label: "unknown",
            color: "warn",
            message: "going on 15+ hours with no music. someone check on him.",
        };
    }
    return {
        tier: "CHECK ON HIM",
        label: "missing",
        color: "dead",
        message: "this is not normal. he always has something playing.",
    };
}

const CORS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
};

export default async () => {
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY,
        );

        const thirtyDaysAgo = new Date(
            new Date().setDate(new Date().getDate() - 30),
        ).toISOString().split("T")[0];

        const [snapshotRes, streakRes, calendarRes] = await Promise.all([
            supabase.from("spotify_snapshot").select("*").eq("id", 1).single(),
            supabase.from("streaks").select("*").eq("id", 1).single(),
            supabase.from("listening_calendar").select("*").gte("date", thirtyDaysAgo).order("date", { ascending: false }),
        ]);

        const snapshot = snapshotRes.data;

        if (!snapshot || !snapshot.track) {
            return new Response(
                JSON.stringify({
                    tier: "ALIVE",
                    label: "loading",
                    color: "alive",
                    message: "syncing data, check back in a moment.",
                    track: null,
                    streak: streakRes.data || { current_streak: 0, best_streak: 0, total_days: 0 },
                    bpm: 80,
                    energy: 0.5,
                    valence: 0.5,
                    danceability: 0.5,
                    recentTracks: [],
                    loyalty: [],
                    topGenre: null,
                    clock: [],
                    calendar: calendarRes.data || [],
                    vibe: null,
                }),
                { status: 200, headers: CORS },
            );
        }

        const track          = snapshot.track;
        const audioFeatures  = snapshot.audio_features  || { bpm: 80, energy: 0.5, valence: 0.5, danceability: 0.5 };
        const recentTracks   = snapshot.recent_tracks   || [];
        const topArtists     = snapshot.top_artists     || [];
        const listeningStats = snapshot.listening_stats || { topGenre: null, topArtists: [], clockData: [] };

        const status = calculateTier(track.playedAt, track.isPlaying);
        const vibe   = generateVibe(audioFeatures.energy, audioFeatures.valence, track.playedAt);

        return new Response(
            JSON.stringify({
                ...status,
                track: {
                    id:         track.trackId,
                    name:       track.track,
                    artist:     track.artist,
                    album:      track.album,
                    albumArt:   track.albumArt,
                    playedAt:   track.playedAt,
                    isPlaying:  track.isPlaying,
                    progressMs: track.progressMs,
                    durationMs: track.durationMs,
                    url:        track.url,
                },
                recentTracks,
                topGenre:    listeningStats.topGenre || "unknown",
                loyalty:     topArtists.length > 0 ? topArtists : listeningStats.topArtists || [],
                clock:       listeningStats.clockData || [],
                calendar:    calendarRes.data || [],
                vibe,
                streak: streakRes.data || {
                    current_streak: 0,
                    best_streak:    0,
                    total_days:     0,
                },
                bpm:          audioFeatures.bpm,
                energy:       audioFeatures.energy,
                valence:      audioFeatures.valence,
                danceability: audioFeatures.danceability,
                snapshotAge:  snapshot.updated_at,
            }),
            { status: 200, headers: CORS },
        );

    } catch (err) {
        console.error("Status function error:", err);
        return new Response(
            JSON.stringify({ error: "Internal Server Error" }),
            { status: 500, headers: CORS },
        );
    }
};