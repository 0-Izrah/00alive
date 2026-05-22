// getToken.js
const clientId = "abdbd33edc934597b28668b496459eeb";
const clientSecret = "d6527a4cbf524cf1b5a4c34b0eaee724";
const code = "AQDhICgBD7Vuya8LIyP9xRd1z8BCwqX1hKxUbA_YFhgm3sZRUsJpPcbCM9teTayCYa3acDiO5c3szCIKEs9TCcZTU1W8W2TZXZu1o6tt1A1ZUf5krFblQib7SmL3NiojRQw65MLbFl9XSaNI0wQnluCLcAI5TqrMxemm0MsqkkPJuNv1CE_p_eMmJqMhsIHKFWexw21mlVvxNNqYwQ_6kNd5QFgnY-W1ZeXFYi8bRIh7XVh2h0-r0wh1p3oKrn46w5JEmCqWkTtY";
const redirectUri = "http://127.0.0.1:3000/callback";

const authOptions = {
	method: "POST",
	headers: {
		Authorization:
			"Basic " +
			Buffer.from(clientId + ":" + clientSecret).toString("base64"),
		"Content-Type": "application/x-www-form-urlencoded",
	},
	body: new URLSearchParams({
		grant_type: "authorization_code",
		code: code,
		redirect_uri: redirectUri,
	}),
};

console.log("Fetching new refresh token...");

fetch("https://accounts.spotify.com/api/token", authOptions)
	.then((res) => res.json())
	.then((data) => {
		if (data.error) {
			console.error("ERROR:", data.error_description);
		} else {
			console.log("\n✅ YOUR NEW REFRESH TOKEN:\n");
			console.log(data.refresh_token);
			console.log("\nCopy this into your .env.local file!");
		}
	})
	.catch((err) => console.error(err));
