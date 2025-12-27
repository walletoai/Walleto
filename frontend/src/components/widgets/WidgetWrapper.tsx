import React, { forwardRef } from 'react';

interface WidgetWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    onMouseDown?: React.MouseEventHandler;
    onMouseUp?: React.MouseEventHandler;
    onTouchEnd?: React.TouchEventHandler;
}

export const WidgetWrapper = forwardRef<HTMLDivElement, WidgetWrapperProps>(
    ({ children, style, className, onMouseDown, onMouseUp, onTouchEnd, ...props }, ref) => {
        return (
            <div
                ref={ref}
                style={{ ...style, boxSizing: 'border-box' }}
                className={`card relative flex flex-col overflow-hidden ${className || ''}`}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onTouchEnd={onTouchEnd}
                {...props}
            >


                {/* Content */}
                <div className="flex-1 min-h-0 relative z-0 flex flex-col grow h-full" style={{ flexGrow: 1 }}>
                    {children}
                </div>
            </div>
        );
    }
);

WidgetWrapper.displayName = 'WidgetWrapper';
