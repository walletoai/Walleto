import React from 'react';

interface WidgetGridProps {
    children: React.ReactNode;
}

export const WidgetGrid: React.FC<WidgetGridProps> = ({ children }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
            {children}
        </div>
    );
};
