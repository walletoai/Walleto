// src/components/analytics/pages/MarketConditionsPage.tsx
import React from "react";
import { WIDGET_REGISTRY, type WidgetType } from "../AnalyticsWidgetRegistry";
import { PlaceholderWidget } from "../PlaceholderWidget";

interface Props {
  widgetData: any;
  renderWidget: (id: WidgetType) => React.ReactNode;
  isEditMode: boolean;
  onRemoveWidget: (id: WidgetType) => void;
}

export const MarketConditionsPage: React.FC<Props> = ({
  widgetData,
  renderWidget,
  isEditMode,
  onRemoveWidget,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Row 1: Volatility vs Performance (1/2) + Correlation Matrix (1/2) */}
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("VOLATILITY_VS_PERFORMANCE")}
        </div>
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("CORRELATION_MATRIX")}
        </div>

        {/* Row 2: Full Width - Multi-layer Candle Map */}
        <div className="md:col-span-3 min-h-[550px]">
          {renderWidget("MULTI_LAYER_CANDLE_MAP")}
        </div>

        {/* Row 3: Funding Rate Bias (1/2) + Distance from ATH (1/2) */}
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("FUNDING_RATE_BIAS")}
        </div>
        <div className="md:col-span-1.5 min-h-[350px]">
          {renderWidget("DISTANCE_FROM_ATH")}
        </div>

        {/* Row 4: Full Width - RSI Outcome */}
        <div className="md:col-span-3 min-h-[550px]">
          {renderWidget("OVERBOUGHT_OVERSOLD_OUTCOME")}
        </div>
      </div>
    </>
  );
};
