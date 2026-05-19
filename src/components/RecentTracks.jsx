export function RecentTracks({ tracks, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 mt-8">
        <div className="h-3 bg-surface rounded w-24 animate-pulse mb-1" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 items-center">
            <div className="size-10 bg-surface rounded animate-pulse" />
            <div className="flex flex-col gap-2 w-full">
              <div className="h-3 bg-surface rounded w-1/2 animate-pulse" />
              <div className="h-2 bg-surface rounded w-1/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!tracks || tracks.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mt-8">
      <p className="text-muted text-xs tracking-widest mb-1">— RECENTLY PLAYED</p>
      <div className="flex flex-col gap-4">
        {tracks.map((item, idx) => (
          <a
            key={`${item.trackId || idx}-${item.playedAt}`}
            href={item.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 items-center group transition-colors hover:bg-surface/50 p-2 -mx-2 rounded-lg"
          >
            <img 
              src={item.albumArt} 
              alt="Album art" 
              className="size-10 rounded shadow-md object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-300"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-text text-sm font-semibold truncate group-hover:text-alive transition-colors">
                {item.track}
              </span>
              <span className="text-muted text-xs truncate">
                {item.artist}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
