"use client"
import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { WaveformVisualizer } from './WaveformVisualizer';
import { cn } from '@/app/lib/utils';
import { useAudioPlayer } from '@/app/hooks/useAudioPlayer';



const PLAYBACK_RATES = [0.5, 1, 1.5, 2];

export function VoiceMessage({
  audioUrl,
  duration,
  waveformData,
  isOwnMessage = false,
  className
}) {
  const {
    isPlaying,
    currentTime,
    playbackRate,
    isLoading,
    error,
    play,
    pause,
    seek,
    setPlaybackRate,
    load
  } = useAudioPlayer();

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (audioUrl && !isInitialized) {
      console.log('🎵 VoiceMessage: Loading audio URL:', audioUrl);
      load(audioUrl);
      setIsInitialized(true);
    }
  }, [audioUrl, load, isInitialized]);

  // Reset initialization when audioUrl changes
  useEffect(() => {
    setIsInitialized(false);
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleSpeedChange = () => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    setPlaybackRate(PLAYBACK_RATES[nextIndex]);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-2xl max-w-xs",
        isOwnMessage 
          ? "bg-destructive/10 border border-destructive/20" 
          : "bg-muted",
        className
      )}>
        <div className="text-destructive text-sm">
          Failed to load voice message
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-2xl max-w-xs min-w-[200px]",
      isOwnMessage 
        ? "bg-primary text-primary-foreground" 
        : "bg-muted",
      className
    )}>
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePlayPause}
        disabled={isLoading}
        className={cn(
          "rounded-full w-8 h-8 p-0",
          isOwnMessage 
            ? "hover:bg-primary-foreground/10" 
            : "hover:bg-muted-foreground/10"
        )}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Waveform and Duration */}
      <div className="flex-1 space-y-1">
        <div className="h-8">
          <WaveformVisualizer
            data={waveformData || []}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onSeek={seek}
            className="h-full"
          />
        </div>
        <div className="flex items-center justify-between text-xs opacity-70">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback Speed */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSpeedChange}
        className={cn(
          "text-xs px-2 h-6 min-w-0",
          isOwnMessage 
            ? "hover:bg-primary-foreground/10" 
            : "hover:bg-muted-foreground/10"
        )}
      >
        {playbackRate}x
      </Button>
    </div>
  );
}