import React from 'react';
import { Home, BarChart3, ArrowDownToLine, FileText, Settings } from 'lucide-react';
import { Page } from '../../types';

interface NavButtonProps {
    icon: React.ReactElement;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, isActive, onClick }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative flex flex-col items-center justify-center w-full h-16 text-[11px] font-medium transition-colors ${
                isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            aria-current={isActive ? 'page' : undefined}
        >
            <span
                aria-hidden="true"
                className={`absolute top-0 h-0.5 w-8 rounded-b-full transition-all duration-200 ${
                    isActive ? 'bg-indigo-600 dark:bg-indigo-400 opacity-100' : 'opacity-0'
                }`}
            />
            <div className={`transition-transform duration-150 ${isActive ? 'scale-105' : ''}`}>
                {icon}
            </div>
            <span className="mt-1 whitespace-nowrap tracking-tight">{label}</span>
        </button>
    );
};

interface NavigationProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage, setCurrentPage }) => {
    const navItems: Array<{ id: Page; label: string; icon: React.ReactElement }> = [
        { id: 'dashboard', label: 'Home', icon: <Home size={20} strokeWidth={currentPage === 'dashboard' ? 2.25 : 1.85} /> },
        { id: 'summary', label: 'Summary', icon: <BarChart3 size={20} strokeWidth={currentPage === 'summary' ? 2.25 : 1.85} /> },
        { id: 'receipts', label: 'Receipts', icon: <ArrowDownToLine size={20} strokeWidth={currentPage === 'receipts' ? 2.25 : 1.85} /> },
        { id: 'reports', label: 'Reports', icon: <FileText size={20} strokeWidth={currentPage === 'reports' ? 2.25 : 1.85} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={20} strokeWidth={currentPage === 'settings' ? 2.25 : 1.85} /> },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80">
            <div className="max-w-3xl mx-auto grid grid-cols-5 items-center">
                {navItems.map(item => (
                    <NavButton
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        isActive={currentPage === item.id}
                        onClick={() => setCurrentPage(item.id)}
                    />
                ))}
            </div>
        </nav>
    );
};

export default Navigation;
