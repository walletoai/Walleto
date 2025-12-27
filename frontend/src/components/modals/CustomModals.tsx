// Custom modal components to replace native browser dialogs
import { createContext, useContext, useState, type ReactNode } from 'react';

// Types
interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  requireTextConfirmation?: string; // If set, user must type this text to confirm
}

interface AlertOptions {
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

interface ModalContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModals() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
}

// Modal Provider
export function ModalProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({ isOpen: false, options: { message: '' }, resolve: null });

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    options: AlertOptions;
    resolve: (() => void) | null;
  }>({ isOpen: false, options: { message: '' }, resolve: null });

  const [confirmInput, setConfirmInput] = useState('');

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmInput('');
      setConfirmState({ isOpen: true, options, resolve });
    });
  };

  const alert = (options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({ isOpen: true, options, resolve });
    });
  };

  const handleConfirm = (result: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState({ isOpen: false, options: { message: '' }, resolve: null });
    setConfirmInput('');
  };

  const handleAlertClose = () => {
    if (alertState.resolve) {
      alertState.resolve();
    }
    setAlertState({ isOpen: false, options: { message: '' }, resolve: null });
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'danger':
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'success':
        return '#10b981';
      default:
        return '#D4A545';
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'danger':
      case 'error':
        return '!';
      case 'warning':
        return '!';
      case 'success':
        return '\u2713';
      default:
        return 'i';
    }
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    animation: 'fadeIn 150ms ease-out',
  };

  const modalContentStyle: React.CSSProperties = {
    backgroundColor: '#1D1A16',
    border: '1px solid rgba(212, 165, 69, 0.3)',
    borderRadius: '16px',
    padding: '28px',
    maxWidth: '420px',
    width: '90%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    animation: 'slideUp 150ms ease-out',
  };

  const requiresTextConfirm = confirmState.options.requireTextConfirmation;
  const canConfirm = !requiresTextConfirm || confirmInput === requiresTextConfirm;

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}

      {/* Confirm Modal */}
      {confirmState.isOpen && (
        <div style={modalOverlayStyle} onClick={() => handleConfirm(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            {/* Icon */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: `${getTypeColor(confirmState.options.type)}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}>
              <span style={{
                color: getTypeColor(confirmState.options.type),
                fontSize: '24px',
                fontWeight: '700',
              }}>
                {getTypeIcon(confirmState.options.type)}
              </span>
            </div>

            {/* Title */}
            <h3 style={{
              color: '#F5E6D3',
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '12px',
              margin: 0,
            }}>
              {confirmState.options.title || 'Confirm Action'}
            </h3>

            {/* Message */}
            <p style={{
              color: '#A89880',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: requiresTextConfirm ? '16px' : '24px',
              marginTop: '12px',
            }}>
              {confirmState.options.message}
            </p>

            {/* Text confirmation input */}
            {requiresTextConfirm && (
              <div style={{ marginBottom: '24px' }}>
                <p style={{
                  color: '#8B7355',
                  fontSize: '12px',
                  marginBottom: '8px',
                }}>
                  Type <strong style={{ color: '#D4A545' }}>{requiresTextConfirm}</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(37, 30, 23, 0.8)',
                    border: '1px solid rgba(212, 165, 69, 0.2)',
                    borderRadius: '8px',
                    color: '#F5E6D3',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder={requiresTextConfirm}
                  autoFocus
                />
              </div>
            )}

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => handleConfirm(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(212, 165, 69, 0.3)',
                  borderRadius: '8px',
                  color: '#A89880',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(212, 165, 69, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {confirmState.options.cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => canConfirm && handleConfirm(true)}
                disabled={!canConfirm}
                style={{
                  padding: '10px 20px',
                  backgroundColor: canConfirm ? getTypeColor(confirmState.options.type) : '#4a4a4a',
                  border: 'none',
                  borderRadius: '8px',
                  color: canConfirm ? '#fff' : '#888',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: canConfirm ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms',
                  opacity: canConfirm ? 1 : 0.6,
                }}
                onMouseOver={(e) => {
                  if (canConfirm) {
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                {confirmState.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertState.isOpen && (
        <div style={modalOverlayStyle} onClick={handleAlertClose}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            {/* Icon */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: `${getTypeColor(alertState.options.type)}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}>
              <span style={{
                color: getTypeColor(alertState.options.type),
                fontSize: '24px',
                fontWeight: '700',
              }}>
                {getTypeIcon(alertState.options.type)}
              </span>
            </div>

            {/* Title */}
            <h3 style={{
              color: '#F5E6D3',
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '12px',
              margin: 0,
            }}>
              {alertState.options.title || (alertState.options.type === 'error' ? 'Error' : alertState.options.type === 'success' ? 'Success' : 'Notice')}
            </h3>

            {/* Message */}
            <p style={{
              color: '#A89880',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '24px',
              marginTop: '12px',
            }}>
              {alertState.options.message}
            </p>

            {/* Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleAlertClose}
                style={{
                  padding: '10px 24px',
                  backgroundColor: getTypeColor(alertState.options.type),
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ModalContext.Provider>
  );
}
