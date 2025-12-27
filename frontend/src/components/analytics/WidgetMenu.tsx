import React from 'react';
import { WIDGET_REGISTRY, type WidgetType } from './AnalyticsWidgetRegistry';

interface WidgetMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onAddWidget: (widgetId: WidgetType) => void;
    activeWidgets: WidgetType[];
}

export const WidgetMenu: React.FC<WidgetMenuProps> = ({ isOpen, onClose, onAddWidget, activeWidgets }) => {
    if (!isOpen) return null;

    const categories = Array.from(new Set(Object.values(WIDGET_REGISTRY).map(w => w.category)));

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#161616] border border-leather-700 rounded-xl w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-leather-900/20 to-transparent">
                    <div>
                        <h2 className="text-3xl font-serif text-leather-accent">Widget Library</h2>
                        <p className="text-gray-400 text-sm mt-1">Customize your dashboard with advanced analytics modules.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {categories.map(category => (
                        <div key={category} className="mb-10">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-1 h-6 bg-leather-500 rounded-full"></span>
                                {category}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {Object.values(WIDGET_REGISTRY)
                                    .filter(w => w.category === category)
                                    .map(widget => {
                                        const isActive = activeWidgets.includes(widget.id);
                                        return (
                                            <button
                                                key={widget.id}
                                                onClick={() => {
                                                    if (!isActive) {
                                                        onAddWidget(widget.id);
                                                        onClose();
                                                    }
                                                }}
                                                disabled={isActive}
                                                className={`text-left rounded-xl border transition-all duration-300 group relative overflow-hidden flex flex-col h-full
                          ${isActive
                                                        ? 'bg-leather-900/20 border-leather-700/30 opacity-60 grayscale cursor-not-allowed'
                                                        : 'bg-black/40 border-white/5 hover:border-leather-500 hover:bg-leather-900/10 hover:shadow-[0_0_20px_rgba(212,175,55,0.1)] hover:-translate-y-1'
                                                    }`}
                                            >
                                                {/* Preview Image Area */}
                                                <div className="h-32 bg-black/50 w-full relative overflow-hidden border-b border-white/5 group-hover:border-leather-500/30 transition-colors">
                                                    {widget.image ? (
                                                        <img src={widget.image} alt={widget.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-leather-700 group-hover:text-leather-500 transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-50" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                                                                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                                                            </svg>
                                                        </div>
                                                    )}

                                                    {isActive && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                            <span className="text-white font-bold text-sm uppercase tracking-wider border border-white/20 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">Added</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-4 flex-1 flex flex-col">
                                                    <div className="font-bold text-gray-200 group-hover:text-leather-accent mb-2 text-lg">{widget.title}</div>
                                                    <div className="text-xs text-gray-500 leading-relaxed">{widget.description}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
