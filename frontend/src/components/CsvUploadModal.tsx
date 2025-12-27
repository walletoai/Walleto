import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileSpreadsheet, ChevronRight, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import Papa from 'papaparse';
import { EXCHANGE_CONFIGS, parseCSV, detectExchange } from '../utils/csvParsers';
import type { ParsedTrade, ExchangeInfo } from '../utils/csvParsers';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (trades: ParsedTrade[]) => void;
}

type Step = 'select-exchange' | 'instructions' | 'upload' | 'preview';

export default function CsvUploadModal({ isOpen, onClose, onUpload }: CsvUploadModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>('select-exchange');
  const [selectedExchange, setSelectedExchange] = useState<ExchangeInfo | null>(null);
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([]);
  const [rawColumns, setRawColumns] = useState<string[]>([]);
  const [detectedExchange, setDetectedExchange] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // Close on Click Outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const handleExchangeSelect = (exchange: ExchangeInfo) => {
    setSelectedExchange(exchange);
    setStep('instructions');
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as any[];
          if (!rows.length) {
            setError('CSV file is empty');
            return;
          }

          const columns = Object.keys(rows[0]);
          setRawColumns(columns);

          const detected = detectExchange(columns);
          setDetectedExchange(detected);

          const exchangeId = selectedExchange?.id === 'generic' ? detected : selectedExchange?.id;
          const trades = parseCSV(rows, exchangeId);

          if (!trades.length) {
            setError('No valid trades found in CSV. Please check the column format.');
            return;
          }

          setParsedTrades(trades);
          setStep('preview');
        } catch (err) {
          console.error('Parse error:', err);
          setError('Failed to parse CSV file. Please check the format.');
        }
      },
      error: (err) => {
        console.error('CSV parse error:', err);
        setError('Error reading CSV file.');
      },
    });

    e.target.value = '';
  };

  const handleConfirmImport = () => {
    onUpload(parsedTrades);
    handleClose();
  };

  const handleClose = () => {
    setStep('select-exchange');
    setSelectedExchange(null);
    setParsedTrades([]);
    setRawColumns([]);
    setError(null);
    setFileName('');
    onClose();
  };

  const handleBack = () => {
    if (step === 'instructions') {
      setStep('select-exchange');
      setSelectedExchange(null);
    } else if (step === 'upload' || step === 'preview') {
      setStep('instructions');
      setParsedTrades([]);
      setError(null);
    }
  };

  const totalPnL = parsedTrades.reduce((sum, t) => sum + t.pnl_usd, 0);
  const wins = parsedTrades.filter(t => t.pnl_usd > 0).length;
  const losses = parsedTrades.filter(t => t.pnl_usd < 0).length;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
        padding: '20px'
      }}
      onClick={handleBackdropClick}
    >
      <style>{`
        .csv-modal-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .csv-modal-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
        }
        .csv-modal-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212, 165, 69, 0.2);
          border-radius: 3px;
        }
        .csv-modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 165, 69, 0.4);
        }
      `}</style>
      <div
        ref={modalRef}
        style={{
          backgroundColor: '#251E17',
          borderRadius: '16px',
          border: '1px solid rgba(212, 165, 69, 0.15)',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(212, 165, 69, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileSpreadsheet style={{ width: '24px', height: '24px', color: '#F5C76D' }} />
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#F5C76D', margin: 0 }}>
                Import Trades from CSV
              </h2>
            </div>
            <button
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(37, 30, 23, 0.6)',
                color: '#C2B280',
                border: '1px solid rgba(212, 165, 69, 0.15)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#8B7355', margin: 0 }}>
            {step === 'select-exchange' && 'Select your exchange to get started'}
            {step === 'instructions' && `Follow the steps to export from ${selectedExchange?.name}`}
            {step === 'upload' && 'Upload your CSV file'}
            {step === 'preview' && 'Review your trades before importing'}
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="csv-modal-scrollbar" style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>

          {/* Step 1: Select Exchange */}
          {step === 'select-exchange' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {EXCHANGE_CONFIGS.map((exchange) => (
                <button
                  key={exchange.id}
                  onClick={() => handleExchangeSelect(exchange)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: 'rgba(37, 30, 23, 0.6)',
                    border: '1px solid rgba(212, 165, 69, 0.15)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 200ms'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212, 165, 69, 0.4)';
                    e.currentTarget.style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212, 165, 69, 0.15)';
                    e.currentTarget.style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: '#F7E7C6', fontSize: '15px', marginBottom: '4px' }}>
                      {exchange.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8B7355' }}>{exchange.description}</div>
                  </div>
                  <ChevronRight style={{ width: '20px', height: '20px', color: '#8B7355' }} />
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Instructions */}
          {step === 'instructions' && selectedExchange && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <button
                onClick={handleBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#D4A373',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: 0,
                  textAlign: 'left'
                }}
              >
                ← Back to exchange selection
              </button>

              <div style={{
                backgroundColor: 'rgba(37, 30, 23, 0.6)',
                border: '1px solid rgba(212, 165, 69, 0.15)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <HelpCircle style={{ width: '18px', height: '18px', color: '#F5C76D' }} />
                  <span style={{ fontWeight: '600', color: '#F7E7C6', fontSize: '15px' }}>
                    How to export from {selectedExchange.name}
                  </span>
                </div>
                <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedExchange.instructions.map((instruction, idx) => (
                    <li key={idx} style={{ color: '#C2B280', fontSize: '13px' }}>
                      {instruction}
                    </li>
                  ))}
                </ol>
              </div>

              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ fontWeight: '600', color: '#10b981', fontSize: '12px', marginBottom: '12px' }}>
                  EXPECTED COLUMNS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedExchange.sampleColumns.map((col, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#6ee7b7',
                        fontSize: '11px',
                        borderRadius: '6px',
                        fontFamily: 'monospace'
                      }}
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep('upload')}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#D4A373',
                  color: '#1a1612',
                  fontWeight: '700',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                I have my CSV ready
                <ChevronRight style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
          )}

          {/* Step 3: Upload */}
          {step === 'upload' && selectedExchange && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <button
                onClick={handleBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#D4A373',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: 0,
                  textAlign: 'left'
                }}
              >
                ← Back to instructions
              </button>

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(212, 165, 69, 0.3)',
                  borderRadius: '12px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 165, 69, 0.5)';
                  e.currentTarget.style.backgroundColor = 'rgba(37, 30, 23, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 165, 69, 0.3)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Upload style={{ width: '48px', height: '48px', color: '#D4A373', margin: '0 auto 16px' }} />
                <p style={{ color: '#F7E7C6', fontWeight: '600', fontSize: '15px', margin: '0 0 4px' }}>
                  Drop your CSV file here
                </p>
                <p style={{ color: '#8B7355', fontSize: '13px', margin: 0 }}>or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {error && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <AlertCircle style={{ width: '20px', height: '20px', color: '#ef4444', flexShrink: 0 }} />
                  <div>
                    <p style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px', margin: '0 0 4px' }}>Import Error</p>
                    <p style={{ color: '#fca5a5', fontSize: '13px', margin: 0 }}>{error}</p>
                  </div>
                </div>
              )}

              <p style={{ color: '#8B7355', fontSize: '12px', textAlign: 'center', margin: 0 }}>
                Importing from: <span style={{ color: '#D4A373' }}>{selectedExchange.name}</span>
              </p>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <button
                onClick={handleBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#D4A373',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: 0,
                  textAlign: 'left'
                }}
              >
                ← Upload different file
              </button>

              {/* Success banner */}
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <CheckCircle style={{ width: '20px', height: '20px', color: '#10b981', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#10b981', fontWeight: '600', fontSize: '14px', margin: '0 0 4px' }}>
                    Successfully parsed {parsedTrades.length} trades
                  </p>
                  <p style={{ color: '#6ee7b7', fontSize: '13px', margin: 0 }}>
                    from {fileName}
                    {detectedExchange && selectedExchange?.id === 'generic' && (
                      <span style={{ color: '#8B7355' }}> (detected as {detectedExchange})</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Summary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ backgroundColor: 'rgba(37, 30, 23, 0.6)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#F7E7C6' }}>{parsedTrades.length}</div>
                  <div style={{ fontSize: '11px', color: '#8B7355' }}>Trades</div>
                </div>
                <div style={{ backgroundColor: 'rgba(37, 30, 23, 0.6)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: totalPnL >= 0 ? '#10b981' : '#ef4444' }}>
                    ${Math.abs(totalPnL).toFixed(0)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8B7355' }}>Total P&L</div>
                </div>
                <div style={{ backgroundColor: 'rgba(37, 30, 23, 0.6)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#10b981' }}>{wins}</div>
                  <div style={{ fontSize: '11px', color: '#8B7355' }}>Wins</div>
                </div>
                <div style={{ backgroundColor: 'rgba(37, 30, 23, 0.6)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#ef4444' }}>{losses}</div>
                  <div style={{ fontSize: '11px', color: '#8B7355' }}>Losses</div>
                </div>
              </div>

              {/* Trade preview table */}
              <div style={{
                backgroundColor: 'rgba(37, 30, 23, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(212, 165, 69, 0.15)',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(212, 165, 69, 0.1)' }}>
                  <span style={{ fontWeight: '600', color: '#F7E7C6', fontSize: '13px' }}>Preview (first 10 trades)</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(26, 22, 18, 0.8)' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8B7355', fontWeight: '500' }}>Date</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8B7355', fontWeight: '500' }}>Symbol</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8B7355', fontWeight: '500' }}>Side</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', color: '#8B7355', fontWeight: '500' }}>Entry</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', color: '#8B7355', fontWeight: '500' }}>P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedTrades.slice(0, 10).map((trade, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid rgba(212, 165, 69, 0.08)' }}>
                          <td style={{ padding: '10px 12px', color: '#C2B280', fontFamily: 'monospace', fontSize: '11px' }}>
                            {new Date(trade.date).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#F7E7C6', fontWeight: '600' }}>{trade.symbol}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '700',
                              backgroundColor: trade.side === 'LONG' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: trade.side === 'LONG' ? '#10b981' : '#ef4444'
                            }}>
                              {trade.side}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#C2B280', textAlign: 'right', fontFamily: 'monospace' }}>
                            ${trade.entry.toLocaleString()}
                          </td>
                          <td style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontWeight: '600',
                            color: trade.pnl_usd >= 0 ? '#10b981' : '#ef4444'
                          }}>
                            {trade.pnl_usd >= 0 ? '+' : ''}${trade.pnl_usd.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedTrades.length > 10 && (
                  <div style={{ padding: '10px', textAlign: 'center', color: '#8B7355', fontSize: '12px', borderTop: '1px solid rgba(212, 165, 69, 0.08)' }}>
                    ... and {parsedTrades.length - 10} more trades
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div style={{
            padding: '20px 32px',
            borderTop: '1px solid rgba(212, 165, 69, 0.1)',
            display: 'flex',
            gap: '12px'
          }}>
            <button
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '14px',
                backgroundColor: 'rgba(37, 30, 23, 0.6)',
                color: '#C2B280',
                fontWeight: '600',
                fontSize: '14px',
                borderRadius: '10px',
                border: '1px solid rgba(212, 165, 69, 0.15)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              style={{
                flex: 1,
                padding: '14px',
                backgroundColor: '#D4A373',
                color: '#1a1612',
                fontWeight: '700',
                fontSize: '14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle style={{ width: '18px', height: '18px' }} />
              Import {parsedTrades.length} Trades
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
