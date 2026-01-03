import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, BarChart2, Brain, Tv, Wallet, Shield, Layers, CreditCard, Cpu, Image as ImageIcon, X, Lock, Zap, ChevronRight, Layout, ChevronDown, Check, HelpCircle, Plus, Minus, Menu } from 'lucide-react';
import { Dashboard } from './components/Dashboard'; 
import { MOCK_TRADES } from './constants';
import { SupportChat } from './components/SupportChat';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { TermsOfServiceModal } from './components/TermsOfServiceModal';

// --- Custom Walleto Logo Component (SVG Recreation) ---
const WalletoLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 512 512" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
       <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.3"/>
       </filter>
       <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#D4A373" />
       </linearGradient>
    </defs>
    
    {/* Wallet Body (Leather) */}
    <rect x="60" y="120" width="340" height="280" rx="40" fill="#5D4037" filter="url(#shadow)" stroke="#3E2723" strokeWidth="4"/>
    
    {/* Flap */}
    <path d="M60 120H400C422 120 440 138 440 160V180H60V120Z" fill="url(#goldGradient)" />
    <rect x="60" y="180" width="380" height="20" fill="#8B5E3C" fillOpacity="0.3" />
    
    {/* Strap */}
    <rect x="250" y="230" width="150" height="80" rx="20" fill="url(#goldGradient)" filter="url(#shadow)" stroke="#3E2723" strokeWidth="2"/>
    <circle cx="290" cy="270" r="15" fill="#3E2723" />

    {/* Flying Pixels */}
    <rect x="420" y="140" width="35" height="20" rx="4" fill="url(#goldGradient)" filter="url(#shadow)"/>
    <rect x="470" y="190" width="25" height="20" rx="4" fill="url(#goldGradient)" filter="url(#shadow)"/>
    <rect x="430" y="230" width="50" height="15" rx="4" fill="#8D6E63" filter="url(#shadow)"/>
  </svg>
);

// --- Special Effects Components ---

const Spotlight: React.FC = () => {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return <div className="spotlight-layer" />;
};

const GoldDust: React.FC = () => {
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    width: `${Math.random() * 3 + 1}px`,
    height: `${Math.random() * 3 + 1}px`,
    animationDuration: `${Math.random() * 10 + 10}s`,
    animationDelay: `${Math.random() * 5}s`,
    opacity: Math.random() * 0.5
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle bg-leather-accent/30"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
          }}
        />
      ))}
    </div>
  );
};

const InfiniteTicker: React.FC = () => {
  const items = [
    { pair: 'BTC/USDT', price: '64,230.50', change: '+2.4%' },
    { pair: 'ETH/USDT', price: '3,450.10', change: '+1.8%' },
    { pair: 'SOL/USDT', price: '145.20', change: '-0.5%' },
    { pair: 'BNB/USDT', price: '590.00', change: '+0.2%' },
    { pair: 'XRP/USDT', price: '0.6200', change: '-1.2%' },
    { pair: 'ADA/USDT', price: '0.4500', change: '+0.8%' },
  ];

  return (
    <div className="w-full bg-leather-900/80 backdrop-blur border-y border-leather-700 overflow-hidden py-2 relative z-20">
      <div className="flex whitespace-nowrap animate-scroll w-max">
        {[...items, ...items, ...items, ...items].map((item, idx) => (
          <div key={idx} className="flex items-center mx-6 opacity-80 hover:opacity-100 transition-opacity">
            <span className="font-bold text-gray-400 text-xs mr-2">{item.pair}</span>
            <span className="font-mono text-white text-sm mr-2">{item.price}</span>
            <span className={`text-xs ${item.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 3D Laptop Component ---
interface LaptopProps {
  isOpen: boolean;
  mousePos: { x: number; y: number };
}

const Laptop: React.FC<LaptopProps> = ({ isOpen, mousePos }) => {
  const [screenOn, setScreenOn] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setScreenOn(true), 800);
      return () => clearTimeout(timer);
    } else {
      setScreenOn(false);
    }
  }, [isOpen]);

  const tiltX = (mousePos.y - 0.5) * 5;
  const tiltY = (mousePos.x - 0.5) * -5;

  return (
    <div 
      className="relative w-[340px] h-[220px] sm:w-[500px] sm:h-[330px] md:w-[750px] md:h-[500px] transition-transform duration-100 ease-out transform-style-3d group pointer-events-none"
      style={{
        transform: `rotateX(${20 + tiltX}deg) rotateY(${tiltY}deg) scale(0.9)`
      }}
    >
      {/* Laptop Base */}
      <div className="absolute bottom-0 w-full h-[12px] sm:h-[24px] bg-leather-800 rounded-b-2xl border-x border-b border-gray-700 shadow-[0_30px_60px_rgba(0,0,0,0.6)] transform-style-3d">
        <div className="absolute top-0 left-0 w-full h-full bg-gray-800 rounded-b-2xl"></div>
        <div className="absolute -top-[220px] sm:-top-[330px] md:-top-[500px] left-0 w-full h-[220px] sm:h-[330px] md:h-[500px] bg-leather-900 rounded-b-xl border border-leather-700 origin-bottom transform-style-3d flex flex-col items-center justify-end pb-4 sm:pb-8 overflow-hidden" style={{ transform: 'rotateX(90deg)' }}>
           <div className="w-1/3 h-12 sm:h-24 bg-leather-800/50 rounded border border-leather-700/50 mb-2 sm:mb-4"></div>
           <div className="w-3/4 h-16 sm:h-32 bg-leather-800/30 rounded grid grid-cols-10 gap-1 p-2 opacity-50">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="bg-leather-900 rounded-sm border border-leather-700"></div>
              ))}
           </div>
           <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
        </div>
      </div>

      {/* Laptop Lid */}
      <div 
        className="absolute bottom-0 left-0 w-full h-[220px] sm:h-[330px] md:h-[500px] origin-bottom transition-all duration-1000 ease-in-out transform-style-3d"
        style={{ 
          transform: isOpen ? 'rotateX(0deg)' : 'rotateX(-90deg)' 
        }}
      >
        <div className="absolute inset-0 bg-leather-900 rounded-t-xl border border-leather-700 backface-hidden flex items-center justify-center shadow-inner" style={{ transform: 'rotateY(180deg)' }}>
           <div className="text-leather-accent/20 transform rotate-180 flex flex-col items-center">
              <WalletoLogo className="w-32 h-32 mb-6 opacity-90" />
              <span className="font-serif font-bold text-lg sm:text-2xl tracking-widest">WALLETO</span>
           </div>
           <div className="absolute inset-0 bg-leather opacity-50 rounded-t-xl"></div>
        </div>

        <div className="absolute inset-0 bg-gray-900 rounded-t-xl border-x border-t border-gray-700 p-1 sm:p-3 flex flex-col shadow-2xl transform-style-3d">
           <div className="w-full flex justify-center mb-1 sm:mb-2">
             <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gray-800 rounded-full border border-gray-700"></div>
           </div>
           <div className="flex-1 bg-black relative overflow-hidden rounded border border-gray-800 group-hover:border-gray-700 transition-colors">
              {!screenOn && (
                 <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent z-20 pointer-events-none"></div>
              )}
              {screenOn && (
                <div className="absolute inset-0 bg-leather-900 overflow-hidden screen-glitch flex items-center justify-center">
                   <div className="scale-[0.45] sm:scale-[0.7] md:scale-[0.85] origin-top-left w-[222%] h-[222%] sm:w-[142%] sm:h-[142%] md:w-[117%] md:h-[117%]">
                      <Dashboard trades={MOCK_TRADES} compact />
                   </div>
                   <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAADCAYAAABS3WWCAAAAE0lEQVQIW2NkYGD4zwABjFAAAwATMQEAdy/78wAAAABJRU5ErkJggg==')] opacity-10 pointer-events-none z-30 mix-blend-overlay"></div>
                </div>
              )}
              {isOpen && !screenOn && (
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-emerald-500 font-mono text-[10px] sm:text-sm animate-pulse">
                       {'>'} BOOT_SEQUENCE_INIT<br/>
                       {'>'} CHECKING_LEDGER... OK<br/>
                       {'>'} LOADING_GEMINI_CORE... OK
                    </div>
                 </div>
              )}
           </div>
           <div className="w-full flex justify-center mt-1 sm:mt-2">
             <span className="text-[8px] sm:text-[10px] font-serif text-gray-600 font-bold tracking-widest">WALLETO</span>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- AI Conversation Simulator Component ---
const AIConversationDemo: React.FC = () => {
  const [messages, setMessages] = useState<Array<{id: number, role: 'user' | 'ai', text: string}>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const script = [
      { role: 'user', text: "Why is my win rate dropping this week?", delay: 1000 },
      { role: 'ai', text: "You've taken 8 trades during the Asia Session this week. Your win rate there is only 22%. Stick to New York overlap.", delay: 2500 },
      { role: 'user', text: "Good catch. What about my risk management?", delay: 6000 },
      { role: 'ai', text: "You increased position size by 300% after your loss on Tuesday. This indicates 'Revenge Trading'. Reset to base risk immediately.", delay: 7500 },
      { role: 'user', text: "Analyze my BTC trade.", delay: 12000 },
      { role: 'ai', text: "You entered late (FOMO). RSI was already 85. Next time wait for the retest at 64k.", delay: 13500 },
      { role: 'reset', text: "", delay: 18000 }
    ];

    let timeouts: ReturnType<typeof setTimeout>[] = [];

    const runScript = () => {
      setMessages([]);
      setIsTyping(false);

      script.forEach((step, index) => {
        if (step.role === 'reset') {
           const t = setTimeout(runScript, step.delay);
           timeouts.push(t);
           return;
        }

        if (step.role === 'user') {
          const t = setTimeout(() => {
            setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: step.text }]);
            setIsTyping(true); 
          }, step.delay);
          timeouts.push(t);
        } 
        
        if (step.role === 'ai') {
          const t = setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: step.text }]);
          }, step.delay);
          timeouts.push(t);
        }
      });
    };

    runScript();

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative bg-leather-800 border border-leather-700 rounded-2xl shadow-2xl transform transition-transform hover:scale-105 duration-500 h-[400px] flex flex-col overflow-hidden">
        <div className="absolute -top-3 -left-3 w-full h-full border-2 border-dashed border-leather-accent/20 rounded-2xl pointer-events-none"></div>
        
        <div className="p-4 border-b border-leather-700 bg-leather-900/50 flex items-center z-10">
          <div className="w-8 h-8 rounded bg-leather-accent/20 flex items-center justify-center mr-3 border border-leather-accent/30">
            <Cpu className="w-4 h-4 text-leather-accent" />
          </div>
          <div>
            <h3 className="text-white font-serif font-bold text-sm">Walleto AI</h3>
            <div className="flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Live Analysis</span>
            </div>
          </div>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative z-10">
           {messages.map((msg) => (
             <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed shadow-md
                  ${msg.role === 'user' 
                    ? 'bg-leather-accent text-leather-900 font-medium rounded-tr-none' 
                    : 'bg-leather-900 border border-leather-700 text-gray-300 rounded-tl-none'}
                `}>
                  {msg.text}
                </div>
             </div>
           ))}
           
           {isTyping && (
             <div className="flex justify-start animate-fade-in">
                <div className="bg-leather-900 border border-leather-700 p-3 rounded-lg rounded-tl-none flex gap-1 items-center h-10 shadow-md">
                   <div className="w-1.5 h-1.5 bg-leather-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                   <div className="w-1.5 h-1.5 bg-leather-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                   <div className="w-1.5 h-1.5 bg-leather-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
             </div>
           )}
        </div>
        
        <div className="p-3 border-t border-leather-700 bg-leather-900/30 z-10">
           <div className="w-full h-10 bg-leather-900/50 rounded-lg border border-leather-700/50 flex items-center px-3">
              <span className="text-leather-dim text-xs italic animate-pulse">Waiting for input...</span>
           </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-leather-accent/5 pointer-events-none z-0"></div>
    </div>
  );
};

// --- Early Access Code Modal ---
const EarlyAccessModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStatus('IDLE');
      setCode('');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!code.trim()) {
      setErrorMessage('Please enter an invite code');
      return;
    }

    setStatus('LOADING');
    setErrorMessage('');

    try {
      const response = await fetch("https://api.walleto.ai/api/invite/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.toUpperCase() })
      });

      const data = await response.json();

      if (data.valid) {
        setStatus('SUCCESS');
        // Redirect to signup with the code
        setTimeout(() => {
          window.location.href = `https://app.walleto.ai/signup?code=${encodeURIComponent(code.toUpperCase())}`;
        }, 500);
      } else {
        setStatus('ERROR');
        setErrorMessage(data.message || 'Invalid invite code');
      }
    } catch (err) {
      console.error("Validation Error:", err);
      setStatus('ERROR');
      setErrorMessage('Failed to validate code. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-leather-900/80 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-leather-800 border border-leather-600 rounded-2xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-leather-900 border border-leather-accent/30 flex items-center justify-center mb-6 shadow-inner">
             <Lock className="w-8 h-8 text-leather-accent" />
          </div>

          <h2 className="text-3xl font-serif font-bold text-white mb-2">Early Access</h2>
          <div className="w-12 h-1 bg-leather-accent rounded-full mb-6"></div>

          <p className="text-gray-300 leading-relaxed mb-8">
            Enter your invite code to create your account. Each code can only be used once.
          </p>

          {status === 'SUCCESS' ? (
            <div className="w-full bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-4 animate-fade-in">
              <p className="text-emerald-400 font-bold">Code verified! Redirecting to signup...</p>
            </div>
          ) : (
            <div className="flex flex-col w-full gap-3">
              {errorMessage && (
                <p className="text-red-400 text-sm font-bold mb-1">{errorMessage}</p>
              )}
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="WALL-XXXXXXXX"
                className="w-full bg-leather-900 border border-leather-700 rounded-lg px-4 py-3 text-white font-mono text-center text-lg tracking-widest focus:border-leather-accent outline-none transition-colors uppercase"
                disabled={status === 'LOADING'}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button
                onClick={handleSubmit}
                disabled={status === 'LOADING' || !code.trim()}
                className="w-full py-3 bg-gradient-gold text-leather-900 font-bold rounded-lg hover:scale-[1.02] transition-transform shadow-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {status === 'LOADING' ? 'Validating...' : 'Continue to Signup'}
              </button>
              <p className="text-gray-500 text-xs mt-2">
                Don't have a code? <button onClick={onClose} className="text-leather-accent hover:underline">Join the waitlist</button> instead.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Coming Soon Modal (Waitlist) ---
const ComingSoonModal: React.FC<{ isOpen: boolean; onClose: () => void; onEarlyAccess: () => void }> = ({ isOpen, onClose, onEarlyAccess }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');

  useEffect(() => {
    if (isOpen) {
      setStatus('IDLE');
      setEmail('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // Proper email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) return;

    setStatus('LOADING');

    try {
      // Send to SendGrid waitlist API
      const response = await fetch("https://waitlist-api-61773256360.us-east1.run.app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setStatus('SUCCESS');
      } else {
        setStatus('ERROR');
      }
    } catch (err) {
      console.error("Waitlist API Error:", err);
      setStatus('ERROR');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-leather-900/80 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-leather-800 border border-leather-600 rounded-2xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-leather-900 border border-leather-accent/30 flex items-center justify-center mb-6 shadow-inner">
             <Lock className="w-8 h-8 text-leather-accent" />
          </div>

          <h2 className="text-3xl font-serif font-bold text-white mb-2">Private Beta</h2>
          <div className="w-12 h-1 bg-leather-accent rounded-full mb-6"></div>

          <p className="text-gray-300 leading-relaxed mb-8">
            Walleto is currently in an invite-only phase for professional traders.
            <br/><br/>
            We are crafting the ultimate ledger experience. Spots will open for the public in 2025.
          </p>

          {status === 'SUCCESS' ? (
            <div className="w-full bg-leather-900/50 border border-leather-accent/30 rounded-lg p-4 animate-fade-in">
              <p className="text-leather-accent font-bold">You're on the waitlist. We'll email you when early access opens.</p>
            </div>
          ) : (
            <div className="flex flex-col w-full gap-3">
              {status === 'ERROR' && (
                <p className="text-red-400 text-sm font-bold mb-1">Something went wrong. Try again later.</p>
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email for early access..."
                className="w-full bg-leather-900 border border-leather-700 rounded-lg px-4 py-3 text-white focus:border-leather-accent outline-none transition-colors"
                disabled={status === 'LOADING'}
              />
              <button
                onClick={handleSubmit}
                disabled={status === 'LOADING' || !email}
                className="w-full py-3 bg-gradient-gold text-leather-900 font-bold rounded-lg hover:scale-[1.02] transition-transform shadow-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {status === 'LOADING' ? 'Joining...' : 'Join Waitlist'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-leather-700"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-leather-800 px-2 text-gray-500">or</span>
                </div>
              </div>

              <button
                onClick={() => { onClose(); onEarlyAccess(); }}
                className="w-full py-3 bg-transparent border border-leather-accent/50 text-leather-accent font-bold rounded-lg hover:bg-leather-accent/10 transition-colors flex items-center justify-center"
              >
                I have an invite code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- FAQ Section ---
const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-leather-700 last:border-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 md:py-6 flex justify-between items-center text-left group gap-3"
      >
        <h3 className={`text-sm md:text-lg font-serif font-medium transition-colors pr-2 ${isOpen ? 'text-leather-accent' : 'text-white group-hover:text-leather-accent/80'}`}>
          {question}
        </h3>
        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${isOpen ? 'bg-leather-accent text-leather-900 rotate-180' : 'bg-leather-800 text-gray-400'}`}>
          <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100 pb-4 md:pb-6' : 'max-h-0 opacity-0'}`}>
        <p className="text-gray-400 leading-relaxed text-sm md:text-base">
          {answer}
        </p>
      </div>
    </div>
  );
};

const FAQSection: React.FC = () => {
  const faqs = [
    {
      question: "Which exchanges do you support?",
      answer: "We currently support API integration with Binance, Bybit, Blofin, and Hyperliquid. For other exchanges, you can import your trade history via CSV. We're actively expanding our exchange support based on user demand."
    },
    {
      question: "Is my trading data secure?",
      answer: "Yes. We use AES-256 encryption for all stored data and only require read-only API keys—we never have access to withdrawal permissions. Your trading data stays private and encrypted."
    },
    {
      question: "How does the AI Coach help me improve?",
      answer: "The AI Coach analyzes your trading journal to identify behavioral patterns like revenge trading, FOMO, and over-leveraging. It provides personalized insights and actionable feedback to help you become a more disciplined trader."
    },
    {
      question: "How do I get access to Walleto?",
      answer: "Walleto is currently in private beta. You can join the waitlist by clicking 'Early Access' on this page. If you have an invite code, you can sign up immediately and start journaling your trades."
    }
  ];

  return (
    <section id="faq" className="py-16 md:py-32 bg-leather-800 relative z-10">
       <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-16">
             <span className="text-leather-accent text-xs font-bold uppercase tracking-widest mb-2 block">Knowledge Base</span>
             <h2 className="text-2xl md:text-4xl font-serif font-bold text-white">Common Questions</h2>
          </div>

          <div className="bg-leather-900 rounded-2xl border border-leather-700 p-4 md:p-8 shadow-2xl">
             {faqs.map((faq, idx) => (
                <FAQItem key={idx} question={faq.question} answer={faq.answer} />
             ))}
          </div>
       </div>
    </section>
  );
};

const App: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [laptopOpen, setLaptopOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEarlyAccessModal, setShowEarlyAccessModal] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [isTermsOfServiceOpen, setIsTermsOfServiceOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      });
    };
    window.addEventListener('mousemove', handleMouseMove);

    const timer = setTimeout(() => {
      setLaptopOpen(true);
    }, 100);
    
    // Autoplay Features Slideshow
    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setActiveFeature(prev => (prev + 1) % 4); // cycling 4 features
      }, 6000);
    };
    startTimer();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleFeatureClick = (index: number) => {
    setActiveFeature(index);
    // Reset timer so it pauses for 6s after manual interaction
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 4);
    }, 6000);
  };

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100; // Adjust based on header height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  const features = [
    {
      icon: Brain,
      title: "Cognitive Analysis",
      subtitle: "OpenAI GPT 4.1",
      desc: "Detects behavioral patterns and acts as your risk manager.",
      visual: "bg-gradient-to-br from-amber-900/50 to-black"
    },
    {
      icon: Layers,
      title: "Historical Archives",
      subtitle: "5-Year Database",
      desc: "Backtest strategies against high-fidelity exchange data.",
      visual: "bg-gradient-to-br from-slate-900/50 to-black"
    },
    {
      icon: Tv,
      title: "Visual Replay",
      subtitle: "Tick-by-Tick",
      desc: "Relive trades candle-by-candle to fix execution errors.",
      visual: "bg-gradient-to-br from-emerald-900/50 to-black"
    },
    {
      icon: Shield,
      title: "Capital Guard",
      subtitle: "Risk Calculator",
      desc: "Position sizing simulations to protect your downside.",
      visual: "bg-gradient-to-br from-red-900/50 to-black"
    },
  ];

  const handleLaunch = () => {
    setShowModal(true); // Launch App opens waitlist modal for email signup
  };

  return (
    <div className="min-h-screen bg-leather-900 text-white font-sans overflow-x-hidden relative selection:bg-leather-accent/30 selection:text-white">
      <Spotlight />
      <GoldDust />
      <ComingSoonModal isOpen={showModal} onClose={() => setShowModal(false)} onEarlyAccess={() => setShowEarlyAccessModal(true)} />
      <EarlyAccessModal isOpen={showEarlyAccessModal} onClose={() => setShowEarlyAccessModal(false)} />
      
      {/* Support Chat Widget */}
      <SupportChat isOpen={isSupportOpen} setIsOpen={setIsSupportOpen} />

      {/* Legal Modals */}
      <PrivacyPolicyModal isOpen={isPrivacyPolicyOpen} onClose={() => setIsPrivacyPolicyOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOfServiceOpen} onClose={() => setIsTermsOfServiceOpen(false)} />

      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${scrolled ? 'bg-leather-900/90 backdrop-blur-lg border-leather-accent/20 py-3 shadow-lg' : 'bg-transparent border-transparent py-4 md:py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-3 group cursor-pointer" onClick={scrollToTop}>
             <div className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
                <WalletoLogo className="w-8 h-8 md:w-10 md:h-10 filter drop-shadow-lg" />
             </div>
             <span className="font-serif font-bold text-xl md:text-2xl tracking-tight text-white group-hover:text-leather-accent transition-colors">Walleto</span>
          </div>
          <div className="hidden lg:flex gap-12 text-lg font-bold font-serif">
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="text-transparent bg-clip-text bg-gradient-gold hover:brightness-125 transition-all relative group py-2"
            >
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-leather-accent transition-all duration-300 group-hover:w-full shadow-[0_0_10px_rgba(212,163,115,0.8)]"></span>
            </a>
            <a
              href="#ai"
              onClick={(e) => scrollToSection(e, 'ai')}
              className="text-transparent bg-clip-text bg-gradient-gold hover:brightness-125 transition-all relative group py-2"
            >
              AI Coach
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-leather-accent transition-all duration-300 group-hover:w-full shadow-[0_0_10px_rgba(212,163,115,0.8)]"></span>
            </a>
            <a
              href="#pricing"
              onClick={(e) => scrollToSection(e, 'pricing')}
              className="text-transparent bg-clip-text bg-gradient-gold hover:brightness-125 transition-all relative group py-2"
            >
              Pricing
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-leather-accent transition-all duration-300 group-hover:w-full shadow-[0_0_10px_rgba(212,163,115,0.8)]"></span>
            </a>
             <a
              href="#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              className="text-transparent bg-clip-text bg-gradient-gold hover:brightness-125 transition-all relative group py-2"
            >
              FAQ
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-leather-accent transition-all duration-300 group-hover:w-full shadow-[0_0_10px_rgba(212,163,115,0.8)]"></span>
            </a>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => setShowModal(true)} className="hidden sm:block px-3 md:px-5 py-2 md:py-2.5 bg-leather-800 border-2 border-leather-accent text-leather-accent rounded-lg text-xs md:text-sm font-bold hover:bg-leather-accent hover:text-leather-900 transition-all duration-300">
              Early Access
            </button>
            <a href="https://app.walleto.ai/login" className="px-3 md:px-5 py-2 md:py-2.5 bg-leather-accent text-leather-900 rounded-lg text-xs md:text-sm font-bold hover:bg-leather-accent/90 transition-all duration-300 shadow-[0_0_15px_rgba(212,163,115,0.2)] hover:shadow-[0_0_25px_rgba(212,163,115,0.4)]">
              Launch App
            </a>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-leather-accent hover:bg-leather-800 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-leather-900/95 backdrop-blur-lg border-t border-leather-accent/20 animate-fade-in">
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2">
              <a
                href="#features"
                onClick={(e) => { scrollToSection(e, 'features'); setIsMobileMenuOpen(false); }}
                className="text-leather-accent font-serif font-bold py-3 px-4 hover:bg-leather-800 rounded-lg transition-colors"
              >
                Features
              </a>
              <a
                href="#ai"
                onClick={(e) => { scrollToSection(e, 'ai'); setIsMobileMenuOpen(false); }}
                className="text-leather-accent font-serif font-bold py-3 px-4 hover:bg-leather-800 rounded-lg transition-colors"
              >
                AI Coach
              </a>
              <a
                href="#pricing"
                onClick={(e) => { scrollToSection(e, 'pricing'); setIsMobileMenuOpen(false); }}
                className="text-leather-accent font-serif font-bold py-3 px-4 hover:bg-leather-800 rounded-lg transition-colors"
              >
                Pricing
              </a>
              <a
                href="#faq"
                onClick={(e) => { scrollToSection(e, 'faq'); setIsMobileMenuOpen(false); }}
                className="text-leather-accent font-serif font-bold py-3 px-4 hover:bg-leather-800 rounded-lg transition-colors"
              >
                FAQ
              </a>
              <button
                onClick={() => { setShowModal(true); setIsMobileMenuOpen(false); }}
                className="sm:hidden mt-2 w-full py-3 bg-leather-800 border-2 border-leather-accent text-leather-accent rounded-lg text-sm font-bold hover:bg-leather-accent hover:text-leather-900 transition-all"
              >
                Early Access
              </button>
            </div>
          </div>
        )}
      </nav>

      <section className="relative pt-24 md:pt-32 lg:pt-20 px-4 md:px-6 min-h-screen flex flex-col justify-center overflow-hidden">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 flex-1">
          <div className={`space-y-5 md:space-y-8 z-20 transition-all duration-1000 flex-1 md:max-w-[45%] text-center md:text-left ${laptopOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 lg:opacity-100 lg:translate-y-0'}`}>
            <div className="inline-flex items-center px-3 md:px-4 py-1.5 rounded-full bg-leather-800 border border-leather-accent/20 text-leather-accent text-[10px] md:text-xs font-medium tracking-wide uppercase hover:border-leather-accent/50 transition-colors cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-leather-accent mr-2 md:mr-3 animate-pulse"></span>
              The Gentleman's Trading Tool
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-serif font-bold leading-tight z-20 relative">The Premium <br/><span className="text-transparent bg-clip-text bg-gradient-gold text-gold-glow">Journal</span> for <br/>Crypto Traders.</h1>
            <p className="text-sm md:text-lg text-gray-400 max-w-xl leading-relaxed border-l-2 border-leather-accent/30 pl-4 md:pl-6 mx-auto md:mx-0 text-left">Sophisticated journaling for the perpetual market. Track your edge, master your psychology, and visualize your legacy with Walleto.</p>
            <div className="flex flex-col sm:flex-row gap-4 md:gap-5 pt-2 md:pt-4 justify-center md:justify-start">
              <button onClick={() => setShowModal(true)} className="px-6 md:px-8 py-3 md:py-4 bg-gradient-gold text-leather-900 rounded-lg font-bold flex items-center justify-center group transition-all shadow-[0_0_30px_rgba(212,163,115,0.2)] hover:shadow-[0_0_50px_rgba(212,163,115,0.4)] hover:-translate-y-1 text-sm md:text-base">
                Early Access
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
          <div className="relative perspective-2000 z-10 flex items-center justify-center flex-1 w-full min-h-[400px] lg:h-auto">
             <div className="absolute inset-0 bg-leather-accent/5 rounded-[30px] blur-[80px] pointer-events-none"></div>
             {/* Decreased base scale for smaller laptop presence per request */}
             <div className="transform scale-[0.5] md:scale-[0.6] lg:scale-[0.75] xl:scale-95 transition-transform duration-500 origin-center md:origin-right">
               <Laptop isOpen={laptopOpen} mousePos={mousePos} />
             </div>
          </div>
        </div>
        <div className="mt-auto pb-8 w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw]">
            <InfiniteTicker />
        </div>
      </section>

      {/* UPDATED Features Section: Cinema Slideshow */}
      <section id="features" className="py-16 md:py-32 bg-black relative z-10 overflow-hidden">
         <div className="absolute inset-0 bg-leather-900/20"></div>
         <div className="max-w-7xl mx-auto px-4 md:px-6 relative">
            <div className="mb-8 md:mb-16 text-center">
              <span className="text-leather-accent text-xs font-bold uppercase tracking-widest mb-2 block">System Capabilities</span>
              <h2 className="text-2xl md:text-4xl font-serif font-bold text-white">The Walleto <span className="text-leather-accent">Feature Suite</span></h2>
            </div>

            {/* Cinema Display */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">

              {/* Left: Animated Text Content */}
              <div className="order-2 lg:order-1 space-y-4 md:space-y-8">
                {features.map((feature, idx) => (
                  <div
                    key={idx}
                    className={`transition-all duration-500 cursor-pointer ${activeFeature === idx ? 'opacity-100 translate-x-2 md:translate-x-4' : 'opacity-40 hover:opacity-70 hover:translate-x-1'}`}
                    onClick={() => handleFeatureClick(idx)}
                  >
                    <div className="flex items-center gap-3 md:gap-4 mb-2">
                      <span className={`text-xs font-mono uppercase tracking-widest ${activeFeature === idx ? 'text-leather-accent' : 'text-gray-600'}`}>
                        0{idx + 1}
                      </span>
                      <h3 className={`text-lg md:text-2xl font-serif font-bold ${activeFeature === idx ? 'text-white' : 'text-gray-500'}`}>
                        {feature.title}
                      </h3>
                    </div>
                    <div className={`pl-8 md:pl-10 overflow-hidden transition-all duration-500 ${activeFeature === idx ? 'max-h-40' : 'max-h-0'}`}>
                      <p className="text-gray-400 text-sm md:text-lg leading-relaxed mb-2">{feature.desc}</p>
                      <span className="text-xs text-leather-accent/70 uppercase tracking-wider flex items-center">
                        <ChevronRight className="w-3 h-3 mr-1" /> {feature.subtitle}
                      </span>
                    </div>
                    {/* Progress Bar for active item */}
                    {activeFeature === idx && (
                       <div className="mt-4 md:mt-6 h-0.5 bg-leather-800 w-full relative overflow-hidden">
                          <div className="absolute top-0 left-0 h-full bg-leather-accent animate-[width_6s_linear_infinite]" style={{ width: '100%' }}></div>
                       </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Right: Cinema Screen */}
              <div className="order-1 lg:order-2 relative h-[280px] md:h-[400px] lg:h-[500px] w-full perspective-2000 group">
                 <div className={`absolute inset-0 rounded-2xl border border-leather-700 shadow-2xl overflow-hidden transition-all duration-700 transform
                    ${activeFeature % 2 === 0 ? 'rotate-y-3' : '-rotate-y-3'} group-hover:rotate-y-0
                 `}>
                    <div className={`absolute inset-0 ${features[activeFeature].visual} transition-colors duration-1000`}></div>

                    {/* Abstract UI Mockup */}
                    <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8 lg:p-12">
                       <div className="relative w-full h-full bg-leather-900/80 backdrop-blur-md rounded-xl border border-white/10 p-4 md:p-6 flex flex-col shadow-2xl">
                          <div className="flex items-center justify-between mb-4 md:mb-8 border-b border-white/5 pb-3 md:pb-4">
                             <div className="flex items-center gap-2 md:gap-3">
                                {React.createElement(features[activeFeature].icon, { className: "w-4 h-4 md:w-6 md:h-6 text-leather-accent" })}
                                <span className="text-xs md:text-sm font-bold text-white tracking-wider">{features[activeFeature].title}</span>
                             </div>
                             <div className="flex gap-1 md:gap-1.5">
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500/50"></div>
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500/50"></div>
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500/50"></div>
                             </div>
                          </div>

                          {/* Dynamic Content Placeholder */}
                          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-20"></div>
                             <div className="text-center relative z-10">
                                <div className="w-12 h-12 md:w-20 md:h-20 mx-auto rounded-full bg-leather-accent/10 border border-leather-accent/30 flex items-center justify-center mb-3 md:mb-4 animate-pulse">
                                  {React.createElement(features[activeFeature].icon, { className: "w-6 h-6 md:w-10 md:h-10 text-leather-accent" })}
                                </div>
                                <div className="h-1.5 md:h-2 w-20 md:w-32 bg-leather-800 rounded-full mx-auto mb-2"></div>
                                <div className="h-1.5 md:h-2 w-16 md:w-24 bg-leather-800 rounded-full mx-auto"></div>
                             </div>

                             {/* Floating Elements - hidden on mobile */}
                             <div className="hidden md:block absolute top-10 left-10 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded border border-white/5 animate-float" style={{ animationDelay: '0s' }}></div>
                             <div className="hidden md:block absolute bottom-10 right-10 w-12 h-12 bg-gradient-to-br from-leather-accent/20 to-transparent rounded-full blur-sm animate-float" style={{ animationDelay: '1s' }}></div>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Glow Effect */}
                 <div className="absolute -inset-4 bg-leather-accent/20 blur-[50px] -z-10 opacity-50"></div>
              </div>

            </div>
         </div>
      </section>

      {/* UPDATED AI Section: Mechanism Focus */}
      <section id="ai" className="py-16 md:py-32 bg-leather-800 relative overflow-hidden z-10">
         <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-leather-700 to-transparent"></div>
         <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col lg:flex-row items-center gap-10 md:gap-20">
           <div className="flex-1 space-y-5 md:space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center px-3 py-1 rounded bg-leather-900 border border-leather-accent/20 text-leather-accent text-xs font-bold uppercase tracking-widest">
                 <Brain className="w-3 h-3 mr-2" />
                 AI Coach
              </div>
              <h2 className="text-3xl md:text-5xl font-serif font-bold leading-tight text-white">Your Personal <span className="text-leather-accent">Trading Coach</span></h2>
              <p className="text-gray-400 text-sm md:text-lg leading-relaxed">
                 Walleto's AI Coach analyzes your complete trading history to identify patterns in your behavior.
                 <br/><br/>
                 It detects costly mistakes like revenge trading, FOMO entries, and over-leveraging—then provides actionable feedback to help you stay disciplined. Think of it as a trading psychologist available 24/7.
              </p>

              <div className="p-4 md:p-6 bg-leather-900 rounded-xl border border-leather-700 relative overflow-hidden text-left">
                 <div className="absolute top-0 right-0 p-3 opacity-10"><Cpu className="w-12 md:w-16 h-12 md:h-16" /></div>
                 <h4 className="text-white font-bold mb-2 flex items-center text-sm md:text-base"><Zap className="w-4 h-4 text-yellow-500 mr-2" /> Real-Time Analysis</h4>
                 <p className="text-xs md:text-sm text-gray-500">
                    1. Log Your Trade <ArrowRight className="w-3 h-3 inline mx-1" /> 2. AI Detects Patterns <ArrowRight className="w-3 h-3 inline mx-1" /> 3. Get Personalized Insights
                 </p>
              </div>
           </div>
           <div className="flex-1 relative w-full">
              <div className="absolute inset-0 bg-leather-accent/10 rounded-full blur-[100px]"></div>
              <AIConversationDemo />
              <p className="text-center text-xs text-gray-500 mt-6 font-mono uppercase tracking-widest">
                 * Live demonstration of AI Coach responses
              </p>
           </div>
         </div>
      </section>

      {/* NEW Pricing Section: Blurred "Coming Soon" */}
      <section id="pricing" className="py-16 md:py-32 bg-leather-900 relative z-10">
         <div className="max-w-6xl mx-auto px-4 md:px-6 relative">
            <div className="text-center mb-8 md:mb-12">
               <h2 className="text-2xl md:text-4xl font-serif font-bold text-white">Membership Tiers</h2>
               <p className="text-leather-dim mt-2 text-sm md:text-base">Secure your legacy.</p>
            </div>

            {/* The Blurred Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 filter blur-sm opacity-30 select-none pointer-events-none transform scale-95">
               {/* Card 1 */}
               <div className="border border-leather-700 bg-leather-800 p-6 md:p-10 rounded-2xl flex flex-col items-center">
                  <h3 className="text-lg md:text-xl font-bold text-gray-400 uppercase tracking-widest">Trader</h3>
                  <div className="text-3xl md:text-5xl font-serif font-bold text-white my-4 md:my-6">$29<span className="text-sm md:text-lg text-gray-500 font-sans font-normal">/mo</span></div>
                  <div className="space-y-3 md:space-y-4 w-full">
                     <div className="h-3 md:h-4 bg-leather-700 rounded w-3/4 mx-auto"></div>
                     <div className="h-3 md:h-4 bg-leather-700 rounded w-1/2 mx-auto"></div>
                     <div className="h-3 md:h-4 bg-leather-700 rounded w-5/6 mx-auto"></div>
                  </div>
               </div>
               {/* Card 2 */}
               <div className="border-2 border-leather-accent/50 bg-leather-800 p-6 md:p-10 rounded-2xl flex flex-col items-center relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-leather-accent"></div>
                  <h3 className="text-lg md:text-xl font-bold text-leather-accent uppercase tracking-widest">Institution</h3>
                  <div className="text-3xl md:text-5xl font-serif font-bold text-white my-4 md:my-6">$99<span className="text-sm md:text-lg text-gray-500 font-sans font-normal">/mo</span></div>
                  <div className="space-y-3 md:space-y-4 w-full">
                     <div className="h-3 md:h-4 bg-leather-700 rounded w-full mx-auto"></div>
                     <div className="h-3 md:h-4 bg-leather-700 rounded w-3/4 mx-auto"></div>
                     <div className="h-3 md:h-4 bg-leather-700 rounded w-5/6 mx-auto"></div>
                  </div>
               </div>
            </div>

            {/* The Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-20 px-4">
               <div className="bg-leather-900/90 border border-leather-accent/30 p-6 md:p-10 rounded-2xl text-center shadow-2xl backdrop-blur-md max-w-md w-full transform hover:scale-105 transition-transform duration-300">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-leather-accent/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border border-leather-accent/30">
                     <Lock className="w-5 h-5 md:w-6 md:h-6 text-leather-accent" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Pricing Revealed in Beta</h2>
                  <p className="text-gray-400 mb-6 md:mb-8 leading-relaxed text-sm md:text-base">
                     Our economic models are being calibrated for the public release. Early access members will receive lifetime discounts.
                  </p>
                  <button onClick={handleLaunch} className="w-full py-3 bg-gradient-gold text-leather-900 font-bold rounded-lg hover:brightness-110 transition-all shadow-lg flex items-center justify-center text-sm md:text-base">
                     Join Waitlist for Early Access
                  </button>
               </div>
            </div>
         </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      <footer className="bg-leather-900 border-t border-leather-800 py-10 md:py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-2 md:gap-3">
             <div className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
                <WalletoLogo className="w-8 h-8 md:w-10 md:h-10 filter drop-shadow-lg" />
             </div>
             <span className="font-serif font-bold text-lg md:text-xl tracking-tight text-white">Walleto</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-xs md:text-sm text-gray-500">
            <a href="#" onClick={(e) => { e.preventDefault(); setIsPrivacyPolicyOpen(true); }} className="hover:text-leather-accent transition-colors cursor-pointer">Privacy Policy</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setIsTermsOfServiceOpen(true); }} className="hover:text-leather-accent transition-colors cursor-pointer">Terms of Service</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setIsSupportOpen(true); }} className="hover:text-leather-accent transition-colors cursor-pointer">Contact Support</a>
          </div>
          <div className="text-gray-600 text-xs md:text-sm font-serif italic">© 2025 Walleto • Crafted for the Disciplined</div>
        </div>
      </footer>
    </div>
  );
};

export default App;