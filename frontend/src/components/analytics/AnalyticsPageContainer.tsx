// src/components/analytics/AnalyticsPageContainer.tsx
import React from "react";
import { type AnalyticsPageType } from "./AnalyticsPageNavigation";
import { CorePerformancePage } from "./pages/CorePerformancePage";
import { AssetStrategyPage } from "./pages/AssetStrategyPage";
import { TimingPatternsPage } from "./pages/TimingPatternsPage";
import { RiskManagementPage } from "./pages/RiskManagementPage";
import { ExecutionQualityPage } from "./pages/ExecutionQualityPage";
import { MarketConditionsPage } from "./pages/MarketConditionsPage";
import { WIDGET_REGISTRY, type WidgetType } from "./AnalyticsWidgetRegistry";

interface Props {
  widgetData: any;
  activeWidgets: WidgetType[];
  isEditMode: boolean;
  onRemoveWidget: (id: WidgetType) => void;
  renderWidget: (id: WidgetType) => React.ReactNode;
  activePage: AnalyticsPageType;
  onPageChange: (page: AnalyticsPageType) => void;
}

export const AnalyticsPageContainer: React.FC<Props> = ({
  widgetData,
  activeWidgets,
  isEditMode,
  onRemoveWidget,
  renderWidget,
  activePage,
  onPageChange,
}) => {

  const renderPageContent = () => {
    const props = {
      widgetData,
      renderWidget,
      isEditMode,
      onRemoveWidget,
    };

    switch (activePage) {
      case "performance":
        return <CorePerformancePage {...props} />;
      case "strategy":
        return <AssetStrategyPage {...props} />;
      case "timing":
        return <TimingPatternsPage {...props} />;
      case "risk":
        return <RiskManagementPage {...props} />;
      case "execution":
        return <ExecutionQualityPage {...props} />;
      case "market":
        return <MarketConditionsPage {...props} />;
      default:
        return <CorePerformancePage {...props} />;
    }
  };

  return (
    <div>
      {renderPageContent()}
    </div>
  );
};
