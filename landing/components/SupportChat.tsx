
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X, Send, LifeBuoy, Ticket, CheckCircle, ChevronRight, Loader2, Clock, AlertCircle, List } from 'lucide-react';
import { querySupportBot } from '../services/geminiService';
import { createTicket, getTickets } from '../services/ticketService';
import { SupportTicket } from '../types';

interface Message {
  id: number;
  role: 'user' | 'bot';
  text: string;
}

interface SupportChatProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

type Mode = 'CHAT' | 'TICKET_FORM' | 'TICKET_LIST';

export const SupportChat: React.FC<SupportChatProps> = ({ isOpen, setIsOpen }) => {
  const [mode, setMode] = useState<Mode>('CHAT');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'bot', text: "Hello! I'm the Walleto Assistant. How can I help you today?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Ticket State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketForm, setTicketForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastCreatedTicket, setLastCreatedTicket] = useState<SupportTicket | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'TICKET_LIST') {
      setTickets(getTickets());
    }
  }, [mode]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, mode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMsg: Message = { id: Date.now(), role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsTyping(true);

    const response = await querySupportBot(userMsg.text);

    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: response }]);
    setIsTyping(false);
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const newTicket = await createTicket(ticketForm.name, ticketForm.email, ticketForm.subject, ticketForm.message);
      setLastCreatedTicket(newTicket);
      setTicketForm({ name: '', email: '', subject: '', message: '' }); // Reset form
    } catch (error) {
      console.error("Error creating ticket", error);
      setSubmitError("Something went wrong. Try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use Portal to render directly to body - bypasses all stacking contexts
  const chatContent = (
    <>
      {/* Trigger Button - Rendered directly to body via portal */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 2147483647,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            backgroundColor: '#D4A373',
            color: '#1a1612',
            borderRadius: '9999px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap' }}>Need assistance?</span>
          <div style={{
            backgroundColor: '#1a1612',
            padding: '5px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <MessageCircle style={{ width: '14px', height: '14px', color: 'white' }} />
          </div>
        </button>
      )}

      {/* Main Widget Container */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '340px',
            maxWidth: 'calc(100vw - 40px)',
            height: '480px',
            maxHeight: 'calc(100vh - 40px)',
            zIndex: 2147483647,
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div className="bg-leather-900 p-4 border-b border-leather-accent/20 shrink-0">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-leather-accent flex items-center justify-center text-leather-900">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Walleto Support</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-leather-dim text-[10px] uppercase tracking-wider">Online</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 bg-leather-800 rounded-lg">
              <button
                onClick={() => setMode('CHAT')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-2
                  ${mode === 'CHAT' ? 'bg-leather-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}
                `}
              >
                <MessageCircle className="w-3 h-3" /> AI Chat
              </button>
              <button
                onClick={() => { setMode('TICKET_LIST'); setLastCreatedTicket(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-2
                  ${mode === 'TICKET_LIST' || mode === 'TICKET_FORM' ? 'bg-leather-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}
                `}
              >
                <Ticket className="w-3 h-3" /> My Tickets
              </button>
            </div>
          </div>

          {/* --- VIEW: AI CHAT --- */}
          {mode === 'CHAT' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed shadow-sm
                        ${msg.role === 'user'
                          ? 'bg-leather-900 text-white rounded-br-none'
                          : 'bg-white border border-gray-200 rounded-bl-none'}
                      `}
                      style={msg.role === 'bot' ? { color: '#000000' } : undefined}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-bl-none flex gap-1 shadow-sm">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                 {/* Upsell to Ticket if AI fails */}
                <div className="mb-2 flex justify-center">
                  <button onClick={() => setMode('TICKET_FORM')} className="text-[10px] hover:underline flex items-center gap-1" style={{ color: '#000000' }}>
                    Bot not helpful? Open a Support Ticket <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask a question..."
                    className="w-full bg-gray-100 rounded-full pl-3 pr-8 py-2 text-sm focus:ring-2 focus:ring-leather-accent/50 outline-none transition-all"
                    style={{ color: '#000000' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!query.trim() || isTyping}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      padding: '4px',
                      backgroundColor: '#1a1612',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: 'none',
                      opacity: (!query.trim() || isTyping) ? 0.5 : 1,
                    }}
                  >
                    <Send style={{ width: '12px', height: '12px', color: 'white' }} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* --- VIEW: TICKET FORM --- */}
          {mode === 'TICKET_FORM' && (
            <div className="flex-1 bg-gray-50 p-6 flex flex-col overflow-y-auto">
              {!lastCreatedTicket ? (
                <form onSubmit={handleTicketSubmit} className="space-y-4 h-full flex flex-col">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-2">
                     <h4 className="font-bold text-xs uppercase mb-1 flex items-center gap-2" style={{ color: '#000000' }}>
                       <Ticket className="w-3 h-3" /> New Support Ticket
                     </h4>
                     <p className="text-xs leading-relaxed" style={{ color: '#000000' }}>
                       Submit a detailed request. Our team will analyze your issue and respond via email.
                     </p>
                  </div>

                  {submitError && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2 text-red-700 text-xs">
                      <AlertCircle className="w-4 h-4" />
                      {submitError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: '#000000' }}>Your Name</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-leather-accent outline-none"
                      style={{ color: '#000000' }}
                      placeholder="John Doe"
                      value={ticketForm.name}
                      onChange={e => setTicketForm({...ticketForm, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: '#000000' }}>Email Address</label>
                    <input
                      required
                      type="email"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-leather-accent outline-none"
                      style={{ color: '#000000' }}
                      placeholder="john@example.com"
                      value={ticketForm.email}
                      onChange={e => setTicketForm({...ticketForm, email: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: '#000000' }}>Subject</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-leather-accent outline-none"
                      style={{ color: '#000000' }}
                      placeholder="Brief description of your issue"
                      value={ticketForm.subject}
                      onChange={e => setTicketForm({...ticketForm, subject: e.target.value})}
                    />
                  </div>

                  <div className="flex-1 min-h-[80px]">
                    <label className="block text-xs font-bold uppercase mb-1" style={{ color: '#000000' }}>Message</label>
                    <textarea
                      required
                      className="w-full h-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-leather-accent outline-none resize-none"
                      style={{ color: '#000000' }}
                      placeholder="Please describe your issue..."
                      value={ticketForm.message}
                      onChange={e => setTicketForm({...ticketForm, message: e.target.value})}
                    ></textarea>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('TICKET_LIST')}
                      className="px-4 py-3 bg-white border border-gray-300 font-bold rounded-lg hover:bg-gray-50 text-sm transition-colors"
                      style={{ color: '#000000' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 bg-leather-900 text-white font-bold rounded-lg hover:bg-leather-accent hover:text-leather-900 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                        </>
                      ) : (
                        <>
                          Submit Ticket <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in px-4">
                   <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600 border-4 border-green-50">
                     <CheckCircle className="w-8 h-8" />
                   </div>
                   <h3 className="text-xl font-bold text-black mb-1">Message Sent</h3>
                   <p className="text-black text-sm mb-4">Thanks, your message has been sent. Check your email for confirmation.</p>

                   <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 w-full mb-6 text-left">
                      <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-2">
                        <span className="text-xs uppercase font-bold" style={{ color: '#000000' }}>Ticket ID</span>
                        <span className="font-mono text-xs font-bold" style={{ color: '#000000' }}>#{lastCreatedTicket.ticketNumber}</span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: '#000000' }}><span className="font-bold">Sent to:</span> support@walleto.ai</p>
                      <p className="text-xs" style={{ color: '#000000' }}><span className="font-bold">ETA:</span> ~24 Hours</p>
                   </div>

                   <button
                     onClick={() => { setLastCreatedTicket(null); setMode('TICKET_LIST'); }}
                     className="w-full py-3 bg-leather-900 text-white font-bold rounded-lg hover:scale-[1.02] transition-transform"
                   >
                     View My Tickets
                   </button>
                </div>
              )}
            </div>
          )}

          {/* --- VIEW: TICKET LIST --- */}
          {mode === 'TICKET_LIST' && (
            <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
                 <h4 className="font-bold text-sm" style={{ color: '#000000' }}>My History</h4>
                 <button onClick={() => { setLastCreatedTicket(null); setMode('TICKET_FORM'); }} className="text-xs bg-leather-accent text-white px-3 py-1.5 rounded hover:bg-amber-500 transition-colors font-bold flex items-center gap-1">
                    <Ticket className="w-3 h-3" /> New Ticket
                 </button>
               </div>

               <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {tickets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <List className="w-12 h-12 mb-3 opacity-20" style={{ color: '#000000' }} />
                      <p className="text-sm" style={{ color: '#000000' }}>No tickets found.</p>
                    </div>
                  ) : (
                    tickets.map(ticket => (
                      <div key={ticket.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                         <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold" style={{ color: '#000000' }}>#{ticket.ticketNumber}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${ticket.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {ticket.status}
                              </span>
                            </div>
                            <span className="text-[10px] flex items-center gap-1" style={{ color: '#000000' }}>
                              <Clock className="w-3 h-3" /> {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                         </div>
                         <p className="text-sm line-clamp-2 font-medium" style={{ color: '#000000' }}>{ticket.message}</p>
                         <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[10px]" style={{ color: '#000000' }}>Sent via App</span>
                            <button className="text-[10px] font-bold hover:underline" style={{ color: '#000000' }}>View Details</button>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Render via portal to document.body - this ensures it's always on top
  return createPortal(chatContent, document.body);
};
