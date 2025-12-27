import React, { useMemo } from 'react';

interface Props {
  data: any;
}

interface Streak {
  type: 'win' | 'loss';
  length: number;
  startIndex: number;
  pnl?: number;
}

export const ConsecutiveWinsLossesWidget: React.FC<Props> = ({ data }) => {
  const { filteredTrades } = data;

  const streakAnalysis = useMemo((): { streaks: Streak[]; maxWinStreak: number; maxLossStreak: number; currentStreak: Streak | null; avgWinStreak: number; avgLossStreak: number } => {
    if (!filteredTrades || filteredTrades.length === 0) {
      return { streaks: [], maxWinStreak: 0, maxLossStreak: 0, currentStreak: null, avgWinStreak: 0, avgLossStreak: 0 };
    }

    const streaks: Streak[] = [];
    let currentStreak: Streak | null = null;

    filteredTrades.forEach((trade: any, index: number) => {
      const isWin = (trade.pnl_usd || 0) >= 0;
      const streakType = isWin ? 'win' : 'loss';

      if (!currentStreak || currentStreak.type !== streakType) {
        if (currentStreak) {
          streaks.push(currentStreak);
        }
        currentStreak = {
          type: streakType,
          length: 1,
          startIndex: index,
          pnl: isWin ? (trade.pnl_usd || 0) : (trade.pnl_usd || 0),
        };
      } else {
        currentStreak.length++;
        currentStreak.pnl! += (trade.pnl_usd || 0);
      }
    });

    if (currentStreak) {
      streaks.push(currentStreak);
    }

    const winStreaks = streaks.filter(s => s.type === 'win');
    const lossStreaks = streaks.filter(s => s.type === 'loss');

    const maxWinStreak = Math.max(...winStreaks.map(s => s.length), 0);
    const maxLossStreak = Math.max(...lossStreaks.map(s => s.length), 0);

    const avgWinStreak = winStreaks.length > 0 ? winStreaks.reduce((sum, s) => sum + s.length, 0) / winStreaks.length : 0;
    const avgLossStreak = lossStreaks.length > 0 ? lossStreaks.reduce((sum, s) => sum + s.length, 0) / lossStreaks.length : 0;

    return {
      streaks,
      maxWinStreak,
      maxLossStreak,
      currentStreak,
      avgWinStreak,
      avgLossStreak,
    };
  }, [filteredTrades]);

  if (filteredTrades?.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
  }

  const { streaks, maxWinStreak, maxLossStreak, currentStreak, avgWinStreak, avgLossStreak } = streakAnalysis;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0' }}>
      {/* Summary Stats - 4 Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px', padding: '16px' }}>
        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Best Win Streak
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', marginBottom: '2px' }}>
            {maxWinStreak}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            consecutive wins
          </div>
        </div>

        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Worst Loss Streak
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444', marginBottom: '2px' }}>
            {maxLossStreak}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            consecutive losses
          </div>
        </div>

        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Avg Win Streak
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', marginBottom: '2px' }}>
            {avgWinStreak.toFixed(1)}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            average length
          </div>
        </div>

        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Avg Loss Streak
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444', marginBottom: '2px' }}>
            {avgLossStreak.toFixed(1)}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            average length
          </div>
        </div>
      </div>

      {/* Current Streak */}
      {currentStreak && (
        <div style={{
          margin: '0 16px 16px 16px',
          backgroundColor: currentStreak.type === 'win' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${currentStreak.type === 'win' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          borderRadius: '8px',
          padding: '12px'
        }}>
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Streak
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: currentStreak.type === 'win' ? '#10b981' : '#ef4444',
            marginBottom: '4px'
          }}>
            {currentStreak.length} {currentStreak.type === 'win' ? 'Win' : 'Loss'} Streak
          </div>
          <div style={{ fontSize: '12px', color: currentStreak.type === 'win' ? '#10b981' : '#ef4444' }}>
            {currentStreak.type === 'win' ? '+' : ''} ${(currentStreak.pnl || 0).toFixed(2)}
          </div>
        </div>
      )}

      {/* Streak Timeline Visualization */}
      <div style={{ padding: '0 16px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Streak History (Last 50)
        </div>
        <div style={{
          overflowX: 'auto',
          flex: 1,
          display: 'flex',
          alignItems: 'flex-end',
          gap: '2px',
          paddingBottom: '8px',
          borderBottom: '1px solid #27272a'
        }}>
          {streaks.slice(-50).map((streak, idx) => (
            <div
              key={idx}
              style={{
                flexShrink: 0,
                backgroundColor: streak.type === 'win' ? '#10b981' : '#ef4444',
                borderRadius: '2px',
                width: `${Math.max(3, Math.min(12, streak.length * 1.5))}px`,
                height: `${Math.max(10, Math.min(100, streak.length * 8))}px`,
                opacity: 0.8,
                cursor: 'pointer',
                transition: 'opacity 0.2s, transform 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scaleY(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.8';
                e.currentTarget.style.transform = 'scaleY(1)';
              }}
              title={`${streak.type === 'win' ? 'W' : 'L'}${streak.length > 1 ? streak.length : ''} - $${(streak.pnl || 0).toFixed(2)}`}
            />
          ))}
        </div>
        <div style={{ fontSize: '10px', color: '#666', textAlign: 'center', marginTop: '4px' }}>
          Height = Streak Length | Green = Wins | Red = Losses
        </div>
      </div>
    </div>
  );
};
