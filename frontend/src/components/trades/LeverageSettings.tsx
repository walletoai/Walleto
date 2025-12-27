import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { API_URL } from "../../config/api";
import { useModals } from "../modals/CustomModals";

interface LeverageSetting {
  id: string;
  symbol: string;
  exchange: string;
  leverage: number;
}

interface Props {
  userId: string;
  symbols: string[];
  onClose: () => void;
}

export default function LeverageSettings({ userId, symbols, onClose }: Props) {
  const { confirm, alert } = useModals();
  const [settings, setSettings] = useState<LeverageSetting[]>([]);
  const [selectedExchange, setSelectedExchange] = useState("blofin");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [leverageValue, setLeverageValue] = useState("1");
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [loading, setLoading] = useState(false);

  const exchanges = ["blofin", "binance", "bybit", "hyperliquid", "okx", "other"];

  // Load existing leverage settings
  useEffect(() => {
    fetchSettings();
  }, [userId]);

  async function fetchSettings() {
    try {
      const response = await fetch(`${API_URL}/api/leverage-settings/${userId}`);

      if (!response.ok) {
        console.error("Failed to fetch leverage settings:", response.status);
        setSettings([]);
        return;
      }

      const data = await response.json();

      // Ensure data is an array
      if (Array.isArray(data)) {
        setSettings(data);
      } else {
        console.error("Expected array but got:", data);
        setSettings([]);
      }
    } catch (error) {
      console.error("Error fetching leverage settings:", error);
      setSettings([]);
    }
  }

  async function saveSetting() {
    if (!selectedSymbol || !leverageValue) {
      await alert({ message: "Please select a symbol and enter leverage", type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      // Save the default leverage setting
      const response = await fetch(`${API_URL}/api/leverage-settings/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedSymbol,
          exchange: selectedExchange,
          leverage: parseFloat(leverageValue)
        })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh settings
        await fetchSettings();

        // If user wants to apply to existing trades, update them
        if (applyToExisting) {
          await applyToExistingTrades();
        }

        await alert({ message: result.message, type: 'success' });
        setSelectedSymbol("");
        setLeverageValue("1");
        setApplyToExisting(false);
      } else {
        await alert({ message: "Failed to save setting", type: 'error' });
      }
    } catch (error) {
      console.error("Error saving leverage setting:", error);
      await alert({ message: "Failed to save setting", type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function applyToExistingTrades() {
    try {
      // Fetch all trades matching the symbol and exchange from the database
      // This updates EXISTING trades without needing to resync from the exchange
      const { data: trades, error: fetchError } = await supabase
        .from("trades")
        .select("id, entry_price, quantity, pnl_usd")
        .eq("user_id", userId)
        .eq("symbol", selectedSymbol)
        .eq("exchange", selectedExchange);

      if (fetchError) {
        console.error("Error fetching trades:", fetchError);
        await alert({ message: `Error fetching trades: ${fetchError.message}`, type: 'error' });
        return;
      }

      if (!trades || trades.length === 0) {
        console.log("No existing trades to update");
        return;
      }

      const leverage = parseFloat(leverageValue);
      let updatedCount = 0;

      // Update each trade with new leverage and recalculated PnL%
      for (const trade of trades) {
        const positionValue = trade.entry_price * trade.quantity;
        const marginUsed = positionValue / leverage;
        const pnlPercent = marginUsed > 0 ? (trade.pnl_usd / marginUsed) * 100 : 0;

        const { error: updateError } = await supabase
          .from("trades")
          .update({
            leverage: leverage,
            pnl_percent: pnlPercent
          })
          .eq("id", trade.id);

        if (!updateError) {
          updatedCount++;
        }
      }

      console.log(`Updated ${updatedCount} existing trades for ${selectedSymbol} on ${selectedExchange}`);
      await alert({ message: `Updated ${updatedCount} existing ${selectedSymbol} trades on ${selectedExchange} to ${leverage}x leverage`, type: 'success' });
    } catch (error) {
      console.error("Error applying to existing trades:", error);
      await alert({ message: `Error updating trades: ${error}`, type: 'error' });
    }
  }

  async function deleteSetting(setting: LeverageSetting) {
    const confirmed = await confirm({
      title: "Delete Leverage Setting",
      message: `Delete ${setting.leverage}x leverage for ${setting.symbol} on ${setting.exchange}?`,
      type: 'warning',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/api/leverage-settings/${userId}/${setting.exchange}/${setting.symbol}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (result.success) {
        await fetchSettings();
        await alert({ message: result.message, type: 'success' });
      }
    } catch (error) {
      console.error("Error deleting setting:", error);
      await alert({ message: "Failed to delete setting", type: 'error' });
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
        padding: "20px"
      }}
    >
      <div
        style={{
          backgroundColor: "#251E17",
          border: "1px solid rgba(212, 165, 69, 0.15)",
          borderRadius: "16px",
          padding: "32px",
          width: "100%",
          maxWidth: "800px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
          maxHeight: "90vh",
          overflowY: "auto"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px"
          }}
        >
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#F5C76D",
              margin: 0
            }}
          >
            Default Leverage Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              backgroundColor: "rgba(37, 30, 23, 0.6)",
              color: "#C2B280",
              border: "1px solid rgba(212, 165, 69, 0.15)",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>

        <p
          style={{
            fontSize: "13px",
            color: "#8B7355",
            marginBottom: "24px"
          }}
        >
          Set default leverage values for specific coins on each exchange. These defaults will be automatically applied when syncing new trades.
        </p>

        {/* Add New Setting Form */}
        <div
          style={{
            backgroundColor: "rgba(37, 30, 23, 0.4)",
            border: "1px solid rgba(212, 165, 69, 0.15)",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "24px"
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#F5C76D",
              marginBottom: "16px"
            }}
          >
            Add New Default
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "16px",
              marginBottom: "16px"
            }}
          >
            {/* Exchange Selection */}
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: "#8B7355",
                  fontWeight: "600",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                  display: "block"
                }}
              >
                Exchange
              </label>
              <select
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "rgba(37, 30, 23, 0.6)",
                  border: "1px solid rgba(212, 165, 69, 0.2)",
                  borderRadius: "8px",
                  color: "#C2B280",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                {exchanges.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex.charAt(0).toUpperCase() + ex.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Symbol Selection */}
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: "#8B7355",
                  fontWeight: "600",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                  display: "block"
                }}
              >
                Symbol
              </label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "rgba(37, 30, 23, 0.6)",
                  border: "1px solid rgba(212, 165, 69, 0.2)",
                  borderRadius: "8px",
                  color: "#C2B280",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                <option value="">Select Symbol</option>
                {symbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>

            {/* Leverage Input */}
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: "#8B7355",
                  fontWeight: "600",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                  display: "block"
                }}
              >
                Leverage
              </label>
              <input
                type="number"
                value={leverageValue}
                onChange={(e) => setLeverageValue(e.target.value)}
                min="1"
                max="125"
                step="0.1"
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "rgba(37, 30, 23, 0.6)",
                  border: "1px solid rgba(212, 165, 69, 0.2)",
                  borderRadius: "8px",
                  color: "#C2B280",
                  fontSize: "13px",
                  fontWeight: "500"
                }}
              />
            </div>
          </div>

          {/* Apply to Existing Checkbox */}
          <div
            style={{
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <input
              type="checkbox"
              id="applyToExisting"
              checked={applyToExisting}
              onChange={(e) => setApplyToExisting(e.target.checked)}
              style={{
                width: "18px",
                height: "18px",
                cursor: "pointer",
                accentColor: "#D4AF37"
              }}
            />
            <label
              htmlFor="applyToExisting"
              style={{
                fontSize: "12px",
                color: "#C2B280",
                cursor: "pointer"
              }}
            >
              Also update all existing {selectedSymbol || "symbol"} trades on {selectedExchange} to use {leverageValue}x leverage
            </label>
          </div>

          {/* Save Button */}
          <button
            onClick={saveSetting}
            disabled={loading || !selectedSymbol}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: loading || !selectedSymbol ? "rgba(245, 199, 109, 0.3)" : "#F5C76D",
              color: loading || !selectedSymbol ? "#8B7355" : "#1D1A16",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: loading || !selectedSymbol ? "not-allowed" : "pointer",
              transition: "all 200ms"
            }}
          >
            {loading ? "Saving..." : "Save Default Leverage"}
          </button>
        </div>

        {/* Existing Settings List */}
        <div>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#F5C76D",
              marginBottom: "16px"
            }}
          >
            Current Defaults
          </h3>

          {settings.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "#8B7355"
              }}
            >
              No default leverage settings yet
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {settings.map((setting) => (
                <div
                  key={setting.id}
                  style={{
                    backgroundColor: "rgba(37, 30, 23, 0.3)",
                    border: "1px solid rgba(212, 165, 69, 0.12)",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#F5C76D",
                        marginBottom: "4px"
                      }}
                    >
                      {setting.symbol}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#8B7355"
                      }}
                    >
                      {setting.exchange.charAt(0).toUpperCase() + setting.exchange.slice(1)} • {setting.leverage}x leverage
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSetting(setting)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
