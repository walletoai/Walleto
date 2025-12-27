export default function NavButton({ label, active, onClick }) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: "10px 18px",
          borderRadius: 10,
          background: active ? "#1e88e5" : "#333",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  }
  