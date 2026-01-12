import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioPlayer() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const audioRef = useRef(null);
    const progressIntervalRef = useRef(null);

    // Initialize audio element
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.preload = 'metadata';

            // Event listeners
            audioRef.current.addEventListener('loadstart', () => {
                setIsLoading(true);
                setError(null);
            });

            audioRef.current.addEventListener('loadedmetadata', () => {
                setDuration(audioRef.current.duration);
                setIsLoading(false);
            });

            audioRef.current.addEventListener('timeupdate', () => {
                setCurrentTime(audioRef.current.currentTime);
            });

            audioRef.current.addEventListener('ended', () => {
                setIsPlaying(false);
                setCurrentTime(0);
                if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                    progressIntervalRef.current = null;
                }
            });

            audioRef.current.addEventListener('error', (e) => {
                console.error('❌ Audio loading error:', {
                    error: e,
                    src: audioRef.current?.src,
                    errorCode: audioRef.current?.error?.code,
                    errorMessage: audioRef.current?.error?.message
                });
                setError('Failed to load audio');
                setIsLoading(false);
                setIsPlaying(false);
            });

            audioRef.current.addEventListener('play', () => {
                setIsPlaying(true);
            });

            audioRef.current.addEventListener('pause', () => {
                setIsPlaying(false);
            });
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    const load = useCallback((url) => {
        if (!audioRef.current) return;

        console.log('🎵 Loading audio:', url);
        setError(null);
        setIsLoading(true);
        audioRef.current.src = url;
        audioRef.current.load();
    }, []);

    const play = useCallback(() => {
        if (!audioRef.current) return;

        console.log('▶️ Playing audio from:', audioRef.current.src);
        audioRef.current.play().catch((err) => {
            console.error('❌ Play error:', err);
            setError('Failed to play audio');
            setIsPlaying(false);
        });
    }, []);

    const pause = useCallback(() => {
        if (!audioRef.current) return;

        audioRef.current.pause();
    }, []);

    const seek = useCallback((time) => {
        if (!audioRef.current) return;

        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }, []);

    const setPlaybackRateHandler = useCallback((rate) => {
        if (!audioRef.current) return;

        audioRef.current.playbackRate = rate;
        setPlaybackRate(rate);
    }, []);

    return {
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        isLoading,
        error,
        play,
        pause,
        seek,
        setPlaybackRate: setPlaybackRateHandler,
        load
    };
}
