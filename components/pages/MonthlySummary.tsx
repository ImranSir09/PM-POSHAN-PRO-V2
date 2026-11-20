
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Card from '../ui/Card';
import { useData } from '../../hooks/useData';
import { Category, AbstractData, DailyEntry, Rates, RateRevision, ClassRoll, EnrollmentRevision, MonthlyBalanceData } from '../../types';
import { calculateMonthlySummary, isSchoolWorkingDay, getRatesForDate, getClassRollsForDate, getOnRollTotalsFromClassRolls } from '../../services/summaryCalculator';
import Button from '../ui/Button';
import Select from '../ui/Select';
import MonthPicker from '../ui/MonthPicker';

const AbstractTable: React.FC<{ title: string; data: Record<Category, AbstractData>; unit: string; decimals: number; }> = React.memo(({ title, data, unit, decimals }) => {
    const total = useMemo(() => ({
        opening: data.balvatika.opening + data.primary.opening + data.middle.opening,
        received: data.balvatika.received + data.primary.received + data.middle.received,
        total: data.balvatika.total + data.primary.total + data.middle.total,
        consumed: (data.balvatika.consumed || 0) + (data.primary.consumed || 0) + (data.middle.consumed || 0),
        expenditure: (data.balvatika.expenditure || 0) + (data.primary.expenditure || 0) + (data.middle.expenditure || 0),
        balance: data.balvatika.balance + data.primary.balance + data.middle.balance,
    }), [data]);

    const isCash = unit === '₹';
    const key = isCash ? 'expenditure' : 'consumed';
    const categories: Category[] = ['balvatika', 'primary', 'middle'];
    
    const thClasses = "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap";
    const tdClasses = "px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums";

    return (
        <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {title} <span className="text-indigo-600 dark:text-indigo-400">({unit})</span>
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                <table className="min-w-[540px] w-full text-left border-collapse">
                    <thead className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800">
                        <tr>
                            <th className={thClasses}>Category</th>
                            <th className={`${thClasses} text-right`}>Opening</th>
                            <th className={`${thClasses} text-right`}>Received</th>
                            <th className={`${thClasses} text-right`}>Total</th>
                            <th className={`${thClasses} text-right`}>{isCash ? 'Expend.' : 'Consumed'}</th>
                            <th className={`${thClasses} text-right bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300`}>Balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-950">
                        {categories.map(cat => (
                            <tr key={cat} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                                <td className={`${tdClasses} capitalize font-medium text-slate-800 dark:text-slate-200`}>{cat}</td>
                                <td className={`${tdClasses} text-right`}>{data[cat].opening.toFixed(decimals)}</td>
                                <td className={`${tdClasses} text-right`}>{data[cat].received.toFixed(decimals)}</td>
                                <td className={`${tdClasses} text-right`}>{data[cat].total.toFixed(decimals)}</td>
                                <td className={`${tdClasses} text-right`}>{data[cat][key]?.toFixed(decimals)}</td>
                                <td className={`${tdClasses} text-right font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300`}>{data[cat].balance.toFixed(decimals)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800">
                        <tr>
                            <td className="px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">Total</td>
                            <td className={`${tdClasses} text-right font-semibold text-slate-900 dark:text-white`}>{total.opening.toFixed(decimals)}</td>
                            <td className={`${tdClasses} text-right font-semibold text-slate-900 dark:text-white`}>{total.received.toFixed(decimals)}</td>
                            <td className={`${tdClasses} text-right font-semibold text-slate-900 dark:text-white`}>{total.total.toFixed(decimals)}</td>
                            <td className={`${tdClasses} text-right font-semibold text-slate-900 dark:text-white`}>{total[key].toFixed(decimals)}</td>
                            <td className={`${tdClasses} text-right font-bold bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300`}>{total.balance.toFixed(decimals)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
});
AbstractTable.displayName = 'AbstractTable';

const CategoryAbstractTable: React.FC<{ title: string; data: AbstractData; unit: string; decimals: number; }> = React.memo(({ title, data, unit, decimals }) => {
    const isCash = unit === '₹';
    const key = isCash ? 'expenditure' : 'consumed';
    const thClasses = "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-right";
    const tdClasses = "px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap text-right tabular-nums";

    return (
        <div className="flex-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {title} <span className="text-indigo-600 dark:text-indigo-400">({unit})</span>
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800">
                        <tr>
                            <th className={thClasses}>Opening</th>
                            <th className={thClasses}>Received</th>
                            <th className={thClasses}>Total</th>
                            <th className={thClasses}>{isCash ? 'Expend.' : 'Consumed'}</th>
                            <th className={`${thClasses} bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300`}>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="bg-white dark:bg-slate-950">
                            <td className={tdClasses}>{data.opening.toFixed(decimals)}</td>
                            <td className={tdClasses}>{data.received.toFixed(decimals)}</td>
                            <td className={tdClasses}>{data.total.toFixed(decimals)}</td>
                            <td className={tdClasses}>{(data[key] || 0).toFixed(decimals)}</td>
                            <td className={`${tdClasses} font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300`}>{data.balance.toFixed(decimals)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
});
CategoryAbstractTable.displayName = 'CategoryAbstractTable';

const SimpleDailyEntriesTable: React.FC<{ entries: any[] }> = React.memo(({ entries }) => (
    <div className="overflow-x-auto max-h-72 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
        <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50/95 dark:bg-slate-900/90 sticky top-0 z-10 border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                    <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Present</th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Rice (kg)</th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Cost (₹)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {entries.length > 0 ? (
                    [...entries].reverse().map(entry => {
                        const date = new Date(entry.date + 'T00:00:00');
                        const isNoMealDay = entry.present === 0;
                        return (
                            <tr key={entry.id} className={isNoMealDay ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'bg-white dark:bg-slate-950 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors'}>
                                <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">{date.toLocaleDateString('en-IN')}</td>
                                {isNoMealDay ? (
                                    <td colSpan={3} className="px-3 py-2.5 text-center text-rose-600 dark:text-rose-400 text-xs italic">
                                        {entry.reasonForNoMeal || 'No Meal Served'}
                                    </td>
                                ) : (
                                    <>
                                        <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">{entry.present}</td>
                                        <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300 tabular-nums">{entry.rice.toFixed(3)}</td>
                                        <td className="px-3 py-2.5 text-right font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{entry.cost.toFixed(2)}</td>
                                    </>
                                )}
                            </tr>
                        )
                    })
                ) : (
                    <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950">
                            No entries with meals served for this category in the selected month.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
));
SimpleDailyEntriesTable.displayName = 'SimpleDailyEntriesTable';

const DetailedConsumptionTable: React.FC<{
    entries: DailyEntry[];
    category: Category;
    rates: Rates;
    rateHistory?: RateRevision[];
    classRolls: ClassRoll[];
    enrollmentHistory?: EnrollmentRevision[];
}> = React.memo(({ entries, category, rates, rateHistory, classRolls, enrollmentHistory }) => {
    
    const { dailyData, totals } = useMemo(() => {
        const data = entries.map((entry, index) => {
            const present = entry.present[category];
            const mealServed = present > 0;
            const entryRates = getRatesForDate({ rates, rateHistory }, entry.date);
            const entryRolls = getClassRollsForDate({ classRolls, enrollmentHistory }, entry.date);
            const dayOnRoll = getOnRollTotalsFromClassRolls(entryRolls)[category];
            
            const riceUsed = mealServed ? (present * entryRates.rice[category]) / 1000 : 0;
            const dalVeg = mealServed ? present * entryRates.dalVeg[category] : 0;
            const oilCond = mealServed ? present * entryRates.oilCond[category] : 0;
            const salt = mealServed ? present * entryRates.salt[category] : 0;
            const fuel = mealServed ? present * entryRates.fuel[category] : 0;
            const totalCost = mealServed ? dalVeg + oilCond + salt + fuel : 0;
            
            return {
                sNo: index + 1,
                date: entry.date,
                onRoll: dayOnRoll,
                present: present,
                riceUsed,
                dalVeg,
                oilCond,
                salt,
                fuel,
                totalCost,
                reason: entry.reasonForNoMeal,
                isSunday: new Date(entry.date + 'T00:00:00').getDay() === 0,
            };
        });
        
        const totals = data.reduce((acc, day) => {
            acc.present += day.present;
            acc.riceUsed += day.riceUsed;
            acc.dalVeg += day.dalVeg;
            acc.oilCond += day.oilCond;
            acc.salt += day.salt;
            acc.fuel += day.fuel;
            acc.totalCost += day.totalCost;
            return acc;
        }, { present: 0, riceUsed: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, totalCost: 0 });

        return { dailyData: data, totals };
    }, [entries, category, rates, rateHistory, classRolls, enrollmentHistory]);

    const thClasses = "px-2.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap";
    const tdClasses = "px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums";
    
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <table className="min-w-[768px] w-full text-left border-collapse">
                <thead className="bg-slate-50/95 dark:bg-slate-900/90 sticky top-0 z-10 border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                        <th className={thClasses}>S.No</th>
                        <th className={thClasses}>Date</th>
                        <th className={`${thClasses} text-right`}>Roll</th>
                        <th className={`${thClasses} text-right`}>Present</th>
                        <th className={`${thClasses} text-right`}>Rice (kg)</th>
                        <th className={`${thClasses} text-right`}>Dal/Veg (₹)</th>
                        <th className={`${thClasses} text-right`}>Oil/Cond (₹)</th>
                        <th className={`${thClasses} text-right`}>Salt (₹)</th>
                        <th className={`${thClasses} text-right`}>Fuel (₹)</th>
                        <th className={`${thClasses} text-right bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300`}>Total (₹)</th>
                        <th className={thClasses}>Reason</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {dailyData.map(day => {
                        const isNoMealDay = day.present === 0 || day.isSunday;
                        const reasonText = day.isSunday ? 'Sunday' : (day.reason || 'No Meal Served');

                        return (
                            <tr key={day.date} className={isNoMealDay ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'bg-white dark:bg-slate-950 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors'}>
                                {isNoMealDay ? (
                                    <td colSpan={11} className="px-2.5 py-2 text-xs text-center italic text-rose-600 dark:text-rose-400">
                                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN')} — {reasonText}
                                    </td>
                                ) : (
                                    <>
                                        <td className={`${tdClasses} text-slate-400 dark:text-slate-500`}>{day.sNo}</td>
                                        <td className={`${tdClasses} font-medium text-slate-800 dark:text-slate-200`}>{new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN')}</td>
                                        <td className={`${tdClasses} text-right`}>{day.onRoll}</td>
                                        <td className={`${tdClasses} text-right`}>{day.present}</td>
                                        <td className={`${tdClasses} text-right`}>{day.riceUsed.toFixed(3)}</td>
                                        <td className={`${tdClasses} text-right`}>{day.dalVeg.toFixed(2)}</td>
                                        <td className={`${tdClasses} text-right`}>{day.oilCond.toFixed(2)}</td>
                                        <td className={`${tdClasses} text-right`}>{day.salt.toFixed(2)}</td>
                                        <td className={`${tdClasses} text-right`}>{day.fuel.toFixed(2)}</td>
                                        <td className={`${tdClasses} text-right font-semibold bg-indigo-50/40 dark:bg-indigo-950/25 text-indigo-700 dark:text-indigo-300`}>{day.totalCost.toFixed(2)}</td>
                                        <td className={`${tdClasses} text-slate-400 dark:text-slate-600`}>—</td>
                                    </>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800">
                    <tr>
                        <td colSpan={3} className="px-2.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white text-right">Total</td>
                        <td className={`${tdClasses} text-right font-semibold text-slate-900 dark:text-white`}>{totals.present}</td>
                        <td className={`${tdClasses} text-right font-semibold text-slate-900 dark:text-white`}>{totals.riceUsed.toFixed(3)}</td>
                        <td className={`${tdClasses} text-right font-semibold text-slate-900 dark:text-white`}>{totals.dalVeg.toFixed(2)}</td>
                        <td className={`${tdClasses} text-right font-semibold text-slate-900 dark:text-white`}>{totals.oilCond.toFixed(2)}</td>
                        <td className={`${tdClasses} text-right font-semibold text-slate-900 dark:text-white`}>{totals.salt.toFixed(2)}</td>
                        <td className={`${tdClasses} text-right font-semibold text-slate-900 dark:text-white`}>{totals.fuel.toFixed(2)}</td>
                        <td className={`${tdClasses} text-right font-bold bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300`}>{totals.totalCost.toFixed(2)}</td>
                        <td className={`${tdClasses} text-slate-400 dark:text-slate-600`}>—</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
});
DetailedConsumptionTable.displayName = 'DetailedConsumptionTable';

const isBalanceEqual = (b1?: MonthlyBalanceData, b2?: MonthlyBalanceData): boolean => {
    if (!b1 || !b2) return false;
    const r1 = b1.rice || {};
    const r2 = b2.rice || {};
    const c1 = b1.cash || {};
    const c2 = b2.cash || {};
    return (
        Math.abs((r1.balvatika || 0) - (r2.balvatika || 0)) < 0.001 &&
        Math.abs((r1.primary || 0) - (r2.primary || 0)) < 0.001 &&
        Math.abs((r1.middle || 0) - (r2.middle || 0)) < 0.001 &&
        Math.abs((c1.balvatika || 0) - (c2.balvatika || 0)) < 0.01 &&
        Math.abs((c1.primary || 0) - (c2.primary || 0)) < 0.01 &&
        Math.abs((c1.middle || 0) - (c2.middle || 0)) < 0.01
    );
};

const MonthlySummary: React.FC = React.memo(() => {
    const { data, saveMonthlyBalance } = useData();
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [view, setView] = useState<'overall' | Category>('overall');
    const [isDetailsVisible, setIsDetailsVisible] = useState(false);
    const { settings } = data;

    const summaryData = useMemo(
        () => calculateMonthlySummary(data, selectedMonth),
        [data.entries, data.receipts, data.monthlyBalances, data.settings, selectedMonth]
    );
    
    const { monthEntries, riceAbstracts, cashAbstracts, totals, categoryTotals, closingBalance, workingDays } = summaryData;
    
    const savedBalance = data.monthlyBalances[selectedMonth];
    
    useEffect(() => {
        if (closingBalance && monthEntries.length > 0) {
            if (!isBalanceEqual(savedBalance, closingBalance)) {
                saveMonthlyBalance(selectedMonth, closingBalance);
            }
        }
    }, [selectedMonth, closingBalance, savedBalance, saveMonthlyBalance, monthEntries.length]);

    useEffect(() => {
        setIsDetailsVisible(false);
    }, [view, selectedMonth]);

    const showDetails = useCallback(() => setIsDetailsVisible(true), []);
    const hideDetails = useCallback(() => setIsDetailsVisible(false), []);

    const displayedTotals = useMemo(() => {
        const workingDaysCount = workingDays !== undefined
            ? workingDays
            : monthEntries.filter(isSchoolWorkingDay).length;

        if (view === 'overall') {
            return {
                workingDays: workingDaysCount,
                mealDays: monthEntries.filter(e => e.totalPresent > 0).length,
                present: totals.present,
                expenditure: totals.expenditure,
                rice: totals.rice,
            };
        }
        return {
            workingDays: workingDaysCount,
            mealDays: monthEntries.filter(e => e.present[view] > 0).length,
            present: categoryTotals.present[view] || 0,
            expenditure: categoryTotals.expenditure[view] || 0,
            rice: categoryTotals.rice[view] || 0,
        };
    }, [view, monthEntries, totals, categoryTotals, workingDays]);

    const simpleDisplayedEntries = useMemo(() => {
        if (view !== 'overall') return []; // Only needed for overall view
        return monthEntries.map(entry => ({
            id: entry.id,
            date: entry.date,
            present: entry.totalPresent,
            rice: entry.consumption.rice,
            cost: entry.consumption.total,
            reasonForNoMeal: entry.reasonForNoMeal
        }));
    }, [monthEntries, view]);

    return (
        <div className="space-y-4">
            <Card title="Monthly Summary">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <MonthPicker
                            id="month-select"
                            label="Select Month"
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                        />
                    </div>
                    <div className="flex-1">
                        <Select
                            id="view-select"
                            label="View"
                            value={view}
                            onChange={v => setView(v as any)}
                            options={[
                                { value: 'overall', label: 'Overall' },
                                { value: 'balvatika', label: 'Balvatika' },
                                { value: 'primary', label: 'Primary' },
                                { value: 'middle', label: 'Middle' },
                            ]}
                        />
                    </div>
                </div>
            </Card>

            {monthEntries.length === 0 ? (
                <Card>
                    <p className="text-center text-slate-500 dark:text-slate-400">No entries found for the selected month.</p>
                </Card>
            ) : (
                <>
                    {view === 'overall' ? (
                        <Card title="Overall Summary">
                            <div className="space-y-4">
                                <AbstractTable title="Rice Abstract" data={riceAbstracts} unit="kg" decimals={3} />
                                <AbstractTable title="Cash Abstract" data={cashAbstracts} unit="₹" decimals={2} />
                            </div>
                        </Card>
                    ) : (
                        <Card title={`${view.charAt(0).toUpperCase() + view.slice(1)} Summary`}>
                            <div className="flex flex-col gap-4">
                                <CategoryAbstractTable title="Rice Abstract" data={riceAbstracts[view]} unit="kg" decimals={3} />
                                <CategoryAbstractTable title="Cash Abstract" data={cashAbstracts[view]} unit="₹" decimals={2} />
                            </div>
                        </Card>
                    )}

                    <Card title="Meal & Attendance Totals">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-center">
                            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70">
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Working Days</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">{displayedTotals.workingDays}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70">
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Meal Days</p>
                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">{displayedTotals.mealDays}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70">
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Students Fed</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">{displayedTotals.present}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70">
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Expenditure</p>
                                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-0.5">₹{displayedTotals.expenditure.toFixed(2)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70 col-span-2 sm:col-span-1">
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Rice Used</p>
                                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-0.5">{displayedTotals.rice.toFixed(3)} kg</p>
                            </div>
                        </div>
                    </Card>

                    <Card title={view === 'overall' ? "Daily Entries for the Month" : "Daily Consumption Register"}>
                        {isDetailsVisible ? (
                            <>
                                {view === 'overall' ? (
                                   <SimpleDailyEntriesTable entries={simpleDisplayedEntries} />
                                ) : (
                                    <DetailedConsumptionTable
                                        entries={monthEntries}
                                        category={view}
                                        rates={settings.rates}
                                        rateHistory={settings.rateHistory}
                                        classRolls={settings.classRolls}
                                        enrollmentHistory={settings.enrollmentHistory}
                                    />
                                )}
                                <Button onClick={hideDetails} className="w-full mt-4" variant="secondary">
                                    Hide Details
                                </Button>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    {view === 'overall'
                                        ? "A detailed list of daily entries is available."
                                        : "A detailed day-by-day consumption register is available."
                                    }
                                </p>
                                <Button onClick={showDetails}>
                                    {view === 'overall' ? 'Show Daily Breakdown' : 'Show Detailed Register'}
                                </Button>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
});

MonthlySummary.displayName = 'MonthlySummary';

export default MonthlySummary;
