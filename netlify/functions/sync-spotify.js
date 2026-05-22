import { createClient } from "@supabase/supabase-js";

// ─── This function owns ALL Spotify API calls ──────────────────────────────
// It is triggered by GitHub Actions every 3 minutes via a POST request.
// It writes everything to the spotify_snapshot table in Supabase.
// status.js then reads that table — never touching Spotify directly.

const CORS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
};

// ─── Spotify Token ─────────────────────────────────────────────────────────

async function getSpotifyAccessToken() {
    const credentials = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
    ).toString("base64");

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
        }),
    });

    const data = await res.json();
    if (!data.access_token) throw new Error("Failed to get Spotify token");
    return data.access_token;
}

// ─── Spotify Fetchers ──────────────────────────────────────────────────────

async function getCurrentlyPlaying(token) {
    const res = await fetch(
        "https://api.spotify.com/v1/me/player/currently-playing",
        { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status === 204 || res.status === 400) return null;
    const data = await res.json();
    if (!data || !data.item || data.item.type !== "track") return null;

    return {
        isPlaying:   data.is_playing,
        track:       data.item.name,
        artist:      data.item.artists.map((a) => a.name).join(", "),
        album:       data.item.album.name,
        albumArt:    data.item.album.images[1]?.url || data.item.album.images[0]?.url,
        trackId:     data.item.id,
        playedAt:    new Date().toISOString(),
        progressMs:  data.progress_ms,
        durationMs:  data.item.duration_ms,
        url:         data.item.external_urls?.spotify,
    };
}

async function getRecentlyPlayed(token, limit = 5) {
    const res = await fetch(
        `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
        console.warn(`recently-played returned ${res.status}`);
        return limit === 1 ? null : [];
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) return limit === 1 ? null : [];

    if (limit === 1) {
        const item = data.items[0];
        return {
            isPlaying:  false,
            track:      item.track.name,
            artist:     item.track.artists.map((a) => a.name).join(", "),
            album:      item.track.album.name,
            albumArt:   item.track.album.images[1]?.url || item.track.album.images[0]?.url,
            trackId:    item.track.id,
            playedAt:   item.played_at,
            progressMs: null,
            durationMs: item.track.duration_ms,
            url:        item.track.external_urls?.spotify,
        };
    }

    return data.items.map((item) => ({
        trackId:  item.track.id,
        track:    item.track.name,
        artist:   item.track.artists.map((a) => a.name).join(", "),
        albumArt: item.track.album.images[2]?.url || item.track.album.images[0]?.url,
        playedAt: item.played_at,
        url:      item.track.external_urls?.spotify,
    }));
}

async function getAudioFeatures(token, trackId) {
    const res = await fetch(
        `https://api.spotify.com/v1/audio-features/${trackId}`,
        { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return { bpm: 80, energy: 0.5, valence: 0.5, danceability: 0.5 };
    const data = await res.json();
    return {
        bpm:          Math.round(data.tempo) || 80,
        energy:       data.energy       || 0.5,
        valence:      data.valence      || 0.5,
        danceability: data.danceability || 0.5,
    };
}

async function getTopArtists(token) {
    const res = await fetch(
        "https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=5",
        { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
        console.warn(`top-artists returned ${res.status}`);
        return [];
    }
    const data = await res.json();
    if (!data?.items || !Array.isArray(data.items)) return [];

    return data.items.map((artist, index) => ({
        name:     artist.name,
        genre:    artist.genres?.[0] || "artist",
        image:    artist.images?.[2]?.url || artist.images?.[0]?.url || "",
        affinity: 100 - index * 15,
    }));
}

async function getListeningStats(token) {
    try {
        const res = await fetch(
            "https://api.spotify.com/v1/me/player/recently-played?limit=50",
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return { topGenre: null, topArtists: [], clockData: [] };
        const data = await res.json();
        if (!data.items || data.items.length === 0)
            return { topGenre: null, topArtists: [], clockData: [] };

        const artistCounts = {};
        const hourCounts = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));

        for (const item of data.items) {
            for (const a of item.track.artists) {
                artistCounts[a.name] = (artistCounts[a.name] || 0) + 1;
            }
            hourCounts[new Date(item.played_at).getHours()].count += 1;
        }

        const topArtists = Object.entries(artistCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const artistIds = [
            ...new Set(data.items.flatMap((item) => item.track.artists.map((a) => a.id))),
        ].filter(Boolean).slice(0, 50);

        let topGenre = null;
        if (artistIds.length > 0) {
            const artistRes = await fetch(
                `https://api.spotify.com/v1/artists?ids=${artistIds.join(",")}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (artistRes.ok) {
                const artistData = await artistRes.json();
                const genreCounts = {};
                for (const artist of artistData.artists) {
                    if (!artist?.genres) continue;
                    for (const genre of artist.genres) {
                        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                    }
                }
                let maxCount = 0;
                for (const [genre, count] of Object.entries(genreCounts)) {
                    if (count > maxCount) { maxCount = count; topGenre = genre; }
                }
            }
        }

        return { topGenre, topArtists, clockData: hourCounts };
    } catch {
        return { topGenre: null, topArtists: [], clockData: [] };
    }
}

// ─── Main Handler ──────────────────────────────────────────────────────────

export default async (req) => {
    // Only accept POST requests with the correct secret
    // This prevents anyone from hammering this endpoint publicly
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405, headers: CORS,
        });
    }

    const authHeader = req.headers.get("x-cron-secret");
    if (authHeader !== process.env.CRON_SECRET) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: CORS,
        });
    }

    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY,
        );

        const token = await getSpotifyAccessToken();

        // Get current/recent track first — determines what audio features to fetch
        let trackData = await getCurrentlyPlaying(token);
        if (!trackData) {
            trackData = await getRecentlyPlayed(token, 1);
        }

        if (!trackData) {
            console.log("No track data available from Spotify");
            return new Response(JSON.stringify({ ok: true, message: "No track data" }), {
                status: 200, headers: CORS,
            });
        }

        // Run all remaining calls in parallel — controlled burst, one token, one function
        const [audioFeatures, recentTracks, topArtists, listeningStats] = await Promise.all([
            getAudioFeatures(token, trackData.trackId),
            getRecentlyPlayed(token, 5),
            getTopArtists(token),
            getListeningStats(token),
        ]);

        // Write the full snapshot to Supabase — one row, always id = 1
        const { error } = await supabase.from("spotify_snapshot").upsert({
            id:              1,
            track:           trackData,
            audio_features:  audioFeatures,
            recent_tracks:   recentTracks,
            top_artists:     topArtists,
            listening_stats: listeningStats,
            updated_at:      new Date().toISOString(),
        });

        if (error) {
            console.error("Supabase write error:", error);
            return new Response(JSON.stringify({ error: "DB write failed" }), {
                status: 500, headers: CORS,
            });
        }

        console.log(`Snapshot updated — track: ${trackData.track} by ${trackData.artist}`);

        return new Response(
            JSON.stringify({
                ok:      true,
                track:   trackData.track,
                artist:  trackData.artist,
                updated: new Date().toISOString(),
            }),
            { status: 200, headers: CORS },
        );

    } catch (err) {
        console.error("Sync function error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: CORS,
        });
    }
};