import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface DatePickerProps {
    id?: string;
    label?: string;
    value: string; // 'YYYY-MM-DD'
    onChange: (value: string) => void;
    min?: string; // 'YYYY-MM-DD'
    max?: string; // 'YYYY-MM-DD'
    className?: string;
    containerClassName?: string;
    placeholder?: string;
    disabled?: boolean;
}

const formatDateKey = (year: number, monthIndex: number, day: number): string =>
    `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const DatePicker: React.FC<DatePickerProps> = ({
    id,
    label,
    value,
    onChange,
    min,
    max,
    className = '',
    containerClassName = '',
    placeholder = 'Select Date',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    const todayKey = useMemo(() => {
        const now = new Date();
        return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    const [selectedYear, selectedMonthIndex] = useMemo(() => {
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [y, m] = value.split('-').map(Number);
            if (y && m >= 1 && m <= 12) return [y, m - 1];
        }
        const now = new Date();
        return [now.getFullYear(), now.getMonth()];
    }, [value]);

    const [viewingYear, setViewingYear] = useState<number>(selectedYear);
    const [viewingMonth, setViewingMonth] = useState<number>(selectedMonthIndex);

    useEffect(() => {
        setViewingYear(selectedYear);
        setViewingMonth(selectedMonthIndex);
    }, [selectedYear, selectedMonthIndex]);

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
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return placeholder;
        const parsed = new Date(`${value}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return value;
        return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }, [value, placeholder]);

    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(viewingYear, viewingMonth, 1).getDay();
        const daysInMonth = new Date(viewingYear, viewingMonth + 1, 0).getDate();
        const cells: Array<{ day: number; dateKey: string; isSunday: boolean } | null> = [];

        for (let i = 0; i < firstDayOfMonth; i++) {
            cells.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = formatDateKey(viewingYear, viewingMonth, day);
            const dayOfWeek = (firstDayOfMonth + day - 1) % 7;
            cells.push({ day, dateKey, isSunday: dayOfWeek === 0 });
        }
        return cells;
    }, [viewingYear, viewingMonth]);

    const handlePrevMonth = () => {
        if (viewingMonth === 0) {
            setViewingMonth(11);
            setViewingYear(y => y - 1);
        } else {
            setViewingMonth(m => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewingMonth === 11) {
            setViewingMonth(0);
            setViewingYear(y => y + 1);
        } else {
            setViewingMonth(m => m + 1);
        }
    };

    const handleSelectDate = (dateKey: string) => {
        onChange(dateKey);
        setIsOpen(false);
    };

    const isTodayDisabled = Boolean((min && todayKey < min) || (max && todayKey > max));

    return (
        <div className={`relative ${containerClassName}`} ref={pickerRef}>
            {label && (
                <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">
                    {label}
                </label>
            )}
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => setIsOpen(prev => !prev)}
                className={`w-full min-h-[42px] bg-white dark:bg-slate-950 border text-left text-sm rounded-xl px-3 py-2 flex items-center justify-between transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                    isOpen
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2 truncate">
                    <Calendar size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className={`truncate tabular-nums ${value ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
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
                    className="absolute left-0 z-50 mt-1.5 w-[296px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3.5 modal-enter"
                    role="dialog"
                    aria-label="Date Picker"
                >
                    <div className="flex items-center justify-between mb-3 px-0.5">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Previous Month"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                            {MONTH_NAMES[viewingMonth]} {viewingYear}
                        </div>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Next Month"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-1 text-center">
                        {WEEKDAYS.map((wd, i) => (
                            <div
                                key={wd}
                                className={`text-[11px] font-semibold py-1 ${
                                    i === 0
                                        ? 'text-rose-500 dark:text-rose-400'
                                        : 'text-slate-400 dark:text-slate-500'
                                }`}
                            >
                                {wd}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((cell, idx) => {
                            if (!cell) {
                                return <div key={`empty-${idx}`} className="h-9" />;
                            }
                            const isSelected = cell.dateKey === value;
                            const isToday = cell.dateKey === todayKey;
                            const isDisabled = Boolean((min && cell.dateKey < min) || (max && cell.dateKey > max));

                            return (
                                <button
                                    key={cell.dateKey}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => handleSelectDate(cell.dateKey)}
                                    className={`h-9 w-full text-xs rounded-xl font-medium tabular-nums transition-colors flex items-center justify-center ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                                            : isToday
                                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                                            : cell.isSunday
                                            ? 'text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    } ${isDisabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer'}`}
                                >
                                    {cell.day}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                        <button
                            type="button"
                            disabled={isTodayDisabled}
                            onClick={() => handleSelectDate(todayKey)}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Today
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

export default DatePicker;
