type Props = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export default function CardHeader({ title, subtitle, action }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: subtitle ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#fff" }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
