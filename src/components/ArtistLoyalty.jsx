export function ArtistLoyalty({ topArtists = [] }) {
	// Mock data if none passed
	const artists =
		topArtists.length > 0
			? topArtists
			: [
					{ name: "Brent Faiyaz", count: 11 },
					{ name: "Victony", count: 8 },
					{ name: "Don Toliver", count: 7 },
					{ name: "Leon Thomas", count: 5 },
					{ name: "Wizkid", count: 4 },
				];

	return (
		<div className="bg-surface/30 border border-border/50 rounded-xl p-6 relative overflow-hidden group hover:border-alive/30 transition-colors">
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-xs font-mono font-bold text-text uppercase tracking-widest flex items-center gap-2">
					<svg
						className="w-4 h-4 text-text/50"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
						/>
					</svg>
					Artist Loyalty Tracker
				</h3>
				<span className="text-[10px] font-mono text-muted uppercase tracking-widest">
					This Month
				</span>
			</div>

			<div className="space-y-3">
				{artists.slice(0, 5).map((artist, idx) => (
					<div
						key={idx}
						className="flex justify-between items-center group/item"
					>
						<span className="text-sm font-mono text-text/80 group-hover/item:text-alive transition-colors">
							{artist.name}
						</span>
						<div className="flex items-center gap-3">
							<div className="h-[2px] bg-border/50 w-12 sm:w-24 relative overflow-hidden rounded-full">
								<div
									className="absolute left-0 top-0 h-full bg-alive/70"
									style={{
										width: `${(artist.count / artists[0].count) * 100}%`,
									}}
								/>
							</div>
							<span className="text-xs font-mono text-alive font-bold w-12 text-right">
								× {artist.count}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
