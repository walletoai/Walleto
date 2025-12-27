// src/components/analytics/pages/CorePerformancePage.tsx
import React from "react";
import { WIDGET_REGISTRY, type WidgetType } from "../AnalyticsWidgetRegistry";
import { PlaceholderWidget } from "../PlaceholderWidget";

interface Props {
  widgetData: any;
  renderWidget: (id: WidgetType) => React.ReactNode;
  isEditMode: boolean;
  onRemoveWidget: (id: WidgetType) => void;
}

export const CorePerformancePage: React.FC<Props> = ({
  widgetData,
  renderWidget,
  isEditMode,
  onRemoveWidget,
}) => {
  // Widget layout definitions with grid spans
  const layouts: Array<{
    widgets: WidgetType[];
    span?: "full" | "2/3" | "1/3" | "1/2";
  }> = [
    // Row 1: Performance Summary (Full Width)
    { widgets: ["PERFORMANCE_SUMMARY"], span: "full" },
    // Row 2: Equity Curve (2/3) + Drawdown (1/3)
    { widgets: ["EQUITY_CURVE"], span: "2/3" },
    { widgets: ["DRAWDOWN"], span: "1/3" },
    // Row 3: Daily PnL (1/2) + Trade Outcomes (1/2)
    { widgets: ["DAILY_PNL"], span: "1/2" },
    { widgets: ["TRADE_OUTCOME_DISTRIBUTION"], span: "1/2" },
    // Row 4: Monthly Heatstick (Full Width)
    { widgets: ["MONTHLY_HEATSTICK"], span: "full" },
  ];

  const getColSpanClass = (span?: "full" | "2/3" | "1/3" | "1/2") => {
    switch (span) {
      case "full":
        return "md:col-span-3";
      case "2/3":
        return "md:col-span-2";
      case "1/3":
        return "md:col-span-1";
      case "1/2":
        return "md:col-span-1.5";
      default:
        return "md:col-span-1";
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Row 1: Full Width - Performance Summary */}
        <div className="md:col-span-3 min-h-[300px]">{renderWidget("PERFORMANCE_SUMMARY")}</div>

        {/* Row 2: Drawdown (Full Width) */}
        <div className="md:col-span-3 min-h-[350px]">{renderWidget("DRAWDOWN")}</div>

        {/* Row 3: Daily PnL (1/2) + Trade Outcomes (1/2) */}
        <div className="md:col-span-1.5 min-h-[300px]">{renderWidget("DAILY_PNL")}</div>
        <div className="md:col-span-1.5 min-h-[300px]">{renderWidget("TRADE_OUTCOME_DISTRIBUTION")}</div>

        {/* Row 4: Full Width - Monthly Heatstick */}
        <div className="md:col-span-3 min-h-[350px]">
          {renderWidget("MONTHLY_HEATSTICK")}
        </div>
      </div>
    </>
  );
};
