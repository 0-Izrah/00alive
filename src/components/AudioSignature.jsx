import { useMemo } from 'react';

export function AudioSignature({ energy = 0.5, valence = 0.5, isPlaying = false }) {
  // Calculate exactly where the dot should sit on the grid
  // X axis = Valence (0 = sad/left, 1 = happy/right)
  // Y axis = Energy (0 = low/bottom, 1 = high/top)
  const xPos = `${(valence * 100).toFixed(1)}%`;
  const yPos = `${((1 - energy) * 100).toFixed(1)}%`; // Invert because CSS top is 0

  const moodData = useMemo(() => {
    if (!isPlaying && energy === 0 && valence === 0) {
      return { label: "OFFLINE", text: "No signal detected." };
    }
    if (valence > 0.5 && energy > 0.6) return { label: "HYPE / EUPHORIC", text: "High energy, positive vibes." };
    if (valence <= 0.5 && energy > 0.6) return { label: "INTENSE / MOODY", text: "High energy, dark or aggressive." };
    if (valence > 0.5 && energy <= 0.6) return { label: "CHILL / MELLOW", text: "Low energy, positive and peaceful." };
    return { label: "MELANCHOLIC", text: "Low energy, deep in the feels." };
  }, [energy, valence, isPlaying]);

  return (
    <div className="bg-surface/30 border border-border/50 rounded-xl p-5 relative overflow-hidden group hover:border-alive/30 transition-colors flex items-center justify-between gap-4">
      
      {/* Left Side: Text & Stats */}
      <div className="z-10 flex-1">
        <h3 className="text-xs font-mono font-bold text-text uppercase tracking-widest flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-text/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Audio Signature
        </h3>
        
        <p className="text-[10px] font-mono text-muted uppercase tracking-widest leading-relaxed mb-3">
          Current state: <span className="text-alive font-bold border-b border-alive/30">{moodData.label}</span>.
          <br/>{moodData.text}
        </p>

        <div className="flex gap-3">
          <div>
            <p className="text-[9px] text-muted font-mono uppercase tracking-widest">Energy</p>
            <p className="text-xs text-text font-mono">{(energy * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-[9px] text-muted font-mono uppercase tracking-widest">Valence</p>
            <p className="text-xs text-text font-mono">{(valence * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Right Side: The Matrix Radar */}
      <div className="relative w-[100px] h-[100px] flex-shrink-0 bg-void rounded-md border border-border/50 overflow-hidden">
        {/* Grid lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <div className="w-full h-[1px] bg-muted/50" />
          <div className="absolute h-full w-[1px] bg-muted/50" />
        </div>

        {/* Labels */}
        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[7px] text-muted/50 font-mono">HYPE</span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-muted/50 font-mono">CHILL</span>
        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[7px] text-muted/50 font-mono -rotate-90 origin-center">DARK</span>
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] text-muted/50 font-mono rotate-90 origin-center">WARM</span>

        {/* The Dot (Current Song) */}
        {isPlaying || (energy > 0 && valence > 0) ? (
          <div 
            className="absolute w-2 h-2 -ml-1 -mt-1 bg-alive rounded-full shadow-[0_0_10px_rgba(200,255,0,0.8)] transition-all duration-1000 ease-out"
            style={{ left: xPos, top: yPos }}
          >
            {/* Radar ping animation */}
            <div className="absolute inset-0 bg-alive rounded-full animate-ping opacity-50" />
          </div>
        ) : (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-muted font-mono">
            N/A
          </div>
        )}
      </div>

    </div>
  );
}