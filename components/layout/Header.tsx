import React, { useState } from 'react';
import { Bell, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationPanel from '../ui/NotificationPanel';
import { useAuth } from '../../hooks/useAuth';

const Header: React.FC = () => {
    const { data } = useData();
    const { theme, setTheme } = useTheme();
    const { logout } = useAuth();
    const { notifications, dismissNotification, dismissAllNotifications, handleNotificationAction } = useNotifications();
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const toggleTheme = () => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
    };

    const renderThemeIcon = () => {
        if (theme === 'light') return <Sun size={18} />;
        if (theme === 'dark') return <Moon size={18} />;
        return <Monitor size={18} />;
    };

    const themeLabel = `Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} mode`;

    return (
        <>
            {isPanelOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-30"
                    onClick={() => setIsPanelOpen(false)}
                    aria-hidden="true"
                />
            )}
            <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="container mx-auto max-w-3xl h-full px-3 sm:px-5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white truncate leading-tight">
                            {data.settings.schoolDetails.name || 'PM Poshan Pro'}
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                            PM Poshan Pro
                        </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsPanelOpen(prev => !prev)}
                                className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors relative"
                                aria-label="Toggle notifications"
                            >
                                <Bell size={18} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold tabular-nums flex items-center justify-center">
                                        {notifications.length}
                                    </span>
                                )}
                            </button>
                            {isPanelOpen && (
                                <NotificationPanel
                                    notifications={notifications}
                                    onDismiss={dismissNotification}
                                    onDismissAll={dismissAllNotifications}
                                    onAction={handleNotificationAction}
                                    onClose={() => setIsPanelOpen(false)}
                                />
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                            aria-label={themeLabel}
                            title={themeLabel}
                        >
                            {renderThemeIcon()}
                        </button>

                        <button
                            type="button"
                            onClick={logout}
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                            aria-label="Logout"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;