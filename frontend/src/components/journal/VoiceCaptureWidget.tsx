/**
 * VoiceCaptureWidget - Quick voice-to-text capture for journal entries
 */

import { useState } from 'react';
import { useVoiceCapture } from '../../hooks/useVoiceCapture';

interface VoiceCaptureWidgetProps {
  onTranscriptComplete: (text: string) => void;
}

export default function VoiceCaptureWidget({ onTranscriptComplete }: VoiceCaptureWidgetProps) {
  const {
    isRecording,
    transcript,
    isSupported,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useVoiceCapture();

  const [showWidget, setShowWidget] = useState(false);

  function handleComplete() {
    if (transcript.trim()) {
      onTranscriptComplete(transcript.trim());
      clearTranscript();
      setShowWidget(false);
    }
  }

  function handleToggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  if (!isSupported) {
    return null; // Don't show if browser doesn't support
  }

  return (
    <>
      {/* Mic Button */}
      <button
        onClick={() => setShowWidget(!showWidget)}
        title="Voice Capture"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          backgroundColor: showWidget ? 'rgba(245, 199, 109, 0.2)' : 'rgba(139, 115, 85, 0.1)',
          border: '1px solid rgba(212, 165, 69, 0.2)',
          borderRadius: '8px',
          color: showWidget ? '#F5C76D' : '#8B7355',
          cursor: 'pointer',
          fontSize: '16px',
          transition: 'all 150ms ease',
        }}
      >
        🎤
      </button>

      {/* Voice Capture Panel */}
      {showWidget && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '24px',
            width: '320px',
            backgroundColor: '#251E17',
            border: '1px solid rgba(212, 165, 69, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🎙️</span>
              <span style={{ color: '#F5C76D', fontWeight: 600, fontSize: '14px' }}>
                Voice Capture
              </span>
            </div>
            <button
              onClick={() => setShowWidget(false)}
              style={{
                padding: '4px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#8B7355',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '16px' }}>
            {/* Recording Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <button
                onClick={handleToggleRecording}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: isRecording
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(245, 199, 109, 0.2)',
                  border: isRecording
                    ? '2px solid #ef4444'
                    : '2px solid rgba(245, 199, 109, 0.4)',
                  color: isRecording ? '#ef4444' : '#F5C76D',
                  fontSize: '24px',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  animation: isRecording ? 'pulse 1.5s infinite' : 'none',
                }}
              >
                {isRecording ? '⬛' : '🎤'}
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              {isRecording ? (
                <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>
                  Recording... Click to stop
                </span>
              ) : (
                <span style={{ color: '#8B7355', fontSize: '13px' }}>
                  Click to start recording
                </span>
              )}
            </div>

            {/* Transcript Preview */}
            {transcript && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(37, 30, 23, 0.6)',
                  border: '1px solid rgba(212, 165, 69, 0.15)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  maxHeight: '120px',
                  overflow: 'auto',
                }}
              >
                <div style={{ fontSize: '12px', color: '#8B7355', marginBottom: '4px' }}>
                  Transcript:
                </div>
                <div style={{ fontSize: '14px', color: '#F7E7C6', lineHeight: '1.5' }}>
                  {transcript}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: '#ef4444',
                }}
              >
                Error: {error}
              </div>
            )}

            {/* Actions */}
            {transcript && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={clearTranscript}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(139, 115, 85, 0.3)',
                    borderRadius: '8px',
                    color: '#8B7355',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={handleComplete}
                  style={{
                    flex: 2,
                    padding: '10px',
                    backgroundColor: 'rgba(245, 199, 109, 0.15)',
                    border: '1px solid rgba(245, 199, 109, 0.3)',
                    borderRadius: '8px',
                    color: '#F5C76D',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Add to Entry
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pulse Animation Keyframes */}
      <style>
        {`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
        `}
      </style>
    </>
  );
}
