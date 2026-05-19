export function StreakCounter({ streak, isLoading }) {
	if (isLoading) {
		return (
			<div className="border border-border rounded-2xl p-4 animate-pulse">
				<div className="h-3 bg-surface rounded w-16 mb-2" />
				<div className="h-10 bg-surface rounded w-24" />
			</div>
		);
	}

	if (!streak) return null;

	return (
		<div className="border border-border rounded-2xl p-4">
			<p className="text-muted text-xs tracking-widest mb-1">— STREAK</p>
			<div className="flex items-baseline gap-2">
				<span className="font-display text-6xl text-alive leading-none">
					{streak.current_streak}
				</span>
				<span className="text-muted text-sm">days</span>
			</div>
			<div className="flex gap-4 mt-2">
				<div>
					<p className="text-muted text-xs">best</p>
					<p className="text-text text-sm font-mono">
						{streak.best_streak}
					</p>
				</div>
				<div>
					<p className="text-muted text-xs">total</p>
					<p className="text-text text-sm font-mono">
						{streak.total_days}
					</p>
				</div>
			</div>
		</div>
	);
}
