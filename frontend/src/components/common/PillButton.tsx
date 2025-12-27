export default function PillButton({ label, active, onClick }) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: "8px 16px",
          borderRadius: 20,
          background: active ? "#1e88e5" : "#444",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  }
  