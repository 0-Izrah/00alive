const colorMap = {
	alive: {
		bg: "bg-alive/10",
		border: "border-alive/30",
		text: "text-alive",
		dot: "bg-alive",
	},
	warn: {
		bg: "bg-warn/10",
		border: "border-warn/30",
		text: "text-warn",
		dot: "bg-warn",
	},
	dead: {
		bg: "bg-dead/10",
		border: "border-dead/30",
		text: "text-dead",
		dot: "bg-dead",
	},
};

export function StatusBadge({ tier, label, color = "alive", genre }) {
	const c = colorMap[color] || colorMap.alive;
	const isLive = tier === "LIVE";

	return (
		<div className="flex flex-wrap gap-2 items-center">
			<div
				className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${c.bg} ${c.border}`}
			>
				<span className="relative flex h-2 w-2">
					{isLive && (
						<span
							className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-75`}
						/>
					)}
					<span
						className={`relative inline-flex rounded-full h-2 w-2 ${c.dot}`}
					/>
				</span>
				<span
					className={`text-xs font-mono uppercase tracking-widest ${c.text}`}
				>
					{label}
				</span>
			</div>
			
			{genre && genre !== 'unknown' && (
				<div title="Current dominant genre" className="inline-flex items-center px-4 py-2 rounded-full text-[10px] font-mono tracking-widest uppercase border border-border/60 text-muted transition-colors hover:border-text/50 hover:text-text cursor-default">
					{genre}
				</div>
			)}
		</div>
	);
}
