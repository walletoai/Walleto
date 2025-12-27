/**
 * MoodPickerModal - Modal to select pre/post trade mood
 */

import type { MoodType } from '../../types/journal';
import { MOOD_INFO } from '../../types/journal';

interface MoodPickerModalProps {
  isOpen: boolean;
  type: 'pre' | 'post';
  currentMood?: MoodType;
  onSelect: (mood: MoodType) => void;
  onClose: () => void;
}

const MOOD_CATEGORIES = {
  positive: ['confident', 'excited', 'calm', 'focused'] as MoodType[],
  neutral: ['neutral'] as MoodType[],
  negative: ['anxious', 'fearful', 'fomo', 'revenge', 'frustrated'] as MoodType[],
};

export default function MoodPickerModal({
  isOpen,
  type,
  currentMood,
  onSelect,
  onClose,
}: MoodPickerModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '400px',
          backgroundColor: '#251E17',
          border: '1px solid rgba(212, 165, 69, 0.2)',
          borderRadius: '16px',
          zIndex: 1001,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', color: '#F5C76D', fontWeight: 700 }}>
            {type === 'pre' ? 'Pre-Trade Mood' : 'Post-Trade Mood'}
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#8B7355',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '13px', color: '#8B7355', marginBottom: '16px' }}>
            {type === 'pre'
              ? 'How are you feeling before this trade?'
              : 'How did you feel after the trade?'}
          </div>

          {/* Positive Moods */}
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '11px',
                color: '#22c55e',
                fontWeight: 600,
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              Positive
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {MOOD_CATEGORIES.positive.map((mood) => (
                <MoodButton
                  key={mood}
                  mood={mood}
                  isSelected={currentMood === mood}
                  onClick={() => onSelect(mood)}
                />
              ))}
            </div>
          </div>

          {/* Neutral */}
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '11px',
                color: '#8B7355',
                fontWeight: 600,
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              Neutral
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {MOOD_CATEGORIES.neutral.map((mood) => (
                <MoodButton
                  key={mood}
                  mood={mood}
                  isSelected={currentMood === mood}
                  onClick={() => onSelect(mood)}
                />
              ))}
            </div>
          </div>

          {/* Negative Moods */}
          <div>
            <div
              style={{
                fontSize: '11px',
                color: '#ef4444',
                fontWeight: 600,
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              Negative (Be Careful!)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {MOOD_CATEGORIES.negative.map((mood) => (
                <MoodButton
                  key={mood}
                  mood={mood}
                  isSelected={currentMood === mood}
                  onClick={() => onSelect(mood)}
                />
              ))}
            </div>
          </div>

          {/* Clear Button */}
          {currentMood && (
            <button
              onClick={() => {
                // Clear mood by setting to undefined
                onClose();
              }}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '10px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(139, 115, 85, 0.3)',
                borderRadius: '8px',
                color: '#8B7355',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Clear Mood
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function MoodButton({
  mood,
  isSelected,
  onClick,
}: {
  mood: MoodType;
  isSelected: boolean;
  onClick: () => void;
}) {
  const info = MOOD_INFO[mood];

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        backgroundColor: isSelected ? `${info.color}20` : 'rgba(37, 30, 23, 0.6)',
        border: isSelected ? `1px solid ${info.color}50` : '1px solid rgba(212, 165, 69, 0.15)',
        borderRadius: '20px',
        color: isSelected ? info.color : '#F7E7C6',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 150ms ease',
      }}
    >
      <span style={{ fontSize: '16px' }}>{info.emoji}</span>
      <span>{info.label}</span>
    </button>
  );
}
