// src/components/analytics/pages/TimingPatternsPage.tsx
import React from "react";
import { WIDGET_REGISTRY, type WidgetType } from "../AnalyticsWidgetRegistry";

interface Props {
  widgetData: any;
  renderWidget: (id: WidgetType) => React.ReactNode;
  isEditMode: boolean;
  onRemoveWidget: (id: WidgetType) => void;
}

export const TimingPatternsPage: React.FC<Props> = ({
  widgetData,
  renderWidget,
  isEditMode,
  onRemoveWidget,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Row 1: Full Width - Win Rate Timeline */}
        <div className="md:col-span-3 min-h-[350px]">
          {renderWidget("WIN_RATE_TIMELINE")}
        </div>

        {/* Row 2: Time of Day (1/2) + Day of Week (1/2) */}
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("TIME_OF_DAY_PROFITABILITY")}
        </div>
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("DAY_OF_WEEK_PROFITABILITY")}
        </div>

        {/* Row 3: Freq vs PnL (1/2) + Holding Time (1/2) */}
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("TRADE_FREQUENCY_VS_PNL")}
        </div>
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("HOLDING_TIME_VS_PROFIT")}
        </div>

        {/* Row 4: Full Width - Streaks */}
        <div className="md:col-span-3 min-h-[350px]">
          {renderWidget("CONSECUTIVE_WINS_LOSSES")}
        </div>

        {/* Row 5: Full Width - Regime Detection */}
        <div className="md:col-span-3 min-h-[350px]">
          {renderWidget("REGIME_DETECTION")}
        </div>
      </div>
    </>
  );
};
