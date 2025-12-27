import React from "react";

export default function ExchangeSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <label style={{ fontSize: 13, opacity: 0.8 }}>Exchange:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          background: "#111",
          color: "white",
          border: "1px solid #333",
        }}
      >
        <option value="BINANCE">Binance</option>
        <option value="BYBIT">Bybit</option>
        <option value="BLOFIN">Blofin</option>
        <option value="HYPERLIQUID">Hyperliquid</option>
      </select>
    </div>
  );
}
