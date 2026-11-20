import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    description?: string;
}

export interface SelectProps {
    id?: string;
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    className?: string;
    containerClassName?: string;
    placeholder?: string;
    disabled?: boolean;
    searchable?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    id,
    label,
    value,
    onChange,
    options,
    className = '',
    containerClassName = '',
    placeholder = 'Select an option',
    disabled = false,
    searchable = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = useMemo(() => {
        if (!searchable || !query.trim()) return options;
        const q = query.trim().toLowerCase();
        return options.filter(opt => opt.label.toLowerCase().includes(q));
    }, [options, searchable, query]);

    useEffect(() => {
        if (isOpen && searchable) {
            setTimeout(() => searchInputRef.current?.focus(), 30);
        }
        if (!isOpen) {
            setQuery('');
        }
    }, [isOpen, searchable]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

    return (
        <div className={`relative ${containerClassName}`} ref={dropdownRef}>
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
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={`truncate ${selectedOption ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    size={16}
                    className={`ml-2 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`}
                />
            </button>

            {isOpen && (
                <div
                    className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden modal-enter"
                    role="listbox"
                >
                    {searchable && (
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    )}
                    <div className="py-1 max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-center text-slate-400 dark:text-slate-500">
                                No matching options
                            </div>
                        ) : (
                            filteredOptions.map(option => {
                                const isSelected = option.value === value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${
                                            isSelected
                                                ? 'bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium'
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                        }`}
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        <div className="truncate pr-2">
                                            <div className="truncate">{option.label}</div>
                                            {option.description && (
                                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{option.description}</div>
                                            )}
                                        </div>
                                        {isSelected && <Check size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Select;
