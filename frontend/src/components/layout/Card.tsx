export default function Card({ children, style = {} }) {
    return (
      <div
        style={{
          background: "#111",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 0 12px rgba(0,0,0,0.5)",
          width: "100%",
          minWidth: 0,
          ...style,
        }}
      >
        {children}
      </div>
    );
  }
  