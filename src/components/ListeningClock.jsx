export function ListeningClock({ hourData = [] }) {
  // Generate beautiful mocked 24h data if none provided
  const clockData = hourData.length > 0 ? hourData : Array.from({length: 24}, (_, i) => {
    // Fake trend: peaks late night (22-2) and afternoon (14-17)
    let weight = 1;
    if (i >= 22 || i <= 2) weight = 8;
    else if (i >= 14 && i <= 17) weight = 6;
    else if (i >= 8 && i <= 10) weight = 4;
    return { hour: i, count: Math.floor(Math.random() * weight * 3) };
  });

  const maxCount = Math.max(...clockData.map(d => d.count), 1);
  const radius = 40;
  const cx = 60;
  const cy = 60;

  return (
    <div className="bg-surface/30 border border-border/50 rounded-xl p-6 relative overflow-hidden group hover:border-alive/30 transition-colors flex items-center justify-between">
      <div className="z-10">
        <h3 className="text-xs font-mono font-bold text-text uppercase tracking-widest flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-text/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Listening Clock
        </h3>
        <p className="text-[10px] font-mono text-muted uppercase tracking-widest leading-relaxed max-w-[150px]">
          Historically peaks at <span className="text-alive font-bold border-b border-alive/30">11:00 PM</span>. Definitely a late-night listener.
        </p>
      </div>

      <div className="relative w-[120px] h-[120px] flex-shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
          {/* Base circle background */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="currentColor" className="text-border/30" strokeWidth="1" />
          
          {clockData.map((data, i) => {
            // Distribute 24 bars evenly around the circle
            const angle = (i / 24) * Math.PI * 2;
            const barHeight = (data.count / maxCount) * 15; // Max 15px extending outwards
            const startR = radius + 2;
            const endR = startR + barHeight;
            
            const x1 = cx + startR * Math.cos(angle);
            const y1 = cy + startR * Math.sin(angle);
            const x2 = cx + endR * Math.cos(angle);
            const y2 = cy + endR * Math.sin(angle);

            // Slightly dim the bars that are zero-ish
            const isZero = data.count === 0;

            return (
              <line 
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                className={isZero ? "text-border/50" : "text-alive transition-all duration-500"}
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Center dot/indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="w-1.5 h-1.5 rounded-full bg-alive animate-pulse border border-background shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
        </div>

        {/* Little hour labels (midnight, 6, 12, 18) around the clock */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-[8px] font-mono text-muted/60">00</span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 text-[8px] font-mono text-muted/60">12</span>
        <span className="absolute right-0 top-1/2 translate-x-2 -translate-y-1/2 text-[8px] font-mono text-muted/60">06</span>
        <span className="absolute left-0 top-1/2 -translate-x-3 -translate-y-1/2 text-[8px] font-mono text-muted/60">18</span>
      </div>
    </div>
  );
}