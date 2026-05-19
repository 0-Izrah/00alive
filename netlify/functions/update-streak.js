import { schedule } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

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

async function getActivityToday(token) {
	// Check for activity in the last 24 hours
	const since = Date.now() - 24 * 60 * 60 * 1000;

	const res = await fetch(
		`https://api.spotify.com/v1/me/player/recently-played?limit=50&after=${since}`,
		{ headers: { Authorization: `Bearer ${token}` } },
	);

	const data = await res.json();
	const trackCount = data.items ? data.items.length : 0;
	return { active: trackCount > 0, trackCount };
}

const updateStreakHandler = async () => {
	const supabase = createClient(
		process.env.SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	try {
		const token = await getSpotifyAccessToken();
		const { active, trackCount } = await getActivityToday(token);

		const { data: current } = await supabase
			.from("streak")
			.select("*")
			.eq("id", 1)
			.single();

		const today = new Date().toISOString().split("T")[0];

		if (active) {
			const newStreak = current.current_streak + 1;
			const newBest = Math.max(newStreak, current.best_streak);

			await supabase
				.from("streak")
				.update({
					current_streak: newStreak,
					best_streak: newBest,
					last_active_date: today,
					total_days: current.total_days + 1,
				})
				.eq("id", 1);
				
			// Insert/Update the new activity_logs table for the historical heatmap
			await supabase
				.from("activity_logs")
				.upsert(
					{ date: today, count: trackCount },
					{ onConflict: 'date' }
				);

			console.log(`Streak updated: ${newStreak} days. Logged ${trackCount} tracks for ${today}.`);
		} else {
			// No activity today — reset streak
			await supabase
				.from("streak")
				.update({
					current_streak: 0,
					last_active_date: current.last_active_date,
				})
				.eq("id", 1);

			// Log 0 tracks for historical heatmap
			await supabase
				.from("activity_logs")
				.upsert(
					{ date: today, count: 0 },
					{ onConflict: 'date' }
				);

			console.log("No activity today. Streak reset. Logged 0 tracks for heatmap.");
		}
	} catch (err) {
		console.error("Streak update error:", err);
	}

	return { statusCode: 200 };
};

// Runs at 23:00 UTC = midnight WAT
export const handler = schedule("0 23 * * *", updateStreakHandler);
