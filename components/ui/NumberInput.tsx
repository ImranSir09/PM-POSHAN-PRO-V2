import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface NumberInputProps {
    label: string;
    id: string;
    value: number;
    onChange: (newValue: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, id, value, onChange, min = 0, max, step = 1, disabled = false }) => {
    const handleIncrement = () => {
        const newValue = parseFloat((value + step).toPrecision(15));
        if (max === undefined || newValue <= max) {
            onChange(newValue);
        }
    };

    const handleDecrement = () => {
        const newValue = parseFloat((value - step).toPrecision(15));
        if (min === undefined || newValue >= min) {
            onChange(newValue);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numValue = parseFloat(e.target.value);
        if (isNaN(numValue)) {
            onChange(min);
            return;
        }

        let finalValue = numValue;
        if (max !== undefined && finalValue > max) finalValue = max;
        if (min !== undefined && finalValue < min) finalValue = min;
        
        onChange(finalValue);
    };

    return (
        <div>
            <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5 truncate">
                {label}
            </label>
            <div className="flex items-stretch shadow-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all">
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={disabled || value <= min}
                    className="min-w-[38px] min-h-[42px] px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                    aria-label={`Decrease ${label}`}
                >
                    <Minus size={14} />
                </button>
                <input
                    id={id}
                    type="number"
                    value={value}
                    onChange={handleChange}
                    min={min}
                    max={max}
                    step={step}
                    disabled={disabled}
                    className="w-full min-w-0 bg-transparent text-slate-900 dark:text-slate-100 text-sm font-medium text-center tabular-nums px-1.5 py-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={disabled || (max !== undefined && value >= max)}
                    className="min-w-[38px] min-h-[42px] px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                    aria-label={`Increase ${label}`}
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};

export default NumberInput;
