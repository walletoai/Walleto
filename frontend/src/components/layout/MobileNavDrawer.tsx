import { Link, useLocation } from 'react-router-dom';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function MobileNavDrawer({ isOpen, onClose, onLogout }: MobileNavDrawerProps) {
  const location = useLocation();

  if (!isOpen) return null;

  const navItems = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/analytics', label: 'Analytics', icon: '📈' },
    { to: '/trades', label: 'Trades', icon: '📋' },
    { to: '/journal', label: 'Journal', icon: '📓' },
    { to: '/replay', label: 'Replay', icon: '🎬' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
    { to: '/docs', label: 'Docs', icon: '📚' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          maxWidth: '85vw',
          backgroundColor: '#1D1A16',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.5)',
          animation: 'slideInLeft 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px',
            borderBottom: '1px solid rgba(212, 165, 69, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/walleto-logo.jpg"
              alt="Walleto Logo"
              style={{
                height: '32px',
                width: 'auto',
                borderRadius: '6px',
              }}
            />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#F5C76D' }}>
              Walleto
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '12px',
              minWidth: '44px',
              minHeight: '44px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#8B7355',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  minHeight: '48px',
                  backgroundColor: isActive(item.to)
                    ? 'rgba(245, 199, 109, 0.15)'
                    : 'transparent',
                  border: isActive(item.to)
                    ? '1px solid rgba(245, 199, 109, 0.3)'
                    : '1px solid transparent',
                  borderRadius: '10px',
                  color: isActive(item.to) ? '#F5C76D' : '#C2B280',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: isActive(item.to) ? 600 : 500,
                  transition: 'all 150ms ease',
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer with Logout */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid rgba(212, 165, 69, 0.15)',
          }}
        >
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            style={{
              width: '100%',
              padding: '14px 16px',
              minHeight: '48px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              color: '#ef4444',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>
        {`
          @keyframes slideInLeft {
            from {
              transform: translateX(-100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}
      </style>
    </>
  );
}
