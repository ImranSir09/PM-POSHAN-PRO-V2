import React, { useState, ReactNode, createContext, useContext } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionContextType {
    activeId: string | null;
    toggleItem: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextType>({
    activeId: null,
    toggleItem: () => {},
});

export const Accordion: React.FC<{ children: ReactNode; defaultOpenId?: string | null }> = ({ children, defaultOpenId = null }) => {
    const [activeId, setActiveId] = useState<string | null>(defaultOpenId);
    
    const toggleItem = (id: string) => {
        setActiveId(prevId => (prevId === id ? null : id));
    };

    return <AccordionContext.Provider value={{ activeId, toggleItem }}>{children}</AccordionContext.Provider>;
};

export const AccordionItem: React.FC<{ id: string; title: ReactNode; children: ReactNode }> = ({ id, title, children }) => {
    const { activeId, toggleItem } = useContext(AccordionContext);
    const isOpen = activeId === id;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden transition-colors shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <button
                type="button"
                onClick={() => toggleItem(id)}
                className="w-full flex justify-between items-center px-5 py-4 text-left font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                aria-expanded={isOpen}
                aria-controls={`content-${id}`}
            >
                <span className="flex-1 tracking-tight">{title}</span>
                <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''}`}
                />
            </button>
            <div
                id={`content-${id}`}
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800/70">
                    {children}
                </div>
            </div>
        </div>
    );
};
