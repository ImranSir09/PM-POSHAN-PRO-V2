import React, { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    title?: ReactNode;
}

const Card: React.FC<CardProps> = React.memo(({ children, className = '', title }) => {
    return (
        <div className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5 ${className}`}>
            {title && (
                <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-3.5">
                    {title}
                </h2>
            )}
            {children}
        </div>
    );
});

Card.displayName = 'Card';

export default Card;
