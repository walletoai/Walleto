import React from 'react';
import { X } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1612',
          border: '1px solid rgba(212, 165, 69, 0.3)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '700px',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(212, 165, 69, 0.2)',
            backgroundColor: '#1a1612',
            flexShrink: 0,
          }}
        >
          <h2 style={{ color: '#D4A373', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Terms of Service</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#D4A373',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            color: '#e8dcc8',
            fontSize: '14px',
            lineHeight: '1.6',
            flex: 1,
          }}
        >
          <p style={{ color: '#a89070', fontSize: '12px', marginBottom: '16px' }}>
            Last updated: December 2025
          </p>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>1. Acceptance of Terms</h3>
            <p>By accessing or using Walleto, you agree to be bound by these Terms of Service. If you do not agree, please do not use our Service.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>2. Description of Service</h3>
            <p>Walleto is a crypto trading journal platform offering trade journaling, AI-powered behavior analysis, performance analytics, exchange API integrations, and CSV import functionality.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>3. Account Requirements</h3>
            <p>You must be at least 18 years old, provide accurate information, maintain account security, and notify us of unauthorized access. You are responsible for all activities under your account.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>4. API Keys & Exchange Connections</h3>
            <p>Only provide read-only API keys. Never share keys with withdrawal permissions. You are responsible for key security. Walleto will never execute trades on your behalf.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>5. Not Financial Advice</h3>
            <p style={{ color: '#f5c76d', fontWeight: '600' }}>IMPORTANT:</p>
            <p>Walleto does NOT provide financial, investment, or trading advice. Our AI Coach provides behavioral insights, not trading signals. All trading decisions are your responsibility. Cryptocurrency trading involves substantial risk of loss.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>6. Acceptable Use</h3>
            <p>Do not use the Service for illegal purposes, attempt unauthorized access, interfere with the Service, upload malicious content, impersonate others, or resell the Service without authorization.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>7. Intellectual Property</h3>
            <p>All content and functionality are owned by Walleto and protected by intellectual property laws. You retain ownership of your content (journal entries, notes) but grant us license to store and display it to provide the Service.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>8. Limitation of Liability</h3>
            <p>Walleto is provided "AS IS" without warranties. We are not liable for trading losses, exchange API outages, or data delays. Our total liability is limited to amounts you paid for the Service.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>9. Termination</h3>
            <p>We may terminate accounts for Terms violations. You may request data export before account deletion.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>10. Contact</h3>
            <p>Questions? Email us at <span style={{ color: '#D4A373' }}>support@walleto.ai</span></p>
          </section>
        </div>
      </div>
    </div>
  );
};
