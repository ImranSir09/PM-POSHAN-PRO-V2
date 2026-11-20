import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    id: string;
    containerClassName?: string;
}

const Input: React.FC<InputProps> = ({ label, id, containerClassName = '', className, ...props }) => {
    const baseClasses = "w-full min-h-[42px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 block px-3 py-2 placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-150 shadow-sm tabular-nums";
    return (
        <div className={containerClassName}>
            <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">
                {label}
            </label>
            <input id={id} className={`${baseClasses} ${className || ''}`} {...props} />
        </div>
    );
};

export default Input;
