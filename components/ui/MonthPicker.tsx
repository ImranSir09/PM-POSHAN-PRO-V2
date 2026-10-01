import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const MONTH_NAMES = [
    { short: 'Jan', full: 'January' },
    { short: 'Feb', full: 'February' },
    { short: 'Mar', full: 'March' },
    { short: 'Apr', full: 'April' },
    { short: 'May', full: 'May' },
    { short: 'Jun', full: 'June' },
    { short: 'Jul', full: 'July' },
    { short: 'Aug', full: 'August' },
    { short: 'Sep', full: 'September' },
    { short: 'Oct', full: 'October' },
    { short: 'Nov', full: 'November' },
    { short: 'Dec', full: 'December' },
];

export interface MonthPickerProps {
    id?: string;
    label?: string;
    value: string; // 'YYYY-MM'
    onChange: (value: string) => void;
    min?: string; // 'YYYY-MM'
    max?: string; // 'YYYY-MM'
    className?: string;
    containerClassName?: string;
    disabled?: boolean;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({
    id,
    label,
    value,
    onChange,
    min,
    max,
    className = '',
    containerClassName = '',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Parse current value
    const [selectedYear, selectedMonthIndex] = useMemo(() => {
        if (!value || !value.includes('-')) {
            const now = new Date();
            return [now.getFullYear(), now.getMonth()];
        }
        const [y, m] = value.split('-').map(Number);
        return [y || new Date().getFullYear(), (m ? m - 1 : new Date().getMonth())];
    }, [value]);

    const [viewingYear, setViewingYear] = useState<number>(selectedYear);

    // Sync viewing year when value changes
    useEffect(() => {
        setViewingYear(selectedYear);
    }, [selectedYear]);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const displayLabel = useMemo(() => {
        if (!value) return 'Select Month';
        const [y, m] = value.split('-').map(Number);
        if (!y || !m || m < 1 || m > 12) return value;
        return `${MONTH_NAMES[m - 1].full} ${y}`;
    }, [value]);

    const handleSelectMonth = (monthIndex: number) => {
        const monthStr = String(monthIndex + 1).padStart(2, '0');
        const formatted = `${viewingYear}-${monthStr}`;
        onChange(formatted);
        setIsOpen(false);
    };

    const handleToday = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        onChange(`${year}-${month}`);
        setViewingYear(year);
        setIsOpen(false);
    };

    const currentRealYear = new Date().getFullYear();
    const currentRealMonth = new Date().getMonth();

    return (
        <div className={`relative ${containerClassName}`} ref={pickerRef}>
            {label && (
                <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 ml-0.5">
                    {label}
                </label>
            )}
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => setIsOpen(prev => !prev)}
                className={`w-full bg-white dark:bg-slate-950 border text-left text-sm rounded-xl p-2.5 flex items-center justify-between transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                    isOpen
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2 truncate">
                    <Calendar size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-slate-900 dark:text-slate-100 font-medium truncate">
                        {displayLabel}
                    </span>
                </div>
                <ChevronDown
                    size={16}
                    className={`ml-2 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`}
                />
            </button>

            {isOpen && (
                <div
                    className="absolute z-50 mt-1.5 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3.5"
                    role="dialog"
                    aria-label="Month Picker"
                >
                    {/* Header: Year Navigation */}
                    <div className="flex items-center justify-between mb-3 px-1">
                        <button
                            type="button"
                            onClick={() => setViewingYear(prev => prev - 1)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Previous Year"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-wide">
                            {viewingYear}
                        </div>
                        <button
                            type="button"
                            onClick={() => setViewingYear(prev => prev + 1)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Next Year"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Months Grid */}
                    <div className="grid grid-cols-3 gap-1.5">
                        {MONTH_NAMES.map((m, idx) => {
                            const isSelected = viewingYear === selectedYear && idx === selectedMonthIndex;
                            const isCurrentRealMonth = viewingYear === currentRealYear && idx === currentRealMonth;

                            // Check min/max bounds
                            const monthKey = `${viewingYear}-${String(idx + 1).padStart(2, '0')}`;
                            const isDisabled = Boolean((min && monthKey < min) || (max && monthKey > max));

                            return (
                                <button
                                    key={m.short}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => handleSelectMonth(idx)}
                                    className={`py-2 px-1 text-xs rounded-xl font-medium transition-all relative ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                                            : isCurrentRealMonth
                                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    } ${isDisabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer'}`}
                                >
                                    {m.short}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer Quick Action */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                        <button
                            type="button"
                            onClick={handleToday}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                        >
                            Current Month
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthPicker;
