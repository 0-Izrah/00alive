import { useEffect, useState } from 'react';
import { FastAverageColor } from 'fast-average-color';
import { EKG } from './components/EKG';
import { StatusBadge } from './components/StatusBadge';
import { TrackCard } from './components/TrackCard';
import { RecentTracks } from './components/RecentTracks';
import { PingModal } from './components/PingModal';
import { ArtistLoyalty } from './components/ArtistLoyalty';
import { VibeCheck } from './components/VibeCheck';

export default function App() {
  const [statusData, setStatusData] = useState(null);
  const [comment, setComment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(true);
  const [isPingModalOpen, setIsPingModalOpen] = useState(false);
  const [visitorCount, setVisitorCount] = useState('...');
  const [ekgColor, setEkgColor] = useState('rgb(var(--color-alive))');

  useEffect(() => {
    // Update page title based on status
    if (statusData) {
      const tierText = {
        'LIVE': "yeah he's literally listening right now",
        'ALIVE': "yeah he's good",
        'QUIET': "probably fine",
        'STILL HERE': "still here, just quiet",
        'UNKNOWN': "unclear",
        'CHECK ON HIM': "???",
      };
      document.title = `izrah.live — ${tierText[statusData.tier] || 'loading'}`;
    }
  }, [statusData]);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setStatusData(data);
        
        // Extract dominant color from album art
        if (data.track && data.track.albumArt) {
           const fac = new FastAverageColor();
           fac.getColorAsync(data.track.albumArt)
             .then(color => {
               setEkgColor(color.rgba);
               // Also set the CSS variable to shift the mood
               document.documentElement.style.setProperty('--color-alive', `${color.value[0]} ${color.value[1]} ${color.value[2]}`);
               // Shift background subtly based on valence/energy
               if (data.valence !== undefined && data.energy !== undefined) {
                  const shiftOpacity = ((data.energy + data.valence) / 2) * 0.1;
                  document.documentElement.style.setProperty('--color-mood-bg', `rgba(${color.value[0]}, ${color.value[1]}, ${color.value[2]}, ${shiftOpacity})`);
               }
             })
             .catch(e => console.log('Color extraction failed:', e));
        }

        // Fetch comment once we have track data
        if (data.track) {
          fetchComment(data.track, data.tier, data.energy, data.valence);
        } else {
          setCommentLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchComment(track, tier, energy, valence) {
      try {
        const res = await fetch('/api/comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackId: track.id,
            track: track.name,
            artist: track.artist,
            tier,
            energy,
            valence,
          }),
        });
        const data = await res.json();
        setComment(data.comment);
      } catch (err) {
        console.error('Failed to fetch comment:', err);
      } finally {
        setCommentLoading(false);
      }
    }

    async function trackVisitor() {
      try {
        const res = await fetch('/api/visit');
        if (res.ok) {
           const data = await res.json();
           setVisitorCount(data.todayCount);
        }
      } catch(err) {
        // Silently fail if visitor tracker is down
      }
    }

    fetchStatus();
    trackVisitor();
    
    // Refresh status every 60s
    const statusInterval = setInterval(fetchStatus, 60000);
    return () => clearInterval(statusInterval);
  }, []);

  const tierColor = statusData?.color || 'alive';
  const activeEkgColor = tierColor === 'alive' ? ekgColor : tierColor === 'warn' ? '#ff9500' : '#ff3b30';

  return (
    <div className="min-h-dvh bg-void relative overflow-hidden flex flex-col items-center py-10 selection:bg-alive selection:text-void">
      {/* Background glowing orb relative to status */}
      <div 
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-25 pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: activeEkgColor }}
      />
      
      <div className="w-full max-w-sm px-5 flex flex-col z-10">

      {/* EKG at the very top */}
      <div className="mb-8 opacity-60">
        <EKG
          bpm={statusData?.bpm || 80}
          energy={statusData?.energy || 0.5}
          valence={statusData?.valence || 0.5}
          status={statusData?.tier || 'ALIVE'}
          color={ekgColor}
        />
      </div>

        {/* The question */}
        <div className="mb-8">
          <p className="text-muted text-[15px] tracking-[0.3em] font-semibold mb-3">— IS IZRAH STILL ALIVE?</p>
          <h1 className="font-display text-8xl leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 tracking-wider">
            {loading ? '...' : (
              statusData?.tier === 'CHECK ON HIM' || statusData?.tier === 'UNKNOWN'
                ? 'UNCLEAR.'
                : 'YES.'
            )}
          </h1>
        </div>

        {/* Status badge and Genre */}
        {!loading && statusData && (
          <div className="mb-8 flex items-center justify-between border-b border-border/50 pb-6">
            <StatusBadge
              tier={statusData.tier}
              label={statusData.label}
              color={statusData.color}
              genre={statusData.topGenre}
            />
            
            <button 
              onClick={() => setIsPingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-alive/30 bg-alive/5 text-alive text-[10px] font-mono tracking-widest uppercase transition-colors hover:bg-alive/10 hover:border-alive/50 cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Ping Him
            </button>
          </div>
        )}

        {/* The vibe / witty comment — heart of the page */}
        <div className="mb-10 min-h-[4rem] relative">
          <div className="absolute -left-3 top-0 bottom-0 w-[2px] bg-gradient-to-b from-border/50 to-transparent" />
          {commentLoading ? (
            <div className="space-y-2">
              <div className="h-3 bg-surface rounded w-full animate-pulse" />
              <div className="h-3 bg-surface rounded w-4/5 animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {statusData?.vibe && (
                <span className="text-alive/80 text-[10px] uppercase font-bold tracking-[0.2em]">[{statusData.vibe}]</span>
              )}
              <p className="text-text/80 text-[13px] font-mono leading-relaxed pl-1">
                {comment || statusData?.message}
              </p>
            </div>
          )}
        </div>

        {/* Track card */}
        <div className="mb-6">
          <TrackCard track={statusData?.track} isLoading={loading} ekgColor={activeEkgColor}/>
        </div>

        <div className="mb-7">
          <VibeCheck 
            track={statusData?.track} 
            comment={comment || statusData?.message} 
            commentLoading={commentLoading} 
          />
        </div>

        <div className="mb-10">
          <ArtistLoyalty 
            topArtists={statusData?.loyalty} 
            isLoading={loading} 
          />
        </div>




        {/* Recently played mini-list */}
        <div className="mb-4">
          <RecentTracks 
            tracks={statusData?.recentTracks} 
            isLoading={loading} 
          />
        </div>

      </div>

      <PingModal isOpen={isPingModalOpen} onClose={() => setIsPingModalOpen(false)} />
    </div>
  );
}
