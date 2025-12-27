export default function Input({ label, value, onChange, type = "text" }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={{ fontSize: 14, color: "#aaa" }}>{label}</label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            padding: 10,
            background: "#222",
            borderRadius: 8,
            border: "1px solid #333",
            color: "white",
          }}
        />
      </div>
    );
  }
  