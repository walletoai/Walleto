// src/components/analytics/PlaceholderWidget.tsx
import React from "react";

interface Props {
  title: string;
  description: string;
}

export const PlaceholderWidget: React.FC<Props> = ({ title, description }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-12 px-6 rounded-lg border border-dashed border-leather-700/40 bg-leather-900/20">
      <div className="w-12 h-12 rounded-full bg-leather-800/50 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-leather-accent/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m0 0h6m-6-6H6m0 0H0"
          />
        </svg>
      </div>
      <h3 className="text-lg font-serif text-leather-accent/70 text-center mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 text-center max-w-xs">{description}</p>
    </div>
  );
};
