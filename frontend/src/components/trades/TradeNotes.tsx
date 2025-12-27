// src/components/TradeNotes.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function TradeNotes({ tradeId, onClose }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [text, setText] = useState("");

  // Load notes for this trade
  async function loadNotes() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("trade_notes")
      .select("*")
      .eq("user_id", user.id)
      .eq("trade_id", tradeId)
      .order("created_at", { ascending: false });

    if (!error) setNotes(data);
  }

  // Add a new note
  async function addNote() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !text.trim()) return;

    const { error } = await supabase.from("trade_notes").insert({
      user_id: user.id,
      trade_id: tradeId,
      text,
    });

    if (!error) {
      setText("");
      loadNotes();
    }
  }

  // Delete a note
  async function deleteNote(id) {
    await supabase.from("trade_notes").delete().eq("id", id);
    loadNotes();
  }

  useEffect(() => {
    loadNotes();
  }, [tradeId]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 450,
          backgroundColor: "#251E17",
          borderRadius: 16,
          padding: 32,
          border: "1px solid rgba(212, 165, 69, 0.15)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#F5C76D" }}>Trade Notes</h2>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              backgroundColor: "rgba(37, 30, 23, 0.6)",
              color: "#C2B280",
              border: "1px solid rgba(212, 165, 69, 0.15)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a note..."
            style={{
              width: "100%",
              height: 100,
              backgroundColor: "rgba(37, 30, 23, 0.6)",
              color: "#C2B280",
              border: "1px solid rgba(212, 165, 69, 0.2)",
              borderRadius: 8,
              padding: 12,
              resize: "none",
              fontSize: 13,
              fontWeight: 500,
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={addNote}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "14px 0",
              backgroundColor: "#F5C76D",
              color: "#1D1A16",
              borderRadius: 8,
              cursor: "pointer",
              border: "none",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Add Note
          </button>
        </div>

        <div
          style={{
            maxHeight: 250,
            overflowY: "auto",
            borderTop: "1px solid rgba(212, 165, 69, 0.12)",
            paddingTop: 16,
          }}
        >
          {notes.length === 0 && (
            <div style={{ color: "#8B7355", fontSize: 13, textAlign: "center", padding: 20 }}>No notes yet.</div>
          )}

          {notes.map((n) => (
            <div
              key={n.id}
              style={{
                backgroundColor: "rgba(37, 30, 23, 0.4)",
                padding: 14,
                borderRadius: 10,
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                border: "1px solid rgba(212, 165, 69, 0.1)",
              }}
            >
              <div style={{ whiteSpace: "pre-wrap", color: "#C2B280", fontSize: 13, lineHeight: 1.5 }}>{n.text}</div>
              <button
                onClick={() => deleteNote((n as any).id)}
                style={{
                  marginLeft: 12,
                  background: "transparent",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
