// src/components/analytics/pages/ExecutionQualityPage.tsx
import React from "react";
import { WIDGET_REGISTRY, type WidgetType } from "../AnalyticsWidgetRegistry";
import { PlaceholderWidget } from "../PlaceholderWidget";

interface Props {
  widgetData: any;
  renderWidget: (id: WidgetType) => React.ReactNode;
  isEditMode: boolean;
  onRemoveWidget: (id: WidgetType) => void;
}

export const ExecutionQualityPage: React.FC<Props> = ({
  widgetData,
  renderWidget,
  isEditMode,
  onRemoveWidget,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Row 1: Full Width - Trade Quality Index */}
        <div className="md:col-span-3 min-h-[300px]">
          {renderWidget("TRADE_QUALITY_INDEX")}
        </div>

        {/* Row 2: Slippage Analysis (1/2) + Entry Efficiency (1/2) */}
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("SLIPPAGE_ANALYSIS")}
        </div>
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("ENTRY_EFFICIENCY")}
        </div>

        {/* Row 3: Liquidity vs Entry (1/2) + Reaction Time (1/2) */}
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("LIQUIDITY_VS_ENTRY")}
        </div>
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("REACTION_TIME_HISTOGRAM")}
        </div>
      </div>
    </>
  );
};
