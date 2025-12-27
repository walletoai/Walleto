/**
 * PlaybackControls Component
 * Playback controls and timeline slider for trade replay
 */

import React, { memo } from 'react';
import type { PlaybackSpeed } from '../../lib/playbackEngine';
import type { Interval } from '../../lib/binanceApi';
import { formatTimestamp } from '../../hooks/useTradeStats';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  speed: PlaybackSpeed;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  progress: number; // 0 to 1
  currentIndex: number;
  totalCandles: number;
  onSeek: (index: number) => void;
  onReset: () => void;
  onPrevious: () => void;
  onNext: () => void;
  currentCandle: any;
  interval: Interval;
  onIntervalChange: (interval: Interval) => void;
}

const speeds: PlaybackSpeed[] = [0.5, 1, 2, 5, 10];
const intervals: Interval[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

const PlaybackControlsComponent: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onPlay,
  onPause,
  speed,
  onSpeedChange,
  progress,
  currentIndex,
  totalCandles,
  onSeek,
  onReset,
  onPrevious,
  onNext,
  currentCandle,
  interval,
  onIntervalChange,
}) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = Math.floor((parseFloat(e.target.value) / 100) * (totalCandles - 1));
    onSeek(newIndex);
  };

  // Format the candle time - handle both milliseconds and seconds
  const candleTime = currentCandle?.time
    ? new Date(currentCandle.time > 1000000000000 ? currentCandle.time : currentCandle.time * 1000).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : '--:--';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        backgroundColor: 'rgba(37, 30, 23, 0.6)',
        border: '1px solid rgba(212, 165, 69, 0.15)',
        borderRadius: '12px',
      }}
    >
      {/* Timeline Slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              color: '#8B7355',
              fontWeight: '600',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Timeline
          </span>
          <span
            style={{
              fontSize: '11px',
              color: '#C2B280',
              fontWeight: '500',
            }}
          >
            {currentIndex + 1} / {totalCandles} - {candleTime}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <input
            type="range"
            min="0"
            max="100"
            value={progress * 100}
            onChange={handleSliderChange}
            aria-label="Trade playback timeline"
            title={`Candle ${currentIndex + 1} of ${totalCandles}`}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: `linear-gradient(to right, #F5C76D 0%, #F5C76D ${progress * 100}%, rgba(212, 165, 69, 0.1) ${progress * 100}%, rgba(212, 165, 69, 0.1) 100%)`,
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none',
              cursor: 'pointer',
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #F5C76D;
              cursor: pointer;
              box-shadow: 0 0 6px rgba(245, 199, 109, 0.4);
            }

            input[type="range"]::-moz-range-thumb {
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #F5C76D;
              cursor: pointer;
              border: none;
              box-shadow: 0 0 6px rgba(245, 199, 109, 0.4);
            }
          `}</style>
        </div>
      </div>

      {/* Playback Controls */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
        {/* Reset Button */}
        <button
          onClick={onReset}
          aria-label="Reset playback to beginning"
          title="Reset to beginning"
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(212, 165, 69, 0.1)',
            border: '1px solid rgba(212, 165, 69, 0.3)',
            color: '#F5C76D',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 200ms ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.backgroundColor = 'rgba(212, 165, 69, 0.2)';
            el.style.boxShadow = '0 0 8px rgba(245, 199, 109, 0.2)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.backgroundColor = 'rgba(212, 165, 69, 0.1)';
            el.style.boxShadow = 'none';
          }}
        >
          <span>↻</span> Reset
        </button>

        {/* Previous Button */}
        <button
          onClick={onPrevious}
          aria-label="Go to previous candle"
          title="Previous candle (Shift + ←)"
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(212, 165, 69, 0.1)',
            border: '1px solid rgba(212, 165, 69, 0.3)',
            color: '#F5C76D',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.backgroundColor = 'rgba(212, 165, 69, 0.2)';
            el.style.boxShadow = '0 0 8px rgba(245, 199, 109, 0.2)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.backgroundColor = 'rgba(212, 165, 69, 0.1)';
            el.style.boxShadow = 'none';
          }}
        >
          ◀
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
          style={{
            padding: '10px 20px',
            backgroundColor: isPlaying ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
            border: `1px solid ${isPlaying ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)'}`,
            color: isPlaying ? '#ef4444' : '#10b981',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 200ms ease',
            minWidth: '80px',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.backgroundColor = isPlaying
              ? 'rgba(239, 68, 68, 0.4)'
              : 'rgba(16, 185, 129, 0.4)';
            el.style.boxShadow = isPlaying
              ? '0 0 8px rgba(239, 68, 68, 0.3)'
              : '0 0 8px rgba(16, 185, 129, 0.3)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.backgroundColor = isPlaying
              ? 'rgba(239, 68, 68, 0.3)'
              : 'rgba(16, 185, 129, 0.3)';
            el.style.boxShadow = 'none';
          }}
          title={`${isPlaying ? 'Pause' : 'Play'} (Shift + ↓)`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        {/* Next Button */}
        <button
          onClick={onNext}
          aria-label="Go to next candle"
          title="Next candle (Shift + →)"
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(212, 165, 69, 0.1)',
            border: '1px solid rgba(212, 165, 69, 0.3)',
            color: '#F5C76D',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.backgroundColor = 'rgba(212, 165, 69, 0.2)';
            el.style.boxShadow = '0 0 8px rgba(245, 199, 109, 0.2)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.backgroundColor = 'rgba(212, 165, 69, 0.1)';
            el.style.boxShadow = 'none';
          }}
        >
          ▶
        </button>
      </div>

      {/* Speed and Interval Controls */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        {/* Speed Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label
            style={{
              fontSize: '11px',
              color: '#8B7355',
              fontWeight: '600',
              textTransform: 'uppercase',
            }}
          >
            Speed:
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                style={{
                  padding: '6px 10px',
                  backgroundColor: speed === s ? 'rgba(245, 199, 109, 0.2)' : 'rgba(212, 165, 69, 0.1)',
                  border: `1px solid ${speed === s ? 'rgba(245, 199, 109, 0.4)' : 'rgba(212, 165, 69, 0.2)'}`,
                  color: speed === s ? '#F5C76D' : '#C2B280',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  if (speed !== s) {
                    el.style.backgroundColor = 'rgba(212, 165, 69, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  if (speed !== s) {
                    el.style.backgroundColor = 'rgba(212, 165, 69, 0.1)';
                  }
                }}
                title={`${s}x speed`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Interval Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label
            style={{
              fontSize: '11px',
              color: '#8B7355',
              fontWeight: '600',
              textTransform: 'uppercase',
            }}
          >
            Timeframe:
          </label>
          <select
            value={interval}
            onChange={(e) => onIntervalChange(e.target.value as Interval)}
            style={{
              padding: '6px 10px',
              backgroundColor: 'rgba(37, 30, 23, 0.8)',
              color: '#F5C76D',
              border: '1px solid rgba(212, 165, 69, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLSelectElement;
              el.style.backgroundColor = 'rgba(37, 30, 23, 0.9)';
              el.style.borderColor = 'rgba(212, 165, 69, 0.5)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLSelectElement;
              el.style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
              el.style.borderColor = 'rgba(212, 165, 69, 0.3)';
            }}
          >
            {intervals.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export const PlaybackControls = memo(PlaybackControlsComponent);
