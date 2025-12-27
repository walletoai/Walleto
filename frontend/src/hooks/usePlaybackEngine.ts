/**
 * usePlaybackEngine Hook
 * Manages playback state and animation loop for trade replay
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Candle, Interval } from '../lib/binanceApi';
import {
  PlaybackEngine,
  createPlaybackEngine,
} from '../lib/playbackEngine';
import type { PlaybackState, PlaybackSpeed } from '../lib/playbackEngine';

export function usePlaybackEngine(candles: Candle[]) {
  const engineRef = useRef<PlaybackEngine>(createPlaybackEngine());
  const [state, setState] = useState<PlaybackState>(() => engineRef.current.getState());

  // Setup callback for state updates
  useEffect(() => {
    const engine = engineRef.current;
    engine.setCallback((newState) => {
      setState(newState);
    });

    // Cleanup on unmount
    return () => {
      if (engine) {
        engine.pause();
      }
    };
  }, []);

  // Update candles when they change
  useEffect(() => {
    const engine = engineRef.current;
    engine.setCandles(candles);
    setState(engine.getState());
  }, [candles]);

  // Callback functions
  const play = useCallback(() => {
    engineRef.current.play();
  }, []);

  const pause = useCallback(() => {
    engineRef.current.pause();
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const stop = useCallback(() => {
    engineRef.current.stop();
  }, []);

  const reset = useCallback(() => {
    engineRef.current.reset();
  }, []);

  const seek = useCallback((index: number) => {
    engineRef.current.seek(index);
  }, []);

  const seekToTime = useCallback((timestamp: number) => {
    engineRef.current.seekToTime(timestamp);
  }, []);

  const nextCandle = useCallback(() => {
    engineRef.current.nextCandle();
  }, []);

  const previousCandle = useCallback(() => {
    engineRef.current.previousCandle();
  }, []);

  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    engineRef.current.setSpeed(speed);
  }, []);

  return {
    state,
    play,
    pause,
    togglePlayPause,
    stop,
    reset,
    seek,
    seekToTime,
    nextCandle,
    previousCandle,
    setSpeed,
  };
}
