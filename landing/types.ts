// Trade types for the landing page demo dashboard

export enum TradeType {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export enum TradeStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export enum Outcome {
  WIN = 'WIN',
  LOSS = 'LOSS',
  BREAK_EVEN = 'BREAK_EVEN'
}

export interface Trade {
  id: string;
  pair: string;
  type: TradeType;
  entryPrice: number;
  exitPrice: number;
  size: number;
  leverage: number;
  pnl: number;
  pnlPercentage: number;
  date: string;
  status: TradeStatus;
  outcome: Outcome;
  notes: string;
  setup: string;
  mistakes: string[];
  screenshotUrl?: string;
}

// Support ticket for the help widget
export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: number;
}
