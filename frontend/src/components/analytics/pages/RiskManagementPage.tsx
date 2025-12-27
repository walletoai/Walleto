// src/components/analytics/pages/RiskManagementPage.tsx
import React from "react";
import { WIDGET_REGISTRY, type WidgetType } from "../AnalyticsWidgetRegistry";
import { PlaceholderWidget } from "../PlaceholderWidget";

interface Props {
  widgetData: any;
  renderWidget: (id: WidgetType) => React.ReactNode;
  isEditMode: boolean;
  onRemoveWidget: (id: WidgetType) => void;
}

export const RiskManagementPage: React.FC<Props> = ({
  widgetData,
  renderWidget,
  isEditMode,
  onRemoveWidget,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Row 1: Full Width - Risk Metrics Summary */}
        <div className="md:col-span-3 min-h-[200px]">
          {renderWidget("RISK_METRICS_SUMMARY")}
        </div>

        {/* Row 2: Risk vs Reward (1/2) + Exposure Heatmap (1/2) */}
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("RISK_REWARD_SCATTER")}
        </div>
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("EXPOSURE_HEATMAP")}
        </div>

        {/* Row 3: Leverage Impact (1/2) + Position Size Accuracy (1/2) */}
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("LEVERAGE_IMPACT")}
        </div>
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("POSITION_SIZE_ACCURACY")}
        </div>

        {/* Row 4: TP vs SL Hit Ratio (1/2) + Stop Loss Distance (1/2) */}
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("TP_VS_SL_HIT_RATIO")}
        </div>
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("STOP_LOSS_DISTANCE")}
        </div>
      </div>
    </>
  );
};
