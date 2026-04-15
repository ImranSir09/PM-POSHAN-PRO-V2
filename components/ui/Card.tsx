
import React, { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    title?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
    return (
        <div className={`card-container ${className}`}>
            {title && <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{title}</h2>}
            {children}
        </div>
    );
};

export default Card;
