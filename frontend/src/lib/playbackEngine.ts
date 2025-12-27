/**
 * Playback Engine
 * Handles timeline animation and playback controls for trade replay
 */

import type { Candle } from './binanceApi';

export type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10;

export interface PlaybackState {
  isPlaying: boolean;
  currentCandleIndex: number;
  speed: PlaybackSpeed;
  totalCandles: number;
  currentCandle: Candle | null;
  progress: number; // 0 to 1
}

export type PlaybackCallback = (state: PlaybackState) => void;

export class PlaybackEngine {
  private candles: Candle[] = [];
  private currentIndex = 0;
  private isPlaying = false;
  private speed: PlaybackSpeed = 1;
  private animationFrameId: number | null = null;
  private lastUpdateTime = 0;
  private callback: PlaybackCallback | null = null;

  // Configurable playback parameters
  private readonly candleDurationMs: Record<number, number> = {
    0.5: 2000, // Each candle takes 2 seconds at 0.5x speed
    1: 1000,   // Each candle takes 1 second at 1x speed
    2: 500,
    5: 200,
    10: 100,
  };

  /**
   * Initialize the playback engine with candles
   */
  setCandles(candles: Candle[]): void {
    this.candles = candles;
    this.currentIndex = 0;
    this.stop();
  }

  /**
   * Set the callback function to be called on state changes
   */
  setCallback(callback: PlaybackCallback): void {
    this.callback = callback;
  }

  /**
   * Play the animation
   */
  play(): void {
    if (this.isPlaying || this.candles.length === 0) return;

    this.isPlaying = true;
    this.lastUpdateTime = performance.now();
    this.animate();
  }

  /**
   * Pause the animation
   */
  pause(): void {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Stop the animation and reset to beginning
   */
  stop(): void {
    this.pause();
    this.currentIndex = 0;
    this.notifyCallback();
  }

  /**
   * Reset to start
   */
  reset(): void {
    this.currentIndex = 0;
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyCallback();
  }

  /**
   * Seek to a specific candle index
   */
  seek(index: number): void {
    this.currentIndex = Math.max(0, Math.min(index, this.candles.length - 1));
    this.notifyCallback();
  }

  /**
   * Seek to a specific time (timestamp in milliseconds)
   */
  seekToTime(timestamp: number): void {
    const index = this.candles.findIndex((c) => c.time >= timestamp);
    if (index !== -1) {
      this.seek(index);
    }
  }

  /**
   * Go to next candle
   */
  nextCandle(): void {
    if (this.currentIndex < this.candles.length - 1) {
      this.currentIndex++;
      this.notifyCallback();
    }
  }

  /**
   * Go to previous candle
   */
  previousCandle(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.notifyCallback();
    }
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed;
  }

  /**
   * Get current state
   */
  getState(): PlaybackState {
    return {
      isPlaying: this.isPlaying,
      currentCandleIndex: this.currentIndex,
      speed: this.speed,
      totalCandles: this.candles.length,
      currentCandle: this.candles[this.currentIndex] || null,
      progress: this.candles.length > 0 ? this.currentIndex / (this.candles.length - 1) : 0,
    };
  }

  /**
   * Animation loop - smooth continuous playback
   */
  private animate = (): void => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const deltaTime = now - this.lastUpdateTime;
    const candleDuration = this.candleDurationMs[this.speed];

    // Update last update time
    this.lastUpdateTime = now;

    // Calculate how many candles to advance based on elapsed time
    const candlesAdvanced = deltaTime / candleDuration;
    this.currentIndex += candlesAdvanced;

    // Clamp to integer for proper candle indexing
    const floorIndex = Math.floor(this.currentIndex);

    // Stop if we've reached the end
    if (floorIndex >= this.candles.length - 1) {
      this.currentIndex = this.candles.length - 1;
      this.isPlaying = false;
      this.notifyCallback();
      return;
    }

    this.notifyCallback();
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Notify callback of state change
   */
  private notifyCallback(): void {
    if (this.callback) {
      this.callback(this.getState());
    }
  }
}

/**
 * Create a new playback engine instance
 */
export function createPlaybackEngine(): PlaybackEngine {
  return new PlaybackEngine();
}
