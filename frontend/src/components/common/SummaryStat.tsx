export default function SummaryStat({ label, value }) {
    return (
      <div
        style={{
          background: "#111",
          padding: 15,
          borderRadius: 12,
          color: "white",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 14, color: "#999" }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
      </div>
    );
  }
  