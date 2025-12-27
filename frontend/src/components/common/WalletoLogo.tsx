import React from 'react';

export const WalletoLogo: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 512 512" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.3" />
            </filter>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FCD34D" />
                <stop offset="100%" stopColor="#D4A373" />
            </linearGradient>
        </defs>

        {/* Wallet Body (Leather) */}
        <rect x="60" y="120" width="340" height="280" rx="40" fill="#5D4037" filter="url(#shadow)" stroke="#3E2723" strokeWidth="4" />

        {/* Flap */}
        <path d="M60 120H400C422 120 440 138 440 160V180H60V120Z" fill="url(#goldGradient)" />
        <rect x="60" y="180" width="380" height="20" fill="#8B5E3C" fillOpacity="0.3" />

        {/* Strap */}
        <rect x="250" y="230" width="150" height="80" rx="20" fill="url(#goldGradient)" filter="url(#shadow)" stroke="#3E2723" strokeWidth="2" />
        <circle cx="290" cy="270" r="15" fill="#3E2723" />

        {/* Flying Pixels */}
        <rect x="420" y="140" width="35" height="20" rx="4" fill="url(#goldGradient)" filter="url(#shadow)" />
        <rect x="470" y="190" width="25" height="20" rx="4" fill="url(#goldGradient)" filter="url(#shadow)" />
        <rect x="430" y="230" width="50" height="15" rx="4" fill="#8D6E63" filter="url(#shadow)" />
    </svg>
);
