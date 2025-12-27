import React from 'react';
import { Trade, Outcome } from '../types';
import { TrendingUp, TrendingDown, Activity, Target, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  trades: Trade[];
  compact?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ trades, compact = false }) => {
  const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);
  const winCount = trades.filter(t => t.outcome === Outcome.WIN).length;
  const winRate = trades.length > 0 ? ((winCount / trades.length) * 100).toFixed(1) : '0';
  
  const chartData = trades.map((t, i) => ({
    name: `Trade ${i + 1}`,
    pnl: t.pnl,
    cumPnL: trades.slice(0, i + 1).reduce((sum, trade) => sum + trade.pnl, 0)
  }));

  return (
    <div className={`${compact ? 'p-4 space-y-4' : 'p-6 lg:p-10 space-y-8'} animate-fade-in h-full overflow-hidden`}>
      <header className="flex justify-between items-end">
        <div>
          <h1 className={`${compact ? 'text-xl' : 'text-3xl'} font-serif font-bold text-white tracking-tight`}>Dashboard</h1>
          {!compact && <p className="text-leather-dim mt-2 text-sm">Overview of your trading performance.</p>}
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative w-2 h-2">
            <div className="absolute w-full h-full bg-emerald-500 rounded-full live-dot"></div>
            <div className="relative w-full h-full bg-emerald-500 rounded-full"></div>
          </div>
          <span className="text-xs font-mono text-emerald-500 uppercase tracking-widest">Live Data</span>
        </div>
      </header>

      {/* KPI Cards */}
      <div className={`grid ${compact ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'}`}>
        <div className={`bg-leather-800 rounded-xl border border-leather-700 relative overflow-hidden group shadow-lg transition-all duration-300 ${compact ? 'p-3' : 'p-6 hover:border-leather-accent/30 hover:-translate-y-1'}`}>
          {!compact && (
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <DollarSign className="w-24 h-24 text-leather-accent" />
            </div>
          )}
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Net PnL</p>
          <h2 className={`${compact ? 'text-lg' : 'text-3xl'} font-mono font-bold mt-1 ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${totalPnL.toLocaleString()}
          </h2>
          {!compact && (
            <div className="mt-4 flex items-center text-xs text-gray-500">
              <span className="text-emerald-400 flex items-center mr-2">
                <TrendingUp className="w-3 h-3 mr-1" /> +12.5%
              </span>
              vs last month
            </div>
          )}
        </div>

        <div className={`bg-leather-800 rounded-xl border border-leather-700 relative overflow-hidden group shadow-lg transition-all duration-300 ${compact ? 'p-3' : 'p-6 hover:border-leather-accent/30 hover:-translate-y-1'}`}>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Win Rate</p>
          <h2 className={`${compact ? 'text-lg' : 'text-3xl'} font-mono font-bold mt-1 text-leather-accent`}>{winRate}%</h2>
          {!compact && (
            <div className="w-full bg-leather-900 h-1.5 mt-4 rounded-full overflow-hidden border border-leather-700">
              <div className="bg-leather-accent h-full rounded-full transition-all duration-1000" style={{ width: `${winRate}%` }}></div>
            </div>
          )}
        </div>

        {!compact && (
          <>
            <div className="bg-leather-800 p-6 rounded-xl border border-leather-700 relative overflow-hidden group shadow-lg transition-all duration-300 hover:border-leather-accent/30 hover:-translate-y-1">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity className="w-24 h-24 text-leather-accent" />
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Trades</p>
              <h2 className="text-3xl font-mono font-bold mt-2 text-white">{trades.length}</h2>
              <p className="mt-4 text-xs text-gray-500">Avg 1.2 trades/day</p>
            </div>

            <div className="bg-leather-800 p-6 rounded-xl border border-leather-700 relative overflow-hidden group shadow-lg transition-all duration-300 hover:border-leather-accent/30 hover:-translate-y-1">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingDown className="w-24 h-24 text-orange-500" />
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Avg R:R</p>
              <h2 className="text-3xl font-mono font-bold mt-2 text-orange-300">2.45</h2>
              <p className="mt-4 text-xs text-gray-500">Risk Reward Ratio</p>
            </div>
          </>
        )}
      </div>

      {/* Main Chart Area */}
      <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-8`}>
        <div className={`lg:col-span-2 bg-leather-800 rounded-xl border border-leather-700 shadow-lg transition-all duration-500 ${compact ? 'p-3' : 'p-6 hover:shadow-2xl'}`}>
          {!compact && (
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-serif font-semibold text-white">Cumulative PnL</h3>
              <select className="bg-leather-900 text-xs text-gray-400 border border-leather-700 rounded px-3 py-1 outline-none hover:border-leather-accent/50 transition-colors">
                <option>Last 30 Days</option>
                <option>Last 90 Days</option>
                <option>All Time</option>
              </select>
            </div>
          )}
          <div className={`${compact ? 'h-[150px]' : 'h-[300px]'} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4a373" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#d4a373" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c1e12" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis stroke="#5d4037" fontSize={12} tickFormatter={(value) => `$${value}`} hide={compact} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a120b', borderColor: '#3e2b1c', color: '#fff' }}
                  itemStyle={{ color: '#d4a373' }}
                />
                <Area type="monotone" dataKey="cumPnL" stroke="#d4a373" strokeWidth={2} fillOpacity={1} fill="url(#colorPnL)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        {!compact && (
          <div className="bg-leather-800 p-6 rounded-xl border border-leather-700 flex flex-col shadow-lg">
            <h3 className="text-lg font-serif font-semibold text-white mb-4">Recent Trades</h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {trades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-3 bg-leather-900/50 rounded-lg border border-transparent hover:border-leather-accent/20 transition-all duration-200 cursor-pointer group hover:pl-4">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded flex items-center justify-center text-[10px] font-bold mr-3 border transition-transform duration-300 group-hover:rotate-12
                      ${trade.outcome === Outcome.WIN 
                        ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/30' 
                        : 'bg-red-900/20 text-red-400 border-red-900/30'}
                    `}>
                      {trade.pair.split('/')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{trade.pair}</p>
                      <p className="text-xs text-gray-500">{trade.type} • {trade.setup}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.pnl >= 0 ? '+' : ''}{trade.pnl}
                    </p>
                    <p className="text-xs text-gray-500">{trade.leverage}x</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};