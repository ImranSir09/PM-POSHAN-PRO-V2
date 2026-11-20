import React, { useState, useMemo, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { Accordion, AccordionItem } from '../ui/Accordion';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { Settings, SchoolDetails, Rates, RateRevision, EnrollmentRevision, Category, CookCumHelper, ClassRoll, MonthlyBalanceData, MDMIncharge, NotificationSettings, InspectionReport, InspectionAuthority } from '../../types';
import { CLASS_STRUCTURE } from '../../constants';
import { indianStates, jkDistrictsWithZones } from '../../data/locations';
import NumberInput from '../ui/NumberInput';
import Select from '../ui/Select';
import DatePicker from '../ui/DatePicker';
import DataManagement from '../ui/DataManagement';
import { getRatesForDate, getClassRollsForDate, getOnRollTotalsFromClassRolls } from '../../services/summaryCalculator';
import { useToast } from '../../hooks/useToast';


const calculateSectionTotals = (classes: ClassRoll[]) => {
    return classes.reduce((acc, cr) => {
        acc.general.boys += cr.general.boys;
        acc.general.girls += cr.general.girls;
        acc.stsc.boys += cr.stsc.boys;
        acc.stsc.girls += cr.stsc.girls;
        acc.total.boys += cr.general.boys + cr.stsc.boys;
        acc.total.girls += cr.general.girls + cr.stsc.girls;
        acc.total.onRoll += cr.general.boys + cr.general.girls + cr.stsc.boys + cr.stsc.girls;
        return acc;
    }, {
        general: { boys: 0, girls: 0 },
        stsc: { boys: 0, girls: 0 },
        total: { boys: 0, girls: 0, onRoll: 0 },
    });
};

const SectionTotalRow: React.FC<{ label: string, totals: ReturnType<typeof calculateSectionTotals> }> = ({ label, totals }) => (
    <tr className="font-semibold bg-slate-50/90 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 border-t border-slate-200/80 dark:border-slate-800 tabular-nums">
        <td className="px-2.5 py-2 text-left">{label}</td>
        <td className="px-2 py-2">{totals.general.boys}</td>
        <td className="px-2 py-2">{totals.general.girls}</td>
        <td className="px-2 py-2">{totals.stsc.boys}</td>
        <td className="px-2 py-2">{totals.stsc.girls}</td>
        <td className="px-2 py-2">{totals.total.boys}</td>
        <td className="px-2 py-2">{totals.total.girls}</td>
        <td className="px-2.5 py-2 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold">{totals.total.onRoll}</td>
    </tr>
);

const cloneRates = (r: Rates): Rates => JSON.parse(JSON.stringify(r));
const cloneClassRolls = (rolls: ClassRoll[]): ClassRoll[] => JSON.parse(JSON.stringify(rolls));

const SettingsPage: React.FC = () => {
    const { data, updateSettings } = useData();
    const { showToast } = useToast();
    const [settings, setSettings] = useState<Settings>(data.settings);
    const [isUdiseValid, setIsUdiseValid] = useState(settings.schoolDetails.udise.length === 11 || settings.schoolDetails.udise.length === 0);
    const [isRatesEditable, setIsRatesEditable] = useState(false);
    const [isEnrollmentEditable, setIsEnrollmentEditable] = useState(false);

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);
    const [rateEffectiveDate, setRateEffectiveDate] = useState<string>(todayStr);
    const [hasRateSessionEdits, setHasRateSessionEdits] = useState(false);
    const rateSessionRef = useRef<{
        baseRates: Rates;
        baseHistory: RateRevision[];
        edited: boolean;
    } | null>(null);

    const [enrollmentEffectiveDate, setEnrollmentEffectiveDate] = useState<string>(todayStr);
    const [hasEnrollmentSessionEdits, setHasEnrollmentSessionEdits] = useState(false);
    const enrollmentSessionRef = useRef<{
        baseClassRolls: ClassRoll[];
        baseHistory: EnrollmentRevision[];
        edited: boolean;
    } | null>(null);

    const availableDistricts = useMemo(() => {
        const selectedStateData = indianStates.find(s => s.name === settings.schoolDetails.state);
        return selectedStateData ? selectedStateData.districts.sort() : [];
    }, [settings.schoolDetails.state]);

    const availableZones = useMemo(() => {
        if (settings.schoolDetails.state !== 'Jammu and Kashmir') {
            return [];
        }
        const selectedDistrictData = jkDistrictsWithZones.find(d => d.name === settings.schoolDetails.district);
        return selectedDistrictData ? selectedDistrictData.zones.sort() : [];
    }, [settings.schoolDetails.state, settings.schoolDetails.district]);

    const handleSchoolDetailsChange = (field: keyof SchoolDetails, value: string) => {
        if (field === 'udise') {
            setIsUdiseValid(value.length === 11 || value.length === 0);
        }
        
        const newSchoolDetails = { ...settings.schoolDetails, [field]: value };
        
        if (field === 'schoolCategoryMDCF') {
            newSchoolDetails.category = value;
        }

        if (field === 'state') {
            newSchoolDetails.district = '';
            newSchoolDetails.block = ''; // Reset block when state changes
        }
         if (field === 'district') {
            newSchoolDetails.block = ''; // Reset block when district changes
        }

        setSettings(prev => ({ ...prev, schoolDetails: newSchoolDetails }));
    }

    const handleInchargeChange = (field: keyof MDMIncharge, value: string) => {
        setSettings(prev => ({
            ...prev,
            mdmIncharge: {
                ...(prev.mdmIncharge || { name: '', contact: '' }),
                [field]: value
            }
        }));
    };

    const handleHeadChange = (field: keyof MDMIncharge, value: string) => {
        setSettings(prev => ({
            ...prev,
            headOfInstitution: {
                ...(prev.headOfInstitution || { name: '', contact: '' }),
                [field]: value
            }
        }));
    };
    
    const displayedClassRolls = useMemo(() => {
        if (!isEnrollmentEditable) {
            return getClassRollsForDate(settings, todayStr);
        }
        return getClassRollsForDate(settings, enrollmentEffectiveDate);
    }, [isEnrollmentEditable, settings, todayStr, enrollmentEffectiveDate]);

    const applyEnrollmentRevisionToHistory = (
        baseClassRolls: ClassRoll[],
        baseHistory: EnrollmentRevision[],
        effectiveFrom: string,
        revisedClassRolls: ClassRoll[]
    ): { classRolls: ClassRoll[]; enrollmentHistory: EnrollmentRevision[] } => {
        const history: EnrollmentRevision[] = baseHistory.length > 0
            ? baseHistory.map(r => ({ effectiveFrom: r.effectiveFrom, classRolls: cloneClassRolls(r.classRolls) }))
            : [{ effectiveFrom: '1970-01-01', classRolls: cloneClassRolls(baseClassRolls) }];

        const existingIdx = history.findIndex(r => r.effectiveFrom === effectiveFrom);
        if (existingIdx !== -1) {
            history[existingIdx] = { effectiveFrom, classRolls: cloneClassRolls(revisedClassRolls) };
        } else {
            history.push({ effectiveFrom, classRolls: cloneClassRolls(revisedClassRolls) });
        }

        history.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
        const activeTodayRolls = getClassRollsForDate({ classRolls: baseClassRolls, enrollmentHistory: history }, todayStr);
        return { classRolls: cloneClassRolls(activeTodayRolls), enrollmentHistory: history };
    };

    const handleToggleEnrollmentEditable = (enabled: boolean) => {
        if (enabled) {
            enrollmentSessionRef.current = {
                baseClassRolls: cloneClassRolls(settings.classRolls),
                baseHistory: (settings.enrollmentHistory || []).map(r => ({ effectiveFrom: r.effectiveFrom, classRolls: cloneClassRolls(r.classRolls) })),
                edited: false,
            };
            setHasEnrollmentSessionEdits(false);
            setEnrollmentEffectiveDate(todayStr);
            setIsEnrollmentEditable(true);
        } else {
            enrollmentSessionRef.current = null;
            setHasEnrollmentSessionEdits(false);
            setIsEnrollmentEditable(false);
        }
    };

    const handleEnrollmentEffectiveDateChange = (newDate: string) => {
        if (!newDate) return;
        if (enrollmentSessionRef.current?.edited) {
            const currentEditedRolls = getClassRollsForDate(settings, enrollmentEffectiveDate);
            const { classRolls: activeTodayRolls, enrollmentHistory } = applyEnrollmentRevisionToHistory(
                enrollmentSessionRef.current.baseClassRolls,
                enrollmentSessionRef.current.baseHistory,
                newDate,
                currentEditedRolls
            );
            setSettings(prev => ({ ...prev, classRolls: activeTodayRolls, enrollmentHistory }));
        }
        setEnrollmentEffectiveDate(newDate);
    };

    const handleCommitAndAddAnotherEnrollmentDate = () => {
        enrollmentSessionRef.current = {
            baseClassRolls: cloneClassRolls(settings.classRolls),
            baseHistory: (settings.enrollmentHistory || []).map(r => ({ effectiveFrom: r.effectiveFrom, classRolls: cloneClassRolls(r.classRolls) })),
            edited: false,
        };
        setHasEnrollmentSessionEdits(false);
        showToast(`Enrollment saved for ${new Date(enrollmentEffectiveDate + 'T00:00:00').toLocaleDateString('en-IN')}. Select another date to add a new revision.`, 'success');
    };

    const handleEditEnrollmentRevision = (effectiveFrom: string) => {
        enrollmentSessionRef.current = {
            baseClassRolls: cloneClassRolls(settings.classRolls),
            baseHistory: (settings.enrollmentHistory || []).map(r => ({ effectiveFrom: r.effectiveFrom, classRolls: cloneClassRolls(r.classRolls) })),
            edited: false,
        };
        setHasEnrollmentSessionEdits(false);
        setEnrollmentEffectiveDate(effectiveFrom);
        setIsEnrollmentEditable(true);
    };

    const handleDeleteEnrollmentRevision = (effectiveFrom: string) => {
        const remaining = (settings.enrollmentHistory || []).filter(r => r.effectiveFrom !== effectiveFrom);
        let nextActiveRolls: ClassRoll[];
        let nextHistory: EnrollmentRevision[] = [];

        if (remaining.length <= 1) {
            nextActiveRolls = remaining.length === 1 ? cloneClassRolls(remaining[0].classRolls) : cloneClassRolls(settings.classRolls);
            setSettings(prev => {
                const { enrollmentHistory: _removed, ...rest } = prev;
                return { ...rest, classRolls: nextActiveRolls };
            });
        } else {
            nextActiveRolls = cloneClassRolls(getClassRollsForDate({ classRolls: settings.classRolls, enrollmentHistory: remaining }, todayStr));
            nextHistory = remaining.map(r => ({ effectiveFrom: r.effectiveFrom, classRolls: cloneClassRolls(r.classRolls) }));
            setSettings(prev => ({ ...prev, classRolls: nextActiveRolls, enrollmentHistory: nextHistory }));
        }

        if (enrollmentSessionRef.current) {
            enrollmentSessionRef.current = {
                baseClassRolls: cloneClassRolls(nextActiveRolls),
                baseHistory: nextHistory.map(r => ({ effectiveFrom: r.effectiveFrom, classRolls: cloneClassRolls(r.classRolls) })),
                edited: false,
            };
        }
        setHasEnrollmentSessionEdits(false);
        showToast('Enrollment revision removed.', 'info');
    };

    const handleClassRollChange = (classId: string, category: 'general' | 'stsc', gender: 'boys' | 'girls', value: string) => {
        const numValue = Math.max(0, parseInt(value) || 0);
        const updatedRolls = cloneClassRolls(displayedClassRolls).map(cr =>
            cr.id === classId
                ? { ...cr, [category]: { ...cr[category], [gender]: numValue } }
                : cr
        );

        if (!enrollmentSessionRef.current) {
            enrollmentSessionRef.current = {
                baseClassRolls: cloneClassRolls(settings.classRolls),
                baseHistory: (settings.enrollmentHistory || []).map(r => ({ effectiveFrom: r.effectiveFrom, classRolls: cloneClassRolls(r.classRolls) })),
                edited: false,
            };
        }

        enrollmentSessionRef.current.edited = true;
        setHasEnrollmentSessionEdits(true);
        const { classRolls: activeTodayRolls, enrollmentHistory } = applyEnrollmentRevisionToHistory(
            enrollmentSessionRef.current.baseClassRolls,
            enrollmentSessionRef.current.baseHistory,
            enrollmentEffectiveDate,
            updatedRolls
        );
        setSettings(prev => ({ ...prev, classRolls: activeTodayRolls, enrollmentHistory }));
    };

    const displayedRates = useMemo(() => {
        if (!isRatesEditable) {
            return getRatesForDate(settings, todayStr);
        }
        return getRatesForDate(settings, rateEffectiveDate);
    }, [isRatesEditable, settings, todayStr, rateEffectiveDate]);

    const applyRevisionToHistory = (
        baseRates: Rates,
        baseHistory: RateRevision[],
        effectiveFrom: string,
        revisedRates: Rates
    ): { rates: Rates; rateHistory: RateRevision[] } => {
        const history: RateRevision[] = baseHistory.length > 0
            ? baseHistory.map(r => ({ effectiveFrom: r.effectiveFrom, rates: cloneRates(r.rates) }))
            : [{ effectiveFrom: '1970-01-01', rates: cloneRates(baseRates) }];

        const existingIdx = history.findIndex(r => r.effectiveFrom === effectiveFrom);
        if (existingIdx !== -1) {
            history[existingIdx] = { effectiveFrom, rates: cloneRates(revisedRates) };
        } else {
            history.push({ effectiveFrom, rates: cloneRates(revisedRates) });
        }

        history.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
        const activeTodayRates = getRatesForDate({ rates: baseRates, rateHistory: history }, todayStr);
        return { rates: activeTodayRates, rateHistory: history };
    };

    const handleToggleRatesEditable = (enabled: boolean) => {
        if (enabled) {
            rateSessionRef.current = {
                baseRates: cloneRates(settings.rates),
                baseHistory: (settings.rateHistory || []).map(r => ({ effectiveFrom: r.effectiveFrom, rates: cloneRates(r.rates) })),
                edited: false,
            };
            setHasRateSessionEdits(false);
            setRateEffectiveDate(todayStr);
            setIsRatesEditable(true);
        } else {
            rateSessionRef.current = null;
            setHasRateSessionEdits(false);
            setIsRatesEditable(false);
        }
    };

    const handleEffectiveDateChange = (newDate: string) => {
        if (!newDate) return;
        if (rateSessionRef.current?.edited) {
            const currentEditedRates = getRatesForDate(settings, rateEffectiveDate);
            const { rates: activeTodayRates, rateHistory } = applyRevisionToHistory(
                rateSessionRef.current.baseRates,
                rateSessionRef.current.baseHistory,
                newDate,
                currentEditedRates
            );
            setSettings(prev => ({ ...prev, rates: activeTodayRates, rateHistory }));
        }
        setRateEffectiveDate(newDate);
    };

    const handleCommitAndAddAnotherDate = () => {
        rateSessionRef.current = {
            baseRates: cloneRates(settings.rates),
            baseHistory: (settings.rateHistory || []).map(r => ({ effectiveFrom: r.effectiveFrom, rates: cloneRates(r.rates) })),
            edited: false,
        };
        setHasRateSessionEdits(false);
        showToast(`Rates saved for ${new Date(rateEffectiveDate + 'T00:00:00').toLocaleDateString('en-IN')}. Select another date to add a new revision.`, 'success');
    };

    const handleEditHistoryRevision = (effectiveFrom: string) => {
        rateSessionRef.current = {
            baseRates: cloneRates(settings.rates),
            baseHistory: (settings.rateHistory || []).map(r => ({ effectiveFrom: r.effectiveFrom, rates: cloneRates(r.rates) })),
            edited: false,
        };
        setHasRateSessionEdits(false);
        setRateEffectiveDate(effectiveFrom);
        setIsRatesEditable(true);
    };

    const handleDeleteHistoryRevision = (effectiveFrom: string) => {
        const remaining = (settings.rateHistory || []).filter(r => r.effectiveFrom !== effectiveFrom);
        let nextActiveRates: Rates;
        let nextHistory: RateRevision[] = [];

        if (remaining.length <= 1) {
            nextActiveRates = remaining.length === 1 ? cloneRates(remaining[0].rates) : cloneRates(settings.rates);
            setSettings(prev => {
                const { rateHistory: _removed, ...rest } = prev;
                return { ...rest, rates: nextActiveRates };
            });
        } else {
            nextActiveRates = getRatesForDate({ rates: settings.rates, rateHistory: remaining }, todayStr);
            nextHistory = remaining.map(r => ({ effectiveFrom: r.effectiveFrom, rates: cloneRates(r.rates) }));
            setSettings(prev => ({ ...prev, rates: nextActiveRates, rateHistory: nextHistory }));
        }

        if (rateSessionRef.current) {
            rateSessionRef.current = {
                baseRates: cloneRates(nextActiveRates),
                baseHistory: nextHistory.map(r => ({ effectiveFrom: r.effectiveFrom, rates: cloneRates(r.rates) })),
                edited: false,
            };
        }
        setHasRateSessionEdits(false);
        showToast('Rate revision removed.', 'info');
    };

    const handleRateChange = (rateType: keyof Rates, category: Category, value: number) => {
        const updatedRates: Rates = {
            ...cloneRates(displayedRates),
            [rateType]: {
                ...displayedRates[rateType],
                [category]: value || 0,
            },
        };

        if (!rateSessionRef.current) {
            rateSessionRef.current = {
                baseRates: cloneRates(settings.rates),
                baseHistory: (settings.rateHistory || []).map(r => ({ effectiveFrom: r.effectiveFrom, rates: cloneRates(r.rates) })),
                edited: false,
            };
        }

        rateSessionRef.current.edited = true;
        setHasRateSessionEdits(true);
        const { rates: activeTodayRates, rateHistory } = applyRevisionToHistory(
            rateSessionRef.current.baseRates,
            rateSessionRef.current.baseHistory,
            rateEffectiveDate,
            updatedRates
        );
        setSettings(prev => ({ ...prev, rates: activeTodayRates, rateHistory }));
    };
    
     const handleOpeningBalanceChange = (
        type: keyof MonthlyBalanceData,
        category: Category,
        value: string
    ) => {
        const numValue = parseFloat(value) || 0;
        setSettings(prev => ({
            ...prev,
            initialOpeningBalance: {
                ...(prev.initialOpeningBalance || { 
                    rice: { balvatika: 0, primary: 0, middle: 0 }, 
                    cash: { balvatika: 0, primary: 0, middle: 0 } 
                }),
                [type]: {
                    ...(prev.initialOpeningBalance?.[type] || { balvatika: 0, primary: 0, middle: 0 }),
                    [category]: numValue,
                },
            },
        }));
    };
    
    const handleNotificationChange = (field: keyof NotificationSettings, value: string | boolean) => {
        const finalValue = typeof value === 'boolean' ? value : parseInt(value, 10) || 0;
        setSettings(prev => ({
            ...prev,
            notificationSettings: {
                ...(prev.notificationSettings || { enabled: true, lowRiceThreshold: 10, lowCashThreshold: 500, backupReminderFrequency: 30 }),
                [field]: finalValue,
            },
        }));
    };

    const handleCookChange = (id: string, field: keyof CookCumHelper, value: string | number) => {
        setSettings(prev => ({
            ...prev,
            cooks: prev.cooks.map(cook => cook.id === id ? { ...cook, [field]: value } : cook)
        }));
    };

    const addCook = () => {
        const newCook: CookCumHelper = { id: nanoid(), name: '', gender: 'Female', category: 'GEN', paymentMode: 'Bank', amountPaid: 0 };
        setSettings(prev => ({...prev, cooks: [...prev.cooks, newCook]}));
    };

    const removeCook = (id: string) => {
        setSettings(prev => ({ ...prev, cooks: prev.cooks.filter(cook => cook.id !== id) }));
    };

    const handleHealthChange = (field: keyof Settings['healthStatus'], value: string) => {
        setSettings(prev => ({ ...prev, healthStatus: { ...prev.healthStatus, [field]: parseInt(value) || 0 }}));
    }

    const handleInspectionChange = (field: keyof InspectionReport, value: string | boolean) => {
        let finalValue: string | boolean | number = value;
        if (field === 'incidentsCount') {
            finalValue = parseInt(value as string, 10) || 0;
        } else {
            finalValue = value;
        }
        setSettings(prev => ({ ...prev, inspectionReport: { ...prev.inspectionReport, [field]: finalValue } }));
    };
    
    useEffect(() => {
        const isUdiseCorrectLength = settings.schoolDetails.udise.length === 11 || settings.schoolDetails.udise.length === 0;
        setIsUdiseValid(isUdiseCorrectLength);
        
        updateSettings(settings);
    }, [settings, updateSettings]);

    const { middleClasses, primaryClasses, prePrimaryClasses, grandTotal } = useMemo(() => {
        const classOrder = CLASS_STRUCTURE.reduce((acc, c, index) => {
            acc[c.id] = index;
            return acc;
        }, {} as Record<string, number>);

        const sortFunction = (a: ClassRoll, b: ClassRoll) => (classOrder[a.id] ?? 99) - (classOrder[b.id] ?? 99);
        
        const allRolls = displayedClassRolls || [];
        
        const middle = allRolls.filter(c => ['c6', 'c7', 'c8'].includes(c.id)).sort(sortFunction);
        const primary = allRolls.filter(c => ['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)).sort(sortFunction);
        const prePrimary = allRolls.filter(c => ['bal', 'pp1', 'pp2'].includes(c.id)).sort(sortFunction);

        const total = calculateSectionTotals(allRolls);
        return { middleClasses: middle, primaryClasses: primary, prePrimaryClasses: prePrimary, grandTotal: total };
    }, [displayedClassRolls]);

    const middleTotals = useMemo(() => calculateSectionTotals(middleClasses), [middleClasses]);
    const primaryTotals = useMemo(() => calculateSectionTotals(primaryClasses), [primaryClasses]);
    const prePrimaryTotals = useMemo(() => calculateSectionTotals(prePrimaryClasses), [prePrimaryClasses]);

    const foodRateTotals = useMemo(() => {
        const rates = displayedRates;
        const dalVeg = rates.dalVeg || { balvatika: 0, primary: 0, middle: 0 };
        const oilCond = rates.oilCond || { balvatika: 0, primary: 0, middle: 0 };
        const salt = rates.salt || { balvatika: 0, primary: 0, middle: 0 };
        const fuel = rates.fuel || { balvatika: 0, primary: 0, middle: 0 };
        
        const balvatika = dalVeg.balvatika + oilCond.balvatika + salt.balvatika + fuel.balvatika;
        const primary = dalVeg.primary + oilCond.primary + salt.primary + fuel.primary;
        const middle = dalVeg.middle + oilCond.middle + salt.middle + fuel.middle;
        
        return {
            balvatika: parseFloat(balvatika.toPrecision(15)),
            primary: parseFloat(primary.toPrecision(15)),
            middle: parseFloat(middle.toPrecision(15)),
        };
    }, [displayedRates]);

    return (
        <div className="pb-8">
            <div className="space-y-4">
                <Accordion defaultOpenId="general">
                    <AccordionItem id="general" title="General & School Details">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">School Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input containerClassName="md:col-span-2" label="School Name" id="schoolName" value={settings.schoolDetails.name} onChange={e => handleSchoolDetailsChange('name', e.target.value)} required />
                                    <div className="md:col-span-2">
                                        <Input 
                                            label="UDISE Code (11 digits)" 
                                            id="udise" 
                                            type="number" 
                                            value={settings.schoolDetails.udise} 
                                            onChange={e => handleSchoolDetailsChange('udise', e.target.value)}
                                            onInput={(e) => { if (e.currentTarget.value.length > 11) e.currentTarget.value = e.currentTarget.value.slice(0, 11); }}
                                            className={!isUdiseValid ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
                                        />
                                        {!isUdiseValid ? (
                                            <p className="mt-1 text-xs text-red-500 dark:text-red-400">UDISE code must be 11 digits long.</p>
                                        ) : (
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Unified District Information System for Education code.</p>
                                        )}
                                    </div>
                                    
                                    <Select
                                        id="schoolTypeMDCF"
                                        label="School Type"
                                        value={settings.schoolDetails.schoolTypeMDCF}
                                        onChange={v => handleSchoolDetailsChange('schoolTypeMDCF', v)}
                                        placeholder="Select Type"
                                        options={[
                                            { value: 'Government', label: 'Government' },
                                            { value: 'Local Body', label: 'Local Body' },
                                            { value: 'EGS/AIE Centers', label: 'EGS/AIE Centers' },
                                            { value: 'NCLP', label: 'NCLP' },
                                            { value: 'Madras / Maqtab', label: 'Madras / Maqtab' },
                                        ]}
                                    />
                                    <Select
                                        id="schoolCategoryMDCF"
                                        label="School Category"
                                        value={settings.schoolDetails.schoolCategoryMDCF}
                                        onChange={v => handleSchoolDetailsChange('schoolCategoryMDCF', v)}
                                        options={[
                                            { value: 'Primary', label: 'Primary' },
                                            { value: 'Upper Primary', label: 'Upper Primary' },
                                            { value: 'Primary with Upper Primary', label: 'Primary with Upper Primary' },
                                        ]}
                                    />

                                    <Input label="Kitchen Type" id="kitchenType" value={settings.schoolDetails.kitchenType} onChange={e => handleSchoolDetailsChange('kitchenType', e.target.value)} />

                                    <Select
                                        id="state"
                                        label="State"
                                        value={settings.schoolDetails.state}
                                        onChange={v => handleSchoolDetailsChange('state', v)}
                                        placeholder="Select State"
                                        searchable
                                        options={indianStates.map(state => ({ value: state.name, label: state.name }))}
                                    />

                                    <Select
                                        id="district"
                                        label="District"
                                        value={settings.schoolDetails.district}
                                        onChange={v => handleSchoolDetailsChange('district', v)}
                                        disabled={!settings.schoolDetails.state || availableDistricts.length === 0}
                                        placeholder="Select District"
                                        searchable
                                        options={availableDistricts.map(district => ({ value: district, label: district }))}
                                    />

                                    {settings.schoolDetails.state === 'Jammu and Kashmir' ? (
                                        <Select
                                            id="block"
                                            label="Block/Educational Zone"
                                            value={settings.schoolDetails.block}
                                            onChange={v => handleSchoolDetailsChange('block', v)}
                                            disabled={!settings.schoolDetails.district || availableZones.length === 0}
                                            placeholder="Select Zone"
                                            searchable
                                            options={availableZones.map(zone => ({ value: zone, label: zone }))}
                                        />
                                    ) : (
                                        <Input label="Block" id="block" value={settings.schoolDetails.block} onChange={e => handleSchoolDetailsChange('block', e.target.value)} required />
                                    )}
                                    <Input label="Village/Ward" id="village" value={settings.schoolDetails.village} onChange={e => handleSchoolDetailsChange('village', e.target.value)} required />
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">MDM Incharge (App User)</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Details of the person primarily using this application. This name appears on reports.</p>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input 
                                        label="Incharge's Name" 
                                        id="incharge-name" 
                                        value={settings.mdmIncharge?.name || ''} 
                                        onChange={e => handleInchargeChange('name', e.target.value)} 
                                        required
                                    />
                                    <Input 
                                        label="Contact Number" 
                                        id="incharge-contact" 
                                        type="tel" 
                                        maxLength={10}
                                        value={settings.mdmIncharge?.contact || ''} 
                                        onChange={e => handleInchargeChange('contact', e.target.value)}
                                        onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
                                    />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Head of the Institution</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Official's name for signature blocks on all generated reports.</p>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input 
                                        label="Head's Name" 
                                        id="head-name" 
                                        value={settings.headOfInstitution?.name || ''} 
                                        onChange={e => handleHeadChange('name', e.target.value)} 
                                        required
                                    />
                                    <Input 
                                        label="Contact Number" 
                                        id="head-contact" 
                                        type="tel" 
                                        maxLength={10}
                                        value={settings.headOfInstitution?.contact || ''} 
                                        onChange={e => handleHeadChange('contact', e.target.value)}
                                        onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preferences</h3>
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <div>
                                        <label htmlFor="auto-overwrite" className="font-medium text-slate-700 dark:text-slate-300">Auto-overwrite entry</label>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Automatically overwrite daily entries without asking.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="auto-overwrite" className="sr-only peer" checked={settings.autoOverwrite} onChange={e => setSettings(p => ({...p, autoOverwrite: e.target.checked}))} />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </AccordionItem>
                    
                    <AccordionItem id="notifications" title="Notifications">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div>
                                    <label htmlFor="notifications-enabled" className="font-medium text-slate-700 dark:text-slate-300">Enable Notifications</label>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Show alerts for low stock and backup reminders.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="notifications-enabled" className="sr-only peer" checked={settings.notificationSettings?.enabled} onChange={e => handleNotificationChange('enabled', e.target.checked)} />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            {settings.notificationSettings?.enabled && (
                                <div className="space-y-3">
                                    <Input 
                                        label="Low Rice Threshold (kg)" 
                                        id="low-rice" type="number" 
                                        min="0"
                                        value={settings.notificationSettings.lowRiceThreshold} 
                                        onChange={e => handleNotificationChange('lowRiceThreshold', e.target.value)} 
                                    />
                                    <Input 
                                        label="Low Cash Threshold (₹)" 
                                        id="low-cash" 
                                        type="number" 
                                        min="0"
                                        value={settings.notificationSettings.lowCashThreshold} 
                                        onChange={e => handleNotificationChange('lowCashThreshold', e.target.value)} 
                                    />
                                    <Input 
                                        label="Backup Reminder Frequency (days)" 
                                        id="backup-freq" 
                                        type="number" 
                                        min="0"
                                        value={settings.notificationSettings.backupReminderFrequency} 
                                        onChange={e => handleNotificationChange('backupReminderFrequency', e.target.value)} 
                                    />
                                </div>
                            )}
                        </div>
                    </AccordionItem>
                    <AccordionItem id="enrollment" title="Student Enrollment (Roll Statement)">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div>
                                    <label htmlFor="edit-enrollment" className="font-medium text-slate-700 dark:text-slate-300">Edit Enrollment</label>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Enable to update class-wise student enrollment from a specific date.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="edit-enrollment" className="sr-only peer" checked={isEnrollmentEditable} onChange={e => handleToggleEnrollmentEditable(e.target.checked)} />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            {isEnrollmentEditable && (
                                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/50 space-y-2.5">
                                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                        <div className="flex-1">
                                            <DatePicker
                                                id="enrollment-effective-date"
                                                label="Effective From Date"
                                                value={enrollmentEffectiveDate}
                                                onChange={handleEnrollmentEffectiveDateChange}
                                            />
                                        </div>
                                        {hasEnrollmentSessionEdits && (
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={handleCommitAndAddAnotherEnrollmentDate}
                                                >
                                                    + Add Another Date
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => handleToggleEnrollmentEditable(false)}
                                                >
                                                    Done
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        Changes apply to entries and reports on or after this date. Earlier months and sessions retain their previous roll statement.
                                    </p>
                                </div>
                            )}

                            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                                <table className="min-w-[540px] w-full text-xs text-center border-collapse">
                                    <thead className="bg-slate-50/95 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
                                        <tr>
                                            <th rowSpan={2} className="px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Class</th>
                                            <th colSpan={2} className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/70 dark:border-slate-800">General</th>
                                            <th colSpan={2} className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/70 dark:border-slate-800">ST/SC</th>
                                            <th colSpan={2} className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/70 dark:border-slate-800">Total</th>
                                            <th rowSpan={2} className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">On Roll</th>
                                        </tr>
                                        <tr>
                                            <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Boys</th>
                                            <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Girls</th>
                                            <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Boys</th>
                                            <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Girls</th>
                                            <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Boys</th>
                                            <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Girls</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-950">
                                        {[
                                            { title: 'Middle (VI-VIII)', classes: middleClasses, totals: middleTotals },
                                            { title: 'Primary (I-V)', classes: primaryClasses, totals: primaryTotals },
                                            { title: 'Pre-Primary', classes: prePrimaryClasses, totals: prePrimaryTotals }
                                        ].map(section => section.classes.length > 0 && (
                                            <React.Fragment key={section.title}>
                                                <tr className="bg-slate-50/80 dark:bg-slate-900/40">
                                                    <td colSpan={8} className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 text-left">{section.title}</td>
                                                </tr>
                                                {section.classes.map(cr => {
                                                    const totalBoys = cr.general.boys + cr.stsc.boys;
                                                    const totalGirls = cr.general.girls + cr.stsc.girls;
                                                    const onRoll = totalBoys + totalGirls;
                                                    return (
                                                        <tr key={cr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors tabular-nums">
                                                            <td className="px-2.5 py-2 text-left font-medium text-slate-700 dark:text-slate-300">{cr.name}</td>
                                                            <td className="p-1"><input type="number" min="0" value={cr.general.boys} disabled={!isEnrollmentEditable} onChange={e => handleClassRollChange(cr.id, 'general', 'boys', e.target.value)} className="w-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1 text-center tabular-nums focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"/></td>
                                                            <td className="p-1"><input type="number" min="0" value={cr.general.girls} disabled={!isEnrollmentEditable} onChange={e => handleClassRollChange(cr.id, 'general', 'girls', e.target.value)} className="w-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1 text-center tabular-nums focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"/></td>
                                                            <td className="p-1"><input type="number" min="0" value={cr.stsc.boys} disabled={!isEnrollmentEditable} onChange={e => handleClassRollChange(cr.id, 'stsc', 'boys', e.target.value)} className="w-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1 text-center tabular-nums focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"/></td>
                                                            <td className="p-1"><input type="number" min="0" value={cr.stsc.girls} disabled={!isEnrollmentEditable} onChange={e => handleClassRollChange(cr.id, 'stsc', 'girls', e.target.value)} className="w-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1 text-center tabular-nums focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"/></td>
                                                            <td className="px-2 py-2 font-medium text-slate-700 dark:text-slate-300">{totalBoys}</td>
                                                            <td className="px-2 py-2 font-medium text-slate-700 dark:text-slate-300">{totalGirls}</td>
                                                            <td className="px-2.5 py-2 font-semibold bg-indigo-50/40 dark:bg-indigo-950/25 text-indigo-700 dark:text-indigo-300">{onRoll}</td>
                                                        </tr>
                                                    );
                                                })}
                                                <SectionTotalRow label={`${section.title.split(' ')[0]} Total`} totals={section.totals} />
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <SectionTotalRow label="Grand Total" totals={grandTotal} />
                                    </tfoot>
                                </table>
                            </div>

                            {settings.enrollmentHistory && settings.enrollmentHistory.length > 0 && (
                                <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Enrollment Revision History
                                    </p>
                                    <div className="space-y-2">
                                        {[...settings.enrollmentHistory]
                                            .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
                                            .map(rev => {
                                                const catTotals = getOnRollTotalsFromClassRolls(rev.classRolls);
                                                const totalRoll = catTotals.balvatika + catTotals.primary + catTotals.middle;
                                                const isBase = rev.effectiveFrom === '1970-01-01';
                                                const dateLabel = isBase
                                                    ? 'Base Enrollment (Prior Records)'
                                                    : `Effective from ${new Date(rev.effectiveFrom + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
                                                return (
                                                    <div key={rev.effectiveFrom} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                                        <div>
                                                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{dateLabel}</p>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                                                                On Roll — Bal: {catTotals.balvatika} • Pri: {catTotals.primary} • Mid: {catTotals.middle} | Total: {totalRoll}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Button
                                                                type="button"
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => handleEditEnrollmentRevision(rev.effectiveFrom)}
                                                            >
                                                                Edit
                                                            </Button>
                                                            {!isBase && (
                                                                <Button
                                                                    type="button"
                                                                    variant="danger"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteEnrollmentRevision(rev.effectiveFrom)}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </AccordionItem>
                    
                    <AccordionItem id="finance" title="Financial, Stock & Rates">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Initial Opening Balance</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                    Set this once during initial setup. It acts as the starting balance for your records. After the first month, balances will roll over automatically.
                                </p>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Opening Rice Balance (kg)</p>
                                        <div className="grid grid-cols-3 gap-2.5">
                                            <Input label="Balvatika" id="ob-rice-bal" type="number" step="0.001" value={settings.initialOpeningBalance?.rice?.balvatika || 0} onChange={e => handleOpeningBalanceChange('rice', 'balvatika', e.target.value)} />
                                            <Input label="Primary" id="ob-rice-pri" type="number" step="0.001" value={settings.initialOpeningBalance?.rice?.primary || 0} onChange={e => handleOpeningBalanceChange('rice', 'primary', e.target.value)} />
                                            <Input label="Middle" id="ob-rice-mid" type="number" step="0.001" value={settings.initialOpeningBalance?.rice?.middle || 0} onChange={e => handleOpeningBalanceChange('rice', 'middle', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Opening Cash Balance (₹)</p>
                                        <div className="grid grid-cols-3 gap-2.5">
                                            <Input label="Balvatika" id="ob-cash-bal" type="number" step="0.01" value={settings.initialOpeningBalance?.cash?.balvatika || 0} onChange={e => handleOpeningBalanceChange('cash', 'balvatika', e.target.value)} />
                                            <Input label="Primary" id="ob-cash-pri" type="number" step="0.01" value={settings.initialOpeningBalance?.cash?.primary || 0} onChange={e => handleOpeningBalanceChange('cash', 'primary', e.target.value)} />
                                            <Input label="Middle" id="ob-cash-mid" type="number" step="0.01" value={settings.initialOpeningBalance?.cash?.middle || 0} onChange={e => handleOpeningBalanceChange('cash', 'middle', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                                        <Input 
                                            label="MME Expenditure for this month (₹)" 
                                            id="mme-expenditure" 
                                            type="number" 
                                            step="0.01"
                                            min="0"
                                            value={settings.mmeExpenditure || 0}
                                            onChange={e => setSettings(prev => ({ ...prev, mmeExpenditure: parseFloat(e.target.value) || 0 }))}
                                        />
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Management, Monitoring, and Evaluation expenditure. Required for the MDCF report.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Food Rate Configuration</h3>
                                <div className="flex items-center justify-between p-4 mb-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <div>
                                        <label htmlFor="edit-rates" className="font-medium text-slate-700 dark:text-slate-300">Edit Food Rates</label>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Enable to adjust per-student rates from a specific date.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="edit-rates" className="sr-only peer" checked={isRatesEditable} onChange={e => handleToggleRatesEditable(e.target.checked)} />
                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                {isRatesEditable && (
                                    <div className="p-3.5 mb-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/50 space-y-2.5">
                                        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                            <div className="flex-1">
                                                <DatePicker
                                                    id="rate-effective-date"
                                                    label="Effective From Date"
                                                    value={rateEffectiveDate}
                                                    onChange={handleEffectiveDateChange}
                                                />
                                            </div>
                                            {hasRateSessionEdits && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={handleCommitAndAddAnotherDate}
                                                    >
                                                        + Add Another Date
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => handleToggleRatesEditable(false)}
                                                    >
                                                        Done
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            Changes apply to entries on or after this date. All earlier months and entries keep their previous rates.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-4 text-xs">
                                    {(Object.keys(displayedRates) as Array<keyof Rates>).map(rateKey => {
                                        const isRice = rateKey === 'rice';
                                        const currentStep = isRice ? 1 : 0.01;
                                        const currentMax = isRice ? 1000 : 999;
                                        return (
                                        <div key={rateKey}>
                                            <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2 capitalize">
                                                {rateKey.replace(/([A-Z])/g, ' $1')}
                                                {isRice && <span className="font-normal text-slate-500"> (in grams)</span>}
                                            </p>
                                            <div className="grid grid-cols-3 gap-2">
                                                <NumberInput label="Balvatika" id={`${rateKey}-bal`} step={currentStep} value={displayedRates[rateKey].balvatika} onChange={val => handleRateChange(rateKey, 'balvatika', val)} min={0} max={currentMax} disabled={!isRatesEditable} />
                                                <NumberInput label="Primary" id={`${rateKey}-pri`} step={currentStep} value={displayedRates[rateKey].primary} onChange={val => handleRateChange(rateKey, 'primary', val)} min={0} max={currentMax} disabled={!isRatesEditable} />
                                                <NumberInput label="Middle" id={`${rateKey}-mid`} step={currentStep} value={displayedRates[rateKey].middle} onChange={val => handleRateChange(rateKey, 'middle', val)} min={0} max={currentMax} disabled={!isRatesEditable} />
                                            </div>
                                        </div>
                                        )
                                    })}
                                    <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                                            Total Per Student Cost (₹)
                                        </p>
                                        <div className="grid grid-cols-3 gap-2.5">
                                            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center">
                                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Balvatika</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">₹{foodRateTotals.balvatika.toFixed(2)}</p>
                                            </div>
                                            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center">
                                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Primary</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">₹{foodRateTotals.primary.toFixed(2)}</p>
                                            </div>
                                            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center">
                                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Middle</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">₹{foodRateTotals.middle.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Auto-calculated sum of Dal/Veg, Oil/Cond, Salt, and Fuel rates.</p>
                                    </div>

                                    {settings.rateHistory && settings.rateHistory.length > 0 && (
                                        <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                Rate Revision History
                                            </p>
                                            <div className="space-y-2">
                                                {[...settings.rateHistory]
                                                    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
                                                    .map(rev => {
                                                        const balCost = (rev.rates.dalVeg?.balvatika || 0) + (rev.rates.oilCond?.balvatika || 0) + (rev.rates.salt?.balvatika || 0) + (rev.rates.fuel?.balvatika || 0);
                                                        const priCost = (rev.rates.dalVeg?.primary || 0) + (rev.rates.oilCond?.primary || 0) + (rev.rates.salt?.primary || 0) + (rev.rates.fuel?.primary || 0);
                                                        const midCost = (rev.rates.dalVeg?.middle || 0) + (rev.rates.oilCond?.middle || 0) + (rev.rates.salt?.middle || 0) + (rev.rates.fuel?.middle || 0);
                                                        const isBase = rev.effectiveFrom === '1970-01-01';
                                                        const dateLabel = isBase
                                                            ? 'Base Rate (Prior Records)'
                                                            : `Effective from ${new Date(rev.effectiveFrom + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
                                                        return (
                                                            <div key={rev.effectiveFrom} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                                                <div>
                                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{dateLabel}</p>
                                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                                                                        Cost/Student — Bal: ₹{balCost.toFixed(2)} • Pri: ₹{priCost.toFixed(2)} • Mid: ₹{midCost.toFixed(2)} | Rice: {rev.rates.rice?.primary || 0}g/{rev.rates.rice?.middle || 0}g
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <Button
                                                                        type="button"
                                                                        variant="secondary"
                                                                        size="sm"
                                                                        onClick={() => handleEditHistoryRevision(rev.effectiveFrom)}
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                    {!isBase && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="danger"
                                                                            size="sm"
                                                                            onClick={() => handleDeleteHistoryRevision(rev.effectiveFrom)}
                                                                        >
                                                                            Remove
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </AccordionItem>

                    <AccordionItem id="staff" title="Staff & Health Records">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Cook-Cum-Helper Details</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">This information is used for the official MDCF report.</p>
                                <div className="space-y-3">
                                    {settings.cooks.map((cook, index) => (
                                        <div key={cook.id} className="p-4 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/60 dark:bg-slate-900/30">
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Cook #{index + 1}</p>
                                                <Button variant="danger" size="sm" onClick={() => removeCook(cook.id)}>Remove</Button>
                                            </div>
                                            <Input label="Name" id={`cook-name-${cook.id}`} value={cook.name} onChange={e => handleCookChange(cook.id, 'name', e.target.value)} required />
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <Select
                                                    id={`cook-gender-${cook.id}`}
                                                    label="Gender"
                                                    value={cook.gender}
                                                    onChange={v => handleCookChange(cook.id, 'gender', v)}
                                                    options={[
                                                        { value: 'Male', label: 'Male' },
                                                        { value: 'Female', label: 'Female' },
                                                        { value: 'Other', label: 'Other' },
                                                    ]}
                                                />
                                                <Select
                                                    id={`cook-category-${cook.id}`}
                                                    label="Category"
                                                    value={cook.category}
                                                    onChange={v => handleCookChange(cook.id, 'category', v)}
                                                    options={[
                                                        { value: 'GEN', label: 'GEN' },
                                                        { value: 'OBC', label: 'OBC' },
                                                        { value: 'SC', label: 'SC' },
                                                        { value: 'ST', label: 'ST' },
                                                    ]}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <Select
                                                    id={`cook-payment-${cook.id}`}
                                                    label="Payment Mode"
                                                    value={cook.paymentMode}
                                                    onChange={v => handleCookChange(cook.id, 'paymentMode', v)}
                                                    options={[
                                                        { value: 'Bank', label: 'Bank' },
                                                        { value: 'Cash', label: 'Cash' },
                                                        { value: 'Cheque', label: 'Cheque' },
                                                    ]}
                                                />
                                                <Input label="Amount Paid (₹)" id={`cook-amount-${cook.id}`} type="number" min="0" value={cook.amountPaid} onChange={e => handleCookChange(cook.id, 'amountPaid', parseFloat(e.target.value) || 0)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button onClick={addCook} variant="secondary" className="w-full mt-4">Add Cook</Button>
                            </div>

                            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Health Status</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Data for the monthly MDCF report.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input label="IFA Tablets (Boys)" id="ifa-boys" type="number" min="0" value={settings.healthStatus.ifaBoys} onChange={e => handleHealthChange('ifaBoys', e.target.value)} />
                                    <Input label="IFA Tablets (Girls)" id="ifa-girls" type="number" min="0" value={settings.healthStatus.ifaGirls} onChange={e => handleHealthChange('ifaGirls', e.target.value)} />
                                    <Input label="Screened by RBSK Team" id="screened-rbsk" type="number" min="0" value={settings.healthStatus.screenedByRBSK} onChange={e => handleHealthChange('screenedByRBSK', e.target.value)} />
                                    <Input label="Referred by RBSK Team" id="referred-rbsk" type="number" min="0" value={settings.healthStatus.referredByRBSK} onChange={e => handleHealthChange('referredByRBSK', e.target.value)} />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Inspection Report</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Data for the monthly MDCF report.</p>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                        <div>
                                            <label htmlFor="inspected" className="font-medium text-slate-700 dark:text-slate-300">Was an inspection done this month?</label>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="inspected" className="sr-only peer" checked={settings.inspectionReport.inspected} onChange={e => handleInspectionChange('inspected', e.target.checked)} />
                                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    {settings.inspectionReport.inspected && (
                                        <Select
                                            id="inspected-by"
                                            label="Inspected by"
                                            value={settings.inspectionReport.inspectedBy}
                                            onChange={v => handleInspectionChange('inspectedBy', v as InspectionAuthority)}
                                            placeholder="Select Inspector"
                                            options={[
                                                { value: 'Task Force', label: 'Members of Task Force' },
                                                { value: 'District Officials', label: 'District Officials' },
                                                { value: 'Block Officials', label: 'Block/Taluka Level Officials' },
                                                { value: 'SMC Members', label: 'SMC Members' },
                                            ]}
                                        />
                                    )}
                                    <Input label="Number of untoward incidents" id="incidents" type="number" min="0" value={settings.inspectionReport.incidentsCount} onChange={e => handleInspectionChange('incidentsCount', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </AccordionItem>
                    <AccordionItem id="data" title="Data Management & Help">
                        <DataManagement />
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
};

export default SettingsPage;