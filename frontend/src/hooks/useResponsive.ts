import { useState, useEffect, useCallback } from 'react';

export interface Breakpoints {
  isMobile: boolean;      // < 768px
  isTablet: boolean;      // 768px - 1024px
  isDesktop: boolean;     // >= 1024px
  isLargeDesktop: boolean; // >= 1440px
  screenWidth: number;
}

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
} as const;

export function useResponsive(): Breakpoints {
  const getBreakpoints = useCallback((): Breakpoints => {
    if (typeof window === 'undefined') {
      // SSR fallback - assume desktop
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
        screenWidth: 1200,
      };
    }

    const width = window.innerWidth;
    return {
      isMobile: width < BREAKPOINTS.mobile,
      isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
      isDesktop: width >= BREAKPOINTS.tablet,
      isLargeDesktop: width >= BREAKPOINTS.desktop,
      screenWidth: width,
    };
  }, []);

  const [breakpoints, setBreakpoints] = useState<Breakpoints>(getBreakpoints);

  useEffect(() => {
    // Update on mount to get correct client-side values
    setBreakpoints(getBreakpoints());

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      // Debounce resize events for performance
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setBreakpoints(getBreakpoints());
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [getBreakpoints]);

  return breakpoints;
}

// Utility function for responsive values
export function responsive<T>(
  breakpoints: Breakpoints,
  values: { mobile?: T; tablet?: T; desktop?: T; default: T }
): T {
  if (breakpoints.isMobile && values.mobile !== undefined) {
    return values.mobile;
  }
  if (breakpoints.isTablet && values.tablet !== undefined) {
    return values.tablet;
  }
  if (breakpoints.isDesktop && values.desktop !== undefined) {
    return values.desktop;
  }
  return values.default;
}
