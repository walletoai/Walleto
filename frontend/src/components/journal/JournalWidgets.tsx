/**
 * JournalWidgets - Right sidebar with streak, mood heatmap, and AI prompts
 */

import { useState, useEffect } from 'react';
import type { JournalStreak, AIPrompt, MoodHeatmapData } from '../../types/journal';
import { MOOD_INFO } from '../../types/journal';
import * as journalApi from '../../api/journal';

interface JournalWidgetsProps {
  userId: string;
  streak: JournalStreak | null;
  aiPrompts: AIPrompt[];
  onPromptClick: (prompt: AIPrompt) => void;
}

export default function JournalWidgets({
  userId,
  streak,
  aiPrompts,
  onPromptClick,
}: JournalWidgetsProps) {
  const [moodData, setMoodData] = useState<MoodHeatmapData | null>(null);

  useEffect(() => {
    if (userId) {
      journalApi.getMoodHeatmap(userId).then(setMoodData).catch(console.error);
    }
  }, [userId]);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Streak Widget */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'rgba(37, 30, 23, 0.6)',
          border: '1px solid rgba(212, 165, 69, 0.15)',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#F5C76D', fontWeight: 600 }}>
            Journaling Streak
          </h3>
          <span style={{ fontSize: '24px' }}>🔥</span>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: streak?.is_active ? '#F5C76D' : '#8B7355' }}>
              {streak?.current_streak || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#8B7355' }}>Current</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#C2B280' }}>
              {streak?.longest_streak || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#8B7355' }}>Best</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#C2B280' }}>
              {streak?.total_entries || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#8B7355' }}>Total</div>
          </div>
        </div>

        {streak?.is_active && streak.current_streak > 0 && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#22c55e',
              textAlign: 'center',
            }}
          >
            Keep it going! Write today to maintain your streak.
          </div>
        )}
      </div>

      {/* AI Prompts Widget */}
      {aiPrompts.length > 0 && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'rgba(37, 30, 23, 0.6)',
            border: '1px solid rgba(212, 165, 69, 0.15)',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '16px' }}>✨</span>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#F5C76D', fontWeight: 600 }}>
              Writing Prompts
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {aiPrompts.slice(0, 3).map((prompt, i) => (
              <button
                key={i}
                onClick={() => onPromptClick(prompt)}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(245, 199, 109, 0.05)',
                  border: '1px solid rgba(212, 165, 69, 0.15)',
                  borderRadius: '8px',
                  color: '#F7E7C6',
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  lineHeight: '1.4',
                  transition: 'all 150ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      backgroundColor:
                        prompt.priority === 'high'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : prompt.priority === 'medium'
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(139, 115, 85, 0.2)',
                      borderRadius: '4px',
                      color:
                        prompt.priority === 'high'
                          ? '#ef4444'
                          : prompt.priority === 'medium'
                          ? '#f59e0b'
                          : '#8B7355',
                      textTransform: 'uppercase',
                    }}
                  >
                    {prompt.type.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ marginTop: '6px' }}>{prompt.prompt}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mood Heatmap Widget */}
      {moodData && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'rgba(37, 30, 23, 0.6)',
            border: '1px solid rgba(212, 165, 69, 0.15)',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '16px' }}>📊</span>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#F5C76D', fontWeight: 600 }}>
              Mood Overview
            </h3>
          </div>

          {/* Mood Distribution */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#8B7355', marginBottom: '8px' }}>
              {moodData.total_records} mood records
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(moodData.mood_distribution)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([mood, count]) => (
                  <div
                    key={mood}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(245, 199, 109, 0.1)',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  >
                    <span>{MOOD_INFO[mood as keyof typeof MOOD_INFO]?.emoji || '😐'}</span>
                    <span style={{ color: '#C2B280' }}>{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Mini Calendar Heatmap */}
          <MiniMoodCalendar data={moodData.heatmap_data} />
        </div>
      )}

      {/* Stats Widget */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'rgba(37, 30, 23, 0.6)',
          border: '1px solid rgba(212, 165, 69, 0.15)',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '16px' }}>📝</span>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#F5C76D', fontWeight: 600 }}>
            Writing Stats
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div
            style={{
              padding: '12px',
              backgroundColor: 'rgba(245, 199, 109, 0.05)',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#F5C76D' }}>
              {streak?.total_words?.toLocaleString() || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#8B7355', marginTop: '2px' }}>
              Words Written
            </div>
          </div>
          <div
            style={{
              padding: '12px',
              backgroundColor: 'rgba(245, 199, 109, 0.05)',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#F5C76D' }}>
              {streak?.total_entries || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#8B7355', marginTop: '2px' }}>
              Entries Created
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini Mood Calendar Component
function MiniMoodCalendar({ data }: { data: Record<string, any[]> }) {
  const today = new Date();
  const days: Date[] = [];

  // Generate last 35 days (5 weeks)
  for (let i = 34; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(date);
  }

  function getMoodColor(dateStr: string): string {
    const moods = data[dateStr];
    if (!moods || moods.length === 0) return 'rgba(139, 115, 85, 0.1)';

    // Get the dominant mood
    const moodCounts = moods.reduce((acc: Record<string, number>, m: any) => {
      acc[m.mood] = (acc[m.mood] || 0) + 1;
      return acc;
    }, {});

    const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    return MOOD_INFO[dominantMood as keyof typeof MOOD_INFO]?.color || '#8B7355';
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {days.map((date, i) => {
          const dateStr = date.toISOString().split('T')[0];
          const hasMood = data[dateStr] && data[dateStr].length > 0;

          return (
            <div
              key={i}
              title={dateStr}
              style={{
                width: '100%',
                aspectRatio: '1',
                backgroundColor: hasMood ? getMoodColor(dateStr) : 'rgba(139, 115, 85, 0.1)',
                borderRadius: '3px',
                opacity: hasMood ? 0.8 : 0.3,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: '#6B5D4D' }}>
        <span>5 weeks ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
