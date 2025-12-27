import React from 'react';
import { X } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
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
          <h2 style={{ color: '#D4A373', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Privacy Policy</h2>
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
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>1. Introduction</h3>
            <p>
              Walleto ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our crypto trading journal platform.
            </p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>2. Information We Collect</h3>
            <p style={{ fontWeight: '600', color: '#c9b896', marginBottom: '4px' }}>Account Information:</p>
            <p style={{ marginBottom: '8px' }}>Email address, username, encrypted password, and profile information.</p>
            <p style={{ fontWeight: '600', color: '#c9b896', marginBottom: '4px' }}>Trading Data:</p>
            <p style={{ marginBottom: '8px' }}>Trade history, position sizes, PnL data, journal entries, and read-only API keys.</p>
            <p style={{ fontWeight: '600', color: '#c9b896', marginBottom: '4px' }}>Usage Data:</p>
            <p>Log data, device information, and feature usage patterns.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>3. How We Use Your Information</h3>
            <p>We use your information to provide trading journal services, deliver AI-powered insights, improve your experience, send service updates, respond to support requests, and prevent fraud.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>4. Data Security</h3>
            <p>We implement AES-256 encryption for stored data, TLS/SSL for data in transit, and only request read-only API keys (never withdrawal permissions). Our infrastructure is hosted on enterprise-grade cloud providers with regular security audits.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>5. Data Sharing</h3>
            <p>We do not sell, trade, or rent your personal information. We only share data with trusted service providers, when required by law, or in connection with business transfers.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>6. Your Rights</h3>
            <p>You can access, correct, or delete your data, export your trading data, opt out of marketing, and disconnect exchange API connections at any time.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>7. Data Retention & Cookies</h3>
            <p>We retain data while your account is active. We use essential cookies only for session management, not for advertising.</p>
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#D4A373', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>8. Contact Us</h3>
            <p>Questions? Email us at <span style={{ color: '#D4A373' }}>support@walleto.ai</span></p>
          </section>
        </div>
      </div>
    </div>
  );
};
