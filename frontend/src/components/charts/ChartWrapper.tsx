export default function ChartWrapper({ children }) {
    return (
      <div
        style={{
          width: "100%",
          minWidth: 0,
          overflow: "hidden",
          background: "#111",
          padding: 20,
          borderRadius: 12,
        }}
      >
        {children}
      </div>
    );
  }
  