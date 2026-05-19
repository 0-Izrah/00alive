const artistTemplates = {
	"Brent Faiyaz": [
		"brent faiyaz is on. alive but emotionally unavailable.",
		"listening to brent. surviving, but definitely avoiding accountability.",
		"faiyaz on the aux. breathing, scheming, probably lying.",
	],
	Wizkid: [
		"wizkid playing. alive and operating strictly on island time.",
		"starboy on the speakers. pulse steady, vibes immaculate.",
		"listening to wiz. alive and completely unbothered.",
	],
	"J. Cole": [
		"j. cole is on. alive and currently overthinking.",
		"cole playing. breathing fine, but mentally journaling.",
		"listening to j. cole. alive and mildly exhausted by society.",
	],
	Rema: [
		"rema is on. alive. pulse rate is comfortably low.",
		"listening to rema. no sudden movements detected.",
		"rema playing. breathing normally. totally unbothered.",
	],
	SZA: [
		"sza is playing. alive, but processing something heavy.",
		"listening to sza. pulse is steady, feelings are hurt.",
		"sza on the aux. alive, yearning, completely fine.",
	],
	Drake: [
		"drake is playing. alive and probably doing too much.",
		"listening to drake. surviving, but holding a petty grudge.",
		"drake on the speakers. alive and stubbornly sentimental.",
	],
	Dave: [
		"dave is on. alive and trapped in deep thought.",
		"listening to dave. breathing fine, contemplating the system.",
		"dave playing. alive and incredibly serious right now.",
	],
	"Frank Ocean": [
		"frank ocean is playing. alive, but mentally in 2016.",
		"listening to frank. breathing, yearning, waiting for the album.",
		"frank ocean on the aux. alive but dissociating.",
	],
	"Kendrick Lamar": [
		"kendrick is on. alive and analyzing the room.",
		"listening to kendrick. breathing fine, judging silently.",
		"kendrick playing. alive and spiritually fatigued.",
	],
	"The Weeknd": [
		"the weeknd is playing. alive, but making questionable choices.",
		"listening to the weeknd. surviving the afterparty.",
		"the weeknd on the aux. alive, pulse slightly elevated.",
	],
};

const tierTemplates = {
	'LIVE': [
		"music is actively playing. proof of life is absolute.",
		"track is spinning right now. clearly not dead yet.",
		"audio output detected. a human hand pressed play.",
	],
	'ALIVE': [
		"music played recently. signs of life confirm existence.",
		"recent listening activity logged. still occupying space.",
		"the aux was warm recently. survival is confirmed.",
	],
	'QUIET': [
		"silent for a few hours. probably just doing human things.",
		"no music recently. likely asleep or forced to interact.",
		"the speakers are quiet. survival is assumed but unverified.",
	],
	"STILL HERE": [
		"no music today. the silence is getting slightly suspicious.",
		"a full day without audio. unprecedented, but surviving.",
		"zero tracks played today. either plotting or sleeping deeply.",
	],
	'UNKNOWN': [
		"twenty-four hours of silence. the void is staring back.",
		"no music in a day. beginning to question everything.",
		"the playlist is dead. let us hope he is not.",
	],
	"CHECK ON HIM": [
		"forty-eight hours of absolute silence. please investigate.",
		"two days no music. send someone to the him.",
		"the aux is abandoned. genuinely reach out.",
	],
};

const genericFallback = [
    "the algorithm says alive. we choose to believe it.",
    "music was played. a human played it. that human is alive.",
    "still here. still listening. still fine.",
    "alive per spotify. alive per this website. two sources confirm.",
];

function getComment(artist, tier) {
	// Try artist-specific template first
	if (artist) {
		for (const [name, lines] of Object.entries(artistTemplates)) {
			if (artist.toLowerCase().includes(name.toLowerCase())) {
				return lines[Math.floor(Math.random() * lines.length)];
			}
		}
	}

	// Fall back to tier template
	const tierLines = tierTemplates[tier];
	if (tierLines && tierLines.length > 0) {
		return tierLines[Math.floor(Math.random() * tierLines.length)];
	}

	// Final fallback
	return genericFallback[Math.floor(Math.random() * genericFallback.length)];
}

export { getComment };
