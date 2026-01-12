import { cn } from '@/app/lib/utils'; 

export function WaveformVisualizer({
  data,
  isRecording = false,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  onSeek,
  className
}) {
  // Ensure data is always an array
  const normalizedData = Array.isArray(data) && data.length > 0 ? data : Array(32).fill(0);
  const progress = duration > 0 ? currentTime / duration : 0;

  const handleClick = (event) => {
    if (onSeek && duration > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = clickX / rect.width;
      const seekTime = percentage * duration;
      onSeek(seekTime);
    }
  };

  return (
    <div className={cn("w-full h-full flex items-center", className)}>
      <svg
        className="w-full h-full"
        viewBox={`0 0 ${normalizedData.length * 2} 24`}
        onClick={handleClick}
        style={{ cursor: onSeek ? 'pointer' : 'default' }}
      >
        {normalizedData.map((amplitude, index) => {
          const height = Math.max(amplitude * 20, 1.5);
          const x = index * 2;
          const y = (24 - height) / 2;
          
          // Determine bar color based on state and progress
          let fillColor = 'hsl(var(--muted-foreground))';
          
          if (isRecording) {
            // During recording, show real-time amplitude
            fillColor = amplitude > 0.15 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
          } else if (isPlaying && duration > 0) {
            // During playback, show progress
            const barProgress = index / normalizedData.length;
            fillColor = barProgress <= progress ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
          }

          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={1.5}
              height={height}
              fill={fillColor}
              className="transition-colors duration-150"
              rx={0.75}
            />
          );
        })}
        
        {/* Progress indicator for playback */}
        {isPlaying && duration > 0 && (
          <line
            x1={progress * normalizedData.length * 2}
            y1={1}
            x2={progress * normalizedData.length * 2}
            y2={23}
            stroke="hsl(var(--primary))"
            strokeWidth={1}
            className="opacity-80"
          />
        )}
      </svg>
    </div>
  );
}