// src/components/SetupManager.tsx
import { useState } from "react";

type Setup = {
  id: string;
  name: string;
};

type Props = {
  setups: Setup[];
  onCreate: (name: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

export default function SetupManager({ setups, onCreate, onDelete }: Props) {
  const [name, setName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      await onCreate(trimmed);            // CALLS DASHBOARD FN
      setName("");                        // CLEAR INPUT
    } catch (err) {
      console.error("handleSubmit error", err);
    }
  }

  return (
    <div
      style={{
        marginTop: 24,
        backgroundColor: "rgba(37, 30, 23, 0.4)",
        borderRadius: 12,
        border: "1px solid rgba(212, 165, 69, 0.15)",
        padding: 20,
      }}
    >
      <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600, color: "#F5C76D" }}>Setups</h3>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}
      >
        <input
          placeholder="New setup name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            flex: 1,
            minWidth: 220,
            backgroundColor: "rgba(37, 30, 23, 0.6)",
            color: "#C2B280",
            border: "1px solid rgba(212, 165, 69, 0.2)",
            padding: "12px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
          }}
        />

        <button
          type="submit"
          style={{
            padding: "12px 20px",
            borderRadius: 8,
            backgroundColor: "#F5C76D",
            color: "#1D1A16",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Add Setup
        </button>
      </form>

      {setups.length === 0 ? (
        <div style={{ fontSize: 13, color: "#8B7355" }}>
          No setups yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 13 }}>
          {setups.map((s) => (
            <div
              key={s.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 999,
                backgroundColor: "rgba(37, 30, 23, 0.6)",
                border: "1px solid rgba(212, 165, 69, 0.2)",
                color: "#C2B280",
              }}
            >
              <span>{s.name}</span>
              <button
                type="button"
                onClick={() => onDelete(s.id)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#8B7355",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
