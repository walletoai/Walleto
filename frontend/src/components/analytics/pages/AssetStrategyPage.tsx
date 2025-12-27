// src/components/analytics/pages/AssetStrategyPage.tsx
import React from "react";
import { WIDGET_REGISTRY, type WidgetType } from "../AnalyticsWidgetRegistry";
import { PlaceholderWidget } from "../PlaceholderWidget";

interface Props {
  widgetData: any;
  renderWidget: (id: WidgetType) => React.ReactNode;
  isEditMode: boolean;
  onRemoveWidget: (id: WidgetType) => void;
}

export const AssetStrategyPage: React.FC<Props> = ({
  widgetData,
  renderWidget,
  isEditMode,
  onRemoveWidget,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Row 1: Symbol Breakdown (1/2) + Setup Breakdown (1/2) */}
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("SYMBOL_BREAKDOWN")}
        </div>
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("SETUP_BREAKDOWN")}
        </div>

        {/* Row 2: Long vs Short (Full Width) */}
        <div className="md:col-span-3 min-h-[350px]">
          {renderWidget("LONG_SHORT_PERFORMANCE")}
        </div>

        {/* Row 3: Confluence Score (Full Width) */}
        <div className="md:col-span-3 min-h-[350px]">
          {renderWidget("CONFLUENCE_SCORE_OUTCOME")}
        </div>
      </div>
    </>
  );
};
