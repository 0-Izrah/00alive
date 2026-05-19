import { createClient } from "@supabase/supabase-js";

//token refresh
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
	return data.access_token;
}
//data fetch
async function getCurrentlyPlaying(token) {
	const res = await fetch(
		"https://api.spotify.com/v1/me/player/currently-playing",
		{
			headers: {
				Authorization: `Bearer ${token}`,
			},
		},
	);
	if (res.status === 204 || res.status === 400) return null;
	const data = await res.json();
	if (!data || !data.item || data.item.type !== "track") return null;
	return {
		isPlaying: data.is_playing,
		track: data.item.name,
		artist: data.item.artists.map((a) => a.name).join(", "),
		album: data.item.album.name,
		albumArt:
			data.item.album.images[1]?.url || data.item.album.images[0].url,
		trackId: data.item.id,
		playedAt: new Date().toISOString(),
		progressMs: data.progress_ms,
		durationMs: data.item.duration_ms,
		url: data.item.external_urls?.spotify
	};
}

async function getRecentlyPlayed(token, limit = 1) {
	const res = await fetch(
		`https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
		{
			headers: { Authorization: `Bearer ${token}` },
		},
	);

	const data = await res.json();
	if (!data.items || data.items.length === 0) return limit === 1 ? null : [];

    if (limit === 1) {
        const item = data.items[0];
        return {
            isPlaying: false,
            track: item.track.name,
            artist: item.track.artists.map((a) => a.name).join(", "),
            album: item.track.album.name,
            albumArt:
                item.track.album.images[1]?.url || item.track.album.images[0]?.url,
            trackId: item.track.id,
            playedAt: item.played_at,
            progressMs: null,
            durationMs: item.track.duration_ms,
            url: item.track.external_urls?.spotify
        };
    }
    
    // For limit > 1, return an array of simplified track objects
    return data.items.map(item => ({
        track: item.track.name,
        artist: item.track.artists.map((a) => a.name).join(", "),
        albumArt: item.track.album.images[2]?.url || item.track.album.images[0]?.url, // smaller image
        playedAt: item.played_at,
        url: item.track.external_urls?.spotify
    }));
}

async function getAudioFeatures(token, trackId) {
	const res = await fetch(
		`https://api.spotify.com/v1/audio-features/${trackId}`,
		{ headers: { Authorization: `Bearer ${token}` } },
	);

	const data = await res.json();
	return {
		bpm: Math.round(data.tempo) || 80,
		energy: data.energy || 0.5, // 0.0 to 1.0
		valence: data.valence || 0.5, // 0.0 (sad) to 1.0 (happy)
		danceability: data.danceability || 0.5,
	};
}

async function getListeningStats(token) {
    try {
        const res = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return { topGenre: null, topArtists: [], clockData: [] };
        const data = await res.json();
        
        if (!data.items || data.items.length === 0) return { topGenre: null, topArtists: [], clockData: [] };
        
        const artistCounts = {};
        const hourCounts = Array.from({length: 24}, (_, i) => ({ hour: i, count: 0 }));

        for (const item of data.items) {
            for (const a of item.track.artists) {
                artistCounts[a.name] = (artistCounts[a.name] || 0) + 1;
            }
            const playedAt = new Date(item.played_at);
            const hour = playedAt.getHours();
            hourCounts[hour].count += 1;
        }

        const topArtists = Object.entries(artistCounts)
             .map(([name, count]) => ({ name, count }))
             .sort((a, b) => b.count - a.count)
             .slice(0, 5);

        // Extract up to 50 unique artist IDs
        const artistIds = [...new Set(data.items.flatMap(item => item.track.artists.map(a => a.id)))].filter(Boolean).slice(0, 50);
        
        let topGenre = null;
        if (artistIds.length > 0) {
            const artistRes = await fetch(`https://api.spotify.com/v1/artists?ids=${artistIds.join(',')}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (artistRes.ok) {
                const artistData = await artistRes.json();
                const genreCounts = {};
                for (const artist of artistData.artists) {
                    if (!artist || !artist.genres) continue;
                    for (const genre of artist.genres) {
                        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                    }
                }
                
                let maxCount = 0;
                for (const [genre, count] of Object.entries(genreCounts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        topGenre = genre;
                    }
                }
            }
        }
        
        return { topGenre, topArtists, clockData: hourCounts };
    } catch {
        return { topGenre: null, topArtists: [], clockData: [] };
    }
}

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

//status tier calc

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
		return {
			tier: "ALIVE",
			label: "alive",
			color: "alive",
			message: null, // witty comment fills this
		};
	}

	if (minutesAgo < 480) {
		return {
			tier: "QUIET",
			label: "quiet",
			color: "alive",
			message: "around, just off the aux for a bit.",
		};
	}

	if (minutesAgo < 1440) {
		return {
			tier: "STILL HERE",
			label: "still here",
			color: "warn",
			message: "no music today. suspicious, but not alarming.",
		};
	}

	if (minutesAgo < 2880) {
		return {
			tier: "UNKNOWN",
			label: "unknown",
			color: "warn",
			message: "going on 24 hours with no music. someone check on him.",
		};
	}

	return {
		tier: "CHECK ON HIM",
		label: "missing",
		color: "dead",
		message: "this is not normal. he always has something playing.",
	};
}

export default async (req) => {
    try {
        const token = await getSpotifyAccessToken();

        let trackData = await getCurrentlyPlaying(token);
        if (!trackData) {
            trackData = await getRecentlyPlayed(token);
        }

        if(!trackData) {
        return new Response(JSON.stringify({
            tier: 'CHECK ON HIM',
            label: 'missing',
            color: 'dead',
            message: "no spotify activity found. this is deeply concerning.",
            track: null,
            streak: null,
            bpm: 60,
            energy: 0,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    const [audioFeatures, supabaseData, recentTracks, listeningStats] = await Promise.all([
            getAudioFeatures(token, trackData.trackId),
            createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
                .from('streaks')
                .select('*')
                .eq('id', 1)
                .single(),
            getRecentlyPlayed(token, 5), // Fetch the 5 most recent tracks
            getListeningStats(token)
        ]);

        const status = calculateTier(trackData.playedAt, trackData.isPlaying);
        const vibe = generateVibe(audioFeatures.energy, audioFeatures.valence, trackData.playedAt);

        return new Response(JSON.stringify({
            ...status,
            track: {
                id: trackData.trackId,
                name: trackData.track,
                artist: trackData.artist,
                album: trackData.album,
                albumArt: trackData.albumArt,
                playedAt: trackData.playedAt,
                isPlaying: trackData.isPlaying,
                progressMs: trackData.progressMs,
                durationMs: trackData.durationMs,
                url: trackData.url
            },
            recentTracks: recentTracks || [],
            topGenre: listeningStats.topGenre || 'unknown',
            loyalty: listeningStats.topArtists || [],
            clock: listeningStats.clockData || [],
            vibe: vibe,
            streak : supabaseData.data || { current_streak: 0, best_streak: 0, total_days: 0 },
            bpm: audioFeatures.bpm,
            energy: audioFeatures.energy,
            valence: audioFeatures.valence,
            danceability: audioFeatures.danceability,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }catch (err){
        console.error("Error in status function:", err);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
};