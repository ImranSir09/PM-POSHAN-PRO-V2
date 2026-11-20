import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { DailyEntry } from '../../types';
import { useToast } from '../../hooks/useToast';
import Modal from '../ui/Modal';
import NumberInput from '../ui/NumberInput';
import DatePicker from '../ui/DatePicker';
import Select from '../ui/Select';
import { getRatesForDate, getClassRollsForDate, getOnRollTotalsFromClassRolls } from '../../services/summaryCalculator';

const NO_MEAL_REASONS_STRUCTURED = {
  "Foodgrains not Available": [
    "Foodgrains not received",
    "Foodgrains damaged",
    "Insufficient foodgrains"
  ],
  "Cook not Available": [
    "Cook not appointed",
    "Cook Salary not Paid",
    "Cook quitted"
  ],
  "Fuel/Ingredients not Available": [
    "Insufficient Fuel",
    "Insufficient Funds for Cooking",
    "Insufficient Ingredients"
  ],
  "Packages not arrived from NGO/SHG": [
    "Vendor not Received Payment",
    "Damaged in Transit"
  ],
  "Holiday in School": [
    "Gazetted Holiday",
    "Local Holiday",
    "Closed (Natural Calamity)",
    "Winter Vacations",
    "Summer Vacations",
    "Festival Break"
  ],
  "Others": [
    "Others"
  ]
};
type MainReason = keyof typeof NO_MEAL_REASONS_STRUCTURED;
const MAIN_REASONS = Object.keys(NO_MEAL_REASONS_STRUCTURED) as MainReason[];

const DailyEntryPage: React.FC = React.memo(() => {
    const { data, addEntry } = useData();
    const { showToast } = useToast();
    const { settings } = data;

    const today = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);
    const [selectedDate, setSelectedDate] = useState(today);
    const rates = useMemo(() => getRatesForDate(settings, selectedDate), [settings, selectedDate]);
    const onRoll = useMemo(
        () => getOnRollTotalsFromClassRolls(getClassRollsForDate(settings, selectedDate)),
        [settings, selectedDate]
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [present, setPresent] = useState({ balvatika: 0, primary: 0, middle: 0 });
    const [consumption, setConsumption] = useState({ rice: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, total: 0 });
    
    const [isEntryModalOpen, setEntryModalOpen] = useState(false);
    const [isOverwriteModalOpen, setOverwriteModalOpen] = useState(false);
    const [isReasonModalOpen, setReasonModalOpen] = useState(false);
    
    const [mainReason, setMainReason] = useState<MainReason | ''>('');
    const [subReason, setSubReason] = useState('');
    const [pendingEntry, setPendingEntry] = useState<DailyEntry | null>(null);

    const isSunday = useMemo(() => new Date(selectedDate + 'T00:00:00').getDay() === 0, [selectedDate]);
    const entryExists = useMemo(() => data.entries.some(e => e.id === selectedDate), [data.entries, selectedDate]);

    // Handle deep-linking from notifications
    useEffect(() => {
        const dateToOpen = sessionStorage.getItem('openEntryForDate');
        if (dateToOpen) {
            sessionStorage.removeItem('openEntryForDate');
            setSelectedDate(dateToOpen);
            setTimeout(() => setEntryModalOpen(true), 100);
        }
    }, []);
    
    const calculateConsumption = useCallback(() => {
        const balvatikaRice = (present.balvatika * rates.rice.balvatika) / 1000;
        const primaryRice = (present.primary * rates.rice.primary) / 1000;
        const middleRice = (present.middle * rates.rice.middle) / 1000;
        const totalRice = balvatikaRice + primaryRice + middleRice;

        const dalVeg = (present.balvatika * rates.dalVeg.balvatika) + (present.primary * rates.dalVeg.primary) + (present.middle * rates.dalVeg.middle);
        const oilCond = (present.balvatika * rates.oilCond.balvatika) + (present.primary * rates.oilCond.primary) + (present.middle * rates.oilCond.middle);
        const salt = (present.balvatika * rates.salt.balvatika) + (present.primary * rates.salt.primary) + (present.middle * rates.salt.middle);
        const fuel = (present.balvatika * rates.fuel.balvatika) + (present.primary * rates.fuel.primary) + (present.middle * rates.fuel.middle);

        const totalExpenditure = dalVeg + oilCond + salt + fuel;

        setConsumption({
            rice: parseFloat(totalRice.toFixed(3)),
            dalVeg: parseFloat(dalVeg.toFixed(2)),
            oilCond: parseFloat(oilCond.toFixed(2)),
            salt: parseFloat(salt.toFixed(2)),
            fuel: parseFloat(fuel.toFixed(2)),
            total: parseFloat(totalExpenditure.toFixed(2)),
        });
    }, [present, rates]);

    useEffect(() => {
        calculateConsumption();
    }, [present, calculateConsumption]);

    useEffect(() => {
        const entryForDate = data.entries.find(e => e.id === selectedDate);
        if (entryForDate) {
            setPresent(entryForDate.present);
        } else {
            setPresent({ balvatika: 0, primary: 0, middle: 0 });
        }
    }, [selectedDate, data.entries]);

    const handlePresentChange = (category: keyof typeof present, value: number) => {
        setPresent(prev => ({ ...prev, [category]: value }));
    };

    const initiateSaveProcess = (entry: DailyEntry, overwrite = false) => {
        const success = addEntry(entry, overwrite);
        if (success) {
            showToast(`Entry for ${entry.date} ${overwrite || entryExists ? 'updated' : 'saved'} successfully!`, 'success');
            setEntryModalOpen(false);
        } else if (settings.autoOverwrite) {
            addEntry(entry, true);
            showToast(`Entry for ${entry.date} updated successfully!`, 'success');
            setEntryModalOpen(false);
        } else {
            setPendingEntry(entry);
            setOverwriteModalOpen(true);
        }
    };

    const handleSave = () => {
        if (!selectedDate) {
            showToast('Please select a date.', 'error');
            return;
        }
        const totalPresent = present.balvatika + present.primary + present.middle;

        if (totalPresent > 0) {
            const newEntry: DailyEntry = {
                id: selectedDate,
                date: selectedDate,
                present,
                totalPresent,
                consumption,
            };
            initiateSaveProcess(newEntry);
        } else {
            const existingEntry = data.entries.find(e => e.id === selectedDate);
            const [currentMain = '', currentSub = ''] = existingEntry?.reasonForNoMeal?.split(': ') || [];
            
            const validMainReason = MAIN_REASONS.find(r => r === currentMain);
            if (validMainReason) {
                setMainReason(validMainReason);
                setSubReason(currentSub);
            } else {
                setMainReason('');
                setSubReason('');
            }
            setReasonModalOpen(true);
        }
    };
    
    const handleSaveZeroEntry = () => {
        if (!mainReason) {
            showToast('Please select a main reason.', 'error');
            return;
        }
        const subReasons = NO_MEAL_REASONS_STRUCTURED[mainReason];
        if (subReasons.length > 0 && !subReason) {
            showToast('Please select a sub-reason.', 'error');
            return;
        }

        const finalReason = subReasons.length > 0 ? `${mainReason}: ${subReason}` : mainReason;
        
        const zeroEntry: DailyEntry = {
            id: selectedDate,
            date: selectedDate,
            present: { balvatika: 0, primary: 0, middle: 0 },
            totalPresent: 0,
            consumption: { rice: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, total: 0 },
            reasonForNoMeal: finalReason,
        };
        setReasonModalOpen(false);
        initiateSaveProcess(zeroEntry);
    };

    const handleMarkAsSunday = () => {
        const sundayEntry: DailyEntry = {
            id: today,
            date: today,
            present: { balvatika: 0, primary: 0, middle: 0 },
            totalPresent: 0,
            consumption: { rice: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, total: 0 },
            reasonForNoMeal: 'Sunday',
        };
        initiateSaveProcess(sundayEntry, true);
    };

    const confirmOverwrite = () => {
        if (pendingEntry) {
            initiateSaveProcess(pendingEntry, true);
        }
        setOverwriteModalOpen(false);
        setPendingEntry(null);
    };

    const currentSubReasons = mainReason ? NO_MEAL_REASONS_STRUCTURED[mainReason] : [];

    return (
        <>
            <Modal isOpen={isEntryModalOpen} onClose={() => setEntryModalOpen(false)} title={`Entry for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN')}`} zIndex="z-40">
                <div className="space-y-4">
                    <div>
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2.5">Students Present</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <NumberInput label={`Balvatika (${onRoll.balvatika})`} id="balvatika" value={present.balvatika} onChange={val => handlePresentChange('balvatika', val)} min={0} max={onRoll.balvatika} />
                            <NumberInput label={`Primary (${onRoll.primary})`} id="primary" value={present.primary} onChange={val => handlePresentChange('primary', val)} min={0} max={onRoll.primary} />
                            <NumberInput label={`Middle (${onRoll.middle})`} id="middle" value={present.middle} onChange={val => handlePresentChange('middle', val)} min={0} max={onRoll.middle} />
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2.5">Auto-calculated Consumption</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-sm">
                            {Object.entries(consumption).map(([key, value]) => (
                                <div
                                    key={key}
                                    className={`p-2.5 rounded-xl border ${
                                        key === 'total'
                                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200/70 dark:border-indigo-800/60'
                                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800'
                                    }`}
                                >
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                                        {key === 'dalVeg' ? 'Dal & Veg' : key === 'oilCond' ? 'Oil & Cond.' : key}
                                    </p>
                                    <p className={`font-semibold tabular-nums mt-0.5 ${key === 'total' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>
                                        {key === 'rice' ? `${value} kg` : `₹${value}`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <Button onClick={handleSave} className="w-full">
                        {entryExists ? 'Update Entry' : 'Save Entry'}
                    </Button>
                </div>
            </Modal>

            <Modal isOpen={isOverwriteModalOpen} onClose={() => setOverwriteModalOpen(false)} title="Confirm Overwrite" zIndex="z-50">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">An entry for this date already exists. Do you want to overwrite it?</p>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setOverwriteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmOverwrite}>Overwrite</Button>
                </div>
            </Modal>

            <Modal isOpen={isReasonModalOpen} onClose={() => setReasonModalOpen(false)} title="Reason for No Meal" zIndex="z-50">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">Select a reason for not serving the meal on this date.</p>
                    <Select
                        id="main-reason-select"
                        label="Main Reason"
                        value={mainReason}
                        onChange={val => {
                            setMainReason(val as MainReason);
                            setSubReason('');
                        }}
                        placeholder="Select a reason..."
                        options={MAIN_REASONS.map(reason => ({ value: reason, label: reason }))}
                    />

                    {currentSubReasons.length > 0 && (
                        <Select
                            id="sub-reason-select"
                            label="Sub-Reason"
                            value={subReason}
                            onChange={setSubReason}
                            placeholder="Select a sub-reason..."
                            options={currentSubReasons.map(reason => ({ value: reason, label: reason }))}
                        />
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setReasonModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveZeroEntry}>Save Entry</Button>
                    </div>
                </div>
            </Modal>

            <Card className="border-indigo-200/70 dark:border-indigo-900/60">
                {showDatePicker ? (
                    <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Edit Another Date</h2>
                        </div>
                        <DatePicker
                            id="entry-date"
                            label="Select Date"
                            value={selectedDate}
                            onChange={setSelectedDate}
                            max={today}
                        />
                        {isSunday && (
                            <div className="text-center p-2.5 bg-rose-50 dark:bg-rose-950/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs border border-rose-200/70 dark:border-rose-900/50">
                                Entries are disabled for Sundays.
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button onClick={() => setEntryModalOpen(true)} className="flex-1" disabled={isSunday}>
                                Load & Edit Entry
                            </Button>
                            <Button variant="secondary" onClick={() => { setShowDatePicker(false); setSelectedDate(today); }} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-0.5">
                                    Daily Meal Entry
                                </p>
                                <p className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                                    {new Date(today + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {entryExists && selectedDate === today ? 'Entry recorded for today' : 'No entry recorded yet'}
                                </p>
                            </div>
                            <div className="shrink-0">
                                {isSunday && selectedDate === today ? (
                                    <Button onClick={handleMarkAsSunday} variant="secondary">
                                        Mark Sunday
                                    </Button>
                                ) : (
                                    <Button onClick={() => { setSelectedDate(today); setEntryModalOpen(true); }} disabled={isSunday}>
                                        {entryExists && selectedDate === today ? 'Edit Today' : 'Add Entry'}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setShowDatePicker(true)}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                            >
                                <CalendarDays size={14} />
                                Edit another date
                            </button>
                            {isSunday && selectedDate === today && (
                                <span className={`text-xs font-medium ${entryExists ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {entryExists ? 'Marked non-meal day' : 'Sunday'}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </Card>
        </>
    );
});

DailyEntryPage.displayName = 'DailyEntryPage';

export default DailyEntryPage;
