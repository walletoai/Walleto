// src/components/analytics/AnalyticsPageNavigation.tsx
import React from "react";
import { useResponsive } from "../../hooks/useResponsive";

export type AnalyticsPageType =
  | "performance"
  | "strategy"
  | "timing"
  | "risk"
  | "execution"
  | "market";

interface Props {
  activePage: AnalyticsPageType;
  onPageChange: (page: AnalyticsPageType) => void;
}

const pages: { id: AnalyticsPageType; label: string; icon: string; description: string }[] = [
  { id: "performance", label: "Core Performance", icon: "📊", description: "Overview & metrics" },
  { id: "strategy", label: "Asset & Strategy", icon: "🎯", description: "By setup & symbol" },
  { id: "timing", label: "Timing & Patterns", icon: "⏱️", description: "Time analysis" },
  { id: "risk", label: "Risk Management", icon: "🛡️", description: "Risk metrics" },
  { id: "execution", label: "Trade Execution", icon: "⚡", description: "Entry & exit quality" },
  { id: "market", label: "Market Conditions", icon: "🌐", description: "Market analysis" },
];

export const AnalyticsPageNavigation: React.FC<Props> = ({
  activePage,
  onPageChange,
}) => {
  const { isMobile, isTablet } = useResponsive();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
      gap: isMobile ? '8px' : isTablet ? '12px' : '24px',
      padding: '8px 0',
    }}>
      {pages.map(({ id, label, icon, description }) => (
        <button
          key={id}
          onClick={() => onPageChange(id)}
          style={{
            position: 'relative',
            padding: isMobile ? '12px 10px' : '16px 20px',
            borderRadius: '8px',
            border: activePage === id ? 'none' : '1px solid rgba(212, 165, 69, 0.2)',
            backgroundColor: activePage === id ? 'rgba(245, 199, 109, 0.15)' : 'rgba(37, 30, 23, 0.5)',
            color: activePage === id ? '#F5C76D' : '#8B7355',
            fontSize: isMobile ? '11px' : '13px',
            fontWeight: activePage === id ? '700' : '600',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            width: '100%',
            textAlign: 'center',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            if (activePage !== id) {
              const target = e.currentTarget as HTMLElement;
              target.style.backgroundColor = 'rgba(245, 199, 109, 0.08)';
              target.style.borderColor = 'rgba(212, 165, 69, 0.4)';
              target.style.color = '#F5C76D';
            }
          }}
          onMouseLeave={(e) => {
            if (activePage !== id) {
              const target = e.currentTarget as HTMLElement;
              target.style.backgroundColor = 'rgba(37, 30, 23, 0.5)';
              target.style.borderColor = 'rgba(212, 165, 69, 0.2)';
              target.style.color = '#8B7355';
            }
          }}
        >
          {/* Background gradient effect for active state */}
          {activePage === id && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(245, 199, 109, 0.2) 0%, rgba(245, 199, 109, 0.05) 100%)',
                borderRadius: '8px',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
          )}

          {/* Icon */}
          <div style={{
            fontSize: '20px',
            lineHeight: '1',
            position: 'relative',
            zIndex: 1,
            filter: activePage === id ? 'drop-shadow(0 0 3px rgba(245, 199, 109, 0.5))' : 'none',
          }}>
            {icon}
          </div>

          {/* Label */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: 'serif',
            letterSpacing: '0.5px',
          }}>
            {label}
          </div>

          {/* Description - visible only on active */}
          {activePage === id && (
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(245, 199, 109, 0.7)',
                fontWeight: '400',
                marginTop: '2px',
                position: 'relative',
                zIndex: 1,
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
              }}
            >
              {description}
            </div>
          )}

          {/* Bottom accent line for active state */}
          {activePage === id && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '30%',
                height: '3px',
                backgroundColor: '#F5C76D',
                borderRadius: '3px 3px 0 0',
                zIndex: 2,
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
};
