import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import "./styles/animations.css";

import DashboardPage from "./pages/DashboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import TradesPage from "./pages/TradesPage";
import SettingsPage from "./pages/SettingsPage";
import JournalPage from "./pages/JournalPage";

import WalletoReplayPage from "./pages/WalletoReplayPage";
import TradeDetailPage from "./pages/TradeDetailPage";
import LiveTradeDetailPage from "./pages/LiveTradeDetailPage";
import LiveTradeEntryPage from "./pages/LiveTradeEntryPage";
import DocsPage from './pages/DocsPage';
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AuthGuard from "./components/layout/AuthGuard";
import CoachButton from "./components/coach/CoachButton";
import CoachPanel from "./components/coach/CoachPanel";
import * as coachApi from "./api/coach";
import MobileNavDrawer from "./components/layout/MobileNavDrawer";
import { useResponsive } from "./hooks/useResponsive";
import { ModalProvider } from "./components/modals/CustomModals";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`nav-link ${isActive ? "active" : ""}`}>
      {children}
    </Link>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [trades, setTrades] = useState<any[]>([]);
  const [setups, setSetups] = useState<any[]>([]);

  // Coach state
  const [showCoachPanel, setShowCoachPanel] = useState(false);
  const [coachUnreadCount, setCoachUnreadCount] = useState(0);

  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      setLoadingAuth(false);

      if (u) {
        loadTrades(u.id);
        loadSetups(u.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          loadTrades(u.id);
          loadSetups(u.id);
        } else {
          setTrades([]);
          setSetups([]);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Poll for coach unread insights
  useEffect(() => {
    if (!user) {
      setCoachUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const result = await coachApi.getPendingInsights(user.id, 1, true);
        setCoachUnreadCount(result.unread_count);
      } catch (err) {
        console.error("Error fetching coach unread count:", err);
      }
    };

    // Fetch immediately
    fetchUnreadCount();

    // Poll every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000);

    return () => clearInterval(interval);
  }, [user]);

  async function loadSetups(userId: string) {
    const { data, error } = await supabase
      .from("setups")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("loadSetups error:", error);
      return;
    }

    setSetups(data || []);
  }

  async function createSetup(name: string) {
    if (!user) return;

    const { data, error } = await supabase
      .from("setups")
      .insert({
        user_id: user.id,
        name,
      })
      .select("*")
      .single();

    if (error) {
      console.error("createSetup error:", error);
      return;
    }

    setSetups((prev) => [...prev, data]);
  }

  async function deleteSetup(id: string) {
    if (!user) return;

    const { error } = await supabase
      .from("setups")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("deleteSetup error:", error);
      return;
    }

    setSetups((prev) => prev.filter((s) => s.id !== id));
  }

  async function loadTrades(userId: string) {
    console.log("[loadTrades] Fetching trades for user:", userId);

    let allTrades: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;

    // Fetch trades in pages of 1000 to handle large datasets
    while (hasMore) {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error("loadTrades error at offset", offset, ":", error.message);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allTrades = allTrades.concat(data);
      console.log(`[loadTrades] Loaded ${data.length} trades (total: ${allTrades.length})`);

      // If we got fewer than pageSize results, we've reached the end
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    }

    console.log("[loadTrades] Successfully loaded", allTrades.length, "trades total");
    setTrades(allTrades);
  }

  async function saveTrade(t: any) {
    if (!user) return;

    const formatted = {
      user_id: user.id,
      date: t.date,
      symbol: t.symbol,
      side: t.side,
      entry: t.entry,
      exit: t.exit,
      size: t.size,
      leverage: t.leverage,
      fees: t.fees,
      setup_id: t.setup_id ?? null,
      notes: t.notes ?? null,
      pnl_usd: t.pnl_usd || 0,
      pnl_pct: t.pnl_pct || 0,
    };

    const { error } = await supabase.from("trades").insert(formatted);
    if (error) console.error("saveTrade error:", error);

    loadTrades(user.id);
  }

  async function saveManyTrades(rows: any[]) {
    if (!user) return;

    const formatted = rows.map((t) => {
      const entry = Number(t.entry) || 0;
      const exit = Number(t.exit) || 0;
      const size = Number(t.size) || 0;
      const leverage = Number(t.leverage) || 1;
      const pnlUsd = Number(t.pnl_usd) || 0;

      // Calculate pnl_pct if not provided
      let pnlPct = Number(t.pnl_pct) || 0;
      if (!pnlPct && entry > 0 && size > 0 && leverage > 0) {
        const positionValue = entry * size;
        const marginUsed = positionValue / leverage;
        pnlPct = marginUsed > 0 ? (pnlUsd / marginUsed) * 100 : 0;
      }

      return {
        user_id: user.id,
        // Old column names (for backward compatibility)
        date: t.date,
        symbol: t.symbol,
        side: t.side,
        entry: entry,
        exit: exit,
        size: size,
        leverage: leverage,
        fees: Number(t.fees) || 0,
        setup_id: t.setup_id ?? null,
        notes: t.notes ?? null,
        pnl_usd: pnlUsd,
        pnl_pct: pnlPct,
        // New column names (same as API syncs)
        entry_price: entry,
        exit_price: exit,
        quantity: size,
        entry_time: t.date,
        pnl_percent: pnlPct,
        exchange: t.exchange || 'csv_import',
      };
    });

    const { error } = await supabase.from("trades").insert(formatted);
    if (error) console.error("saveManyTrades error:", error);

    loadTrades(user.id);
  }

  function updateTradeLocally(id: string, patch: any) {
    setTrades((prev) =>
      prev.map((t: any) => (t.id === id ? { ...t, ...patch } : t))
    );
  }

  if (loadingAuth) return <div>Loading...</div>;

  return (
    <ModalProvider>
    <BrowserRouter>
      <nav className="nav-bar">
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: isMobile ? '0 16px' : '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Left: Logo */}
          <div className="flex items-center" style={{ minWidth: isMobile ? 'auto' : '100px' }}>
            <img
              src="/walleto-logo.jpg"
              alt="Walleto Logo"
              style={{
                height: isMobile ? '22px' : '24px',
                width: 'auto',
                marginRight: '6px',
                borderRadius: '4px'
              }}
            />
            {!isMobile && (
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "white" }}>
                Walleto
              </div>
            )}
          </div>

          {/* Center: Nav Links - Desktop only */}
          {user && !isMobile && !isTablet && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <NavLink to="/">Dashboard</NavLink>
              <NavLink to="/analytics">Analytics</NavLink>
              <NavLink to="/trades">Trades</NavLink>
              <NavLink to="/journal">Journal</NavLink>
              <NavLink to="/replay">Replay</NavLink>
              <NavLink to="/settings">Settings</NavLink>
            </div>
          )}

          {/* Tablet: Condensed nav links */}
          {user && isTablet && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '4px' }}>
              <NavLink to="/">Home</NavLink>
              <NavLink to="/analytics">Analytics</NavLink>
              <NavLink to="/trades">Trades</NavLink>
              <NavLink to="/journal">Journal</NavLink>
              <NavLink to="/settings">Settings</NavLink>
            </div>
          )}

          {/* Right: Auth buttons or Hamburger menu */}
          <div style={{ minWidth: isMobile ? 'auto' : '100px', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
            {!user ? (
              <div className="flex gap-md">
                <Link to="/login" className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }}>Login</Link>
                <Link to="/signup" className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '12px' }}>Signup</Link>
              </div>
            ) : (
              <>
                {/* Desktop/Tablet: Logout button */}
                {!isMobile && (
                  <button onClick={() => supabase.auth.signOut()} className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }}>
                    Logout
                  </button>
                )}
                {/* Mobile: Hamburger menu */}
                {isMobile && (
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    style={{
                      padding: '6px',
                      minWidth: '32px',
                      minHeight: '32px',
                      backgroundColor: 'rgba(245, 199, 109, 0.1)',
                      border: '1px solid rgba(245, 199, 109, 0.3)',
                      borderRadius: '6px',
                      color: '#F5C76D',
                      fontSize: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Open menu"
                  >
                    ☰
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {user && (
        <MobileNavDrawer
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onLogout={() => supabase.auth.signOut()}
        />
      )}

      <Routes>
        <Route
          path="/"
          element={
            <AuthGuard user={user}>
              <DashboardPage
                user={user}
                trades={trades}
                setTrades={setTrades}
                setups={setups}
                setSetups={setSetups}
                saveTrade={saveTrade}
                saveManyTrades={saveManyTrades}
                createSetup={createSetup}
                deleteSetup={deleteSetup}
              />
            </AuthGuard>
          }
        />

        <Route
          path="/analytics"
          element={
            <AuthGuard user={user}>
              <AnalyticsPage trades={trades} setups={setups} />
            </AuthGuard>
          }
        />

        <Route
          path="/trades"
          element={
            <AuthGuard user={user}>
              <TradesPage
                trades={trades}
                setups={setups}
                updateTradeLocally={updateTradeLocally}
              />
            </AuthGuard>
          }
        />

        <Route
          path="/settings"
          element={
            <AuthGuard user={user}>
              <SettingsPage user={user} />
            </AuthGuard>
          }
        />

        <Route
          path="/journal"
          element={
            <AuthGuard user={user}>
              <JournalPage userId={user?.id} trades={trades} />
            </AuthGuard>
          }
        />

        <Route
          path="/docs"
          element={
            <DocsPage />
          }
        />





        <Route
          path="/replay"
          element={
            <AuthGuard user={user}>
              <WalletoReplayPage trades={trades} updateTradeLocally={updateTradeLocally} />
            </AuthGuard>
          }
        />

        <Route
          path="/replay/:tradeId"
          element={
            <AuthGuard user={user}>
              <TradeDetailPage />
            </AuthGuard>
          }
        />

        <Route
          path="/replay/live"
          element={
            <AuthGuard user={user}>
              <LiveTradeDetailPage />
            </AuthGuard>
          }
        />

        <Route
          path="/replay/entry"
          element={
            <AuthGuard user={user}>
              <LiveTradeEntryPage />
            </AuthGuard>
          }
        />

        <Route
          path="/login"
          element={!user ? <LoginPage /> : <Navigate to="/" />}
        />

        <Route
          path="/signup"
          element={!user ? <SignupPage /> : <Navigate to="/" />}
        />

        <Route
          path="/forgot-password"
          element={!user ? <ForgotPasswordPage /> : <Navigate to="/" />}
        />

        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Coach components - visible to authenticated users */}
      {user && (
        <>
          <CoachButton
            onClick={() => setShowCoachPanel(!showCoachPanel)}
            unreadCount={coachUnreadCount}
          />
          <CoachPanel
            userId={user.id}
            isOpen={showCoachPanel}
            onClose={() => setShowCoachPanel(false)}
          />
        </>
      )}
    </BrowserRouter>
    </ModalProvider>
  );
}
