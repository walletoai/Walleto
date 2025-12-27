import { useMemo } from 'react';
import { createPortal } from 'react-dom';

interface UseWidgetControlsProps {
  widgetId?: string;
  controlElement: React.ReactNode;
}

/**
 * Hook to handle widget control portals with fallback
 * If the control div doesn't exist yet, it renders inline instead of using a portal
 */
export function useWidgetControls({ widgetId, controlElement }: UseWidgetControlsProps) {
  return useMemo(() => {
    if (!widgetId) {
      return controlElement;
    }

    const element = document.getElementById(`${widgetId}-controls`);

    if (element) {
      return createPortal(controlElement, element);
    }

    // Fallback: render inline if control div doesn't exist yet
    return controlElement;
  }, [widgetId, controlElement]);
}
