import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, CartesianGrid } from 'recharts';
import Card from '../ui/Card';
import { useData } from '../../hooks/useData';
import { useTheme } from '../../hooks/useTheme';
import { DailyEntry } from '../../types';
import { useToast } from '../../hooks/useToast';
import IllustrationCard from '../ui/IllustrationCard';
import Skeleton from '../ui/Skeleton';
import DailyEntryPage from './DailyEntry';
import { calculateMonthlySummary } from '../../services/summaryCalculator';

const CustomTooltip = React.memo(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const isSunday = payload[0]?.payload?.date?.getDay() === 0;
        return (
            <div className="bg-white/95 dark:bg-slate-900/95 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs shadow-lg backdrop-blur-sm space-y-0.5">
                <p className="text-slate-900 dark:text-slate-100 font-semibold mb-1">
                    Day {label}
                    {isSunday && <span className="text-rose-500 ml-1.5 font-medium">(Sunday)</span>}
                </p>
                <p className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" />Balvatika</span>
                    <span className="font-medium tabular-nums">{payload[0]?.value ?? 0}</span>
                </p>
                <p className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" />Primary</span>
                    <span className="font-medium tabular-nums">{payload[1]?.value ?? 0}</span>
                </p>
                <p className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500" />Middle</span>
                    <span className="font-medium tabular-nums">{payload[2]?.value ?? 0}</span>
                </p>
                <p className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-slate-100 dark:border-slate-800 font-semibold text-slate-900 dark:text-white">
                    <span>Total</span>
                    <span className="tabular-nums">{payload[0]?.payload?.total ?? 0}</span>
                </p>
            </div>
        );
    }
    return null;
});

CustomTooltip.displayName = 'CustomTooltip';

const Dashboard: React.FC = React.memo(() => {
    const { data } = useData();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const { settings } = data;
    const { mdmIncharge } = settings;

    const [isLoading, setIsLoading] = useState(true);

    const isDarkMode = useMemo(() => {
        if (theme === 'dark') return true;
        if (theme === 'light') return false;
        return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }, [theme]);

    // Daily Entry Reminder
    useEffect(() => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const entryExists = data.entries.some(e => e.id === todayStr);

        if (!entryExists && now.getHours() >= 15) {
            showToast("Reminder: Don't forget to add today's meal entry.", 'info');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const displayedMonthKey = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    const dashboardData = useMemo(() => {
        const summary = calculateMonthlySummary(data, displayedMonthKey);
        const { totals, monthEntries } = summary;

        const entriesMap = new Map<string, DailyEntry>();
        for (const entry of monthEntries) {
            entriesMap.set(entry.id, entry);
        }

        const currentDate = new Date(displayedMonthKey + '-02T00:00:00');
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const chartData: { name: string; date: Date; balvatika: number; primary: number; middle: number; total: number }[] = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const entry = entriesMap.get(dateString);

            chartData.push({
                name: `${i}`,
                date,
                balvatika: entry?.present.balvatika || 0,
                primary: entry?.present.primary || 0,
                middle: entry?.present.middle || 0,
                total: entry?.totalPresent || 0,
            });
        }

        return {
            totalExpenditure: totals.expenditure,
            totalRice: totals.rice,
            mealDays: monthEntries.filter(e => e.totalPresent > 0).length,
            monthlyData: chartData,
        };
    }, [data.entries, data.settings, displayedMonthKey, data.receipts, data.monthlyBalances]);

    useEffect(() => {
        if (dashboardData) {
            setIsLoading(false);
        }
    }, [dashboardData]);

    const axisTickColor = isDarkMode ? '#94a3b8' : '#64748b';
    const axisLineColor = isDarkMode ? '#1e293b' : '#e2e8f0';
    const gridStrokeColor = isDarkMode ? '#1e293b' : '#f1f5f9';

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-14" />
                <Skeleton className="h-28" />
                <Skeleton className="h-24" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <IllustrationCard inchargeName={mdmIncharge?.name} inchargeContact={mdmIncharge?.contact} />

            <DailyEntryPage />

            <Card title="This Month's Totals">
                <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-slate-800/80 text-center">
                    <div className="px-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Meal Days</p>
                        <p className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 tabular-nums">
                            {dashboardData.mealDays}
                        </p>
                    </div>
                    <div className="px-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Expenditure</p>
                        <p className="text-lg sm:text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
                            ₹{dashboardData.totalExpenditure.toFixed(2)}
                        </p>
                    </div>
                    <div className="px-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Rice Used</p>
                        <p className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 tabular-nums">
                            {dashboardData.totalRice.toFixed(3)} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">kg</span>
                        </p>
                    </div>
                </div>
            </Card>

            <Card title="Daily Attendance">
                <div style={{ width: '100%', height: 210 }}>
                    <ResponsiveContainer>
                        <BarChart data={dashboardData.monthlyData} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStrokeColor} />
                            <XAxis
                                dataKey="name"
                                ticks={['1', '5', '10', '15', '20', '25', '30']}
                                tick={{ fill: axisTickColor, fontSize: 10 }}
                                axisLine={{ stroke: axisLineColor }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: axisTickColor, fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ fill: isDarkMode ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.07)' }}
                            />

                            {dashboardData.monthlyData.map((entry, index) => {
                                if (entry.date.getDay() === 0 && entry.total === 0) {
                                    return (
                                        <ReferenceLine
                                            key={`sunday-ref-${index}`}
                                            x={entry.name}
                                            stroke="rgba(244, 63, 94, 0.35)"
                                            strokeDasharray="2 2"
                                        />
                                    );
                                }
                                return null;
                            })}

                            <Bar dataKey="balvatika" stackId="a" fill="#94a3b8" barSize={9}>
                                {dashboardData.monthlyData.map((entry, index) => (
                                    <Cell key={`cell-bal-${index}`} fill={entry.date.getDay() === 0 ? '#f43f5e' : '#94a3b8'} />
                                ))}
                            </Bar>
                            <Bar dataKey="primary" stackId="a" fill="#6366f1" barSize={9}>
                                {dashboardData.monthlyData.map((entry, index) => (
                                    <Cell key={`cell-pri-${index}`} fill={entry.date.getDay() === 0 ? '#f43f5e' : '#6366f1'} />
                                ))}
                            </Bar>
                            <Bar dataKey="middle" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={9}>
                                {dashboardData.monthlyData.map((entry, index) => (
                                    <Cell key={`cell-mid-${index}`} fill={entry.date.getDay() === 0 ? '#f43f5e' : '#8b5cf6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" />Balvatika</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />Primary</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" />Middle</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" />Sunday</span>
                </div>
            </Card>
        </div>
    );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
