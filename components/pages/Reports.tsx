import React, { useState, useMemo, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import Modal from '../ui/Modal';
import { Category, CookCumHelper, InspectionAuthority, Settings } from '../../types';
import PDFPreviewModal from '../ui/PDFPreviewModal';
import { generatePDFReport, PdfExportOptions } from '../../services/pdfGenerator';
import { calculateMonthlySummary } from '../../services/summaryCalculator';
import { Accordion, AccordionItem } from '../ui/Accordion';
import NumberInput from '../ui/NumberInput';
import { FileText, Sparkles, ShieldCheck } from 'lucide-react';

const reportDescriptions: Record<string, string> = {
    mdcf: "Generates the official Monthly Data Collection Format (MDCF) required for government reporting.",
    roll_statement: "Creates a summary of student enrollment numbers by class and social category.",
    daily_consumption: "Produces a detailed register log of daily meals, attendance, and expenditure for the selected month.",
    rice_requirement: "Generates a formal certificate for the monthly rice requirement based on enrollment and working days.",
    yearly_consumption_detailed: "A comprehensive yearly report with category-wise monthly breakdowns of consumption, stock, and funds.",
    receipts_ledger: "Exports a complete audit ledger of all rice allotments and fund receipts received.",
};

type MdcfDataType = Partial<Pick<Settings, 'healthStatus' | 'inspectionReport' | 'cooks' | 'mmeExpenditure'>>;

const Reports: React.FC = () => {
    const { data } = useData();
    const { showToast } = useToast();

    const [reportType, setReportType] = useState('mdcf');
    const [themeColor, setThemeColor] = useState<'navy' | 'indigo' | 'slate' | 'classic'>('navy');
    const [watermarkText, setWatermarkText] = useState('');

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    });

    const financialYearOptions = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const endYear = currentMonth < 3 ? currentYear : currentYear + 1;
        const options = [];
        for (let i = 0; i < 5; i++) {
            const year = endYear - i;
            options.push(`${year - 1}-${year}`);
        }
        return options;
    }, []);
    const [selectedFinancialYear, setSelectedFinancialYear] = useState(financialYearOptions[0]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [pdfPreviewData, setPdfPreviewData] = useState<{
        blobUrl: string;
        pdfBlob: Blob;
        filename: string;
        generationData?: MdcfDataType;
    } | null>(null);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [reportSummary, setReportSummary] = useState<Record<string, string | number> | null>(null);

    const [isMdcfModalOpen, setIsMdcfModalOpen] = useState(false);
    const [mdcfData, setMdcfData] = useState<MdcfDataType | null>(null);

    useEffect(() => {
        if (pdfPreviewData) {
            URL.revokeObjectURL(pdfPreviewData.blobUrl);
            setPdfPreviewData(null);
        }
    }, [reportType, selectedMonth, selectedFinancialYear, themeColor, watermarkText]);

    const initiateReportGeneration = () => {
        if (reportType === 'mdcf') {
            setMdcfData({
                healthStatus: JSON.parse(JSON.stringify(data.settings.healthStatus)),
                inspectionReport: JSON.parse(JSON.stringify(data.settings.inspectionReport)),
                cooks: JSON.parse(JSON.stringify(data.settings.cooks)),
                mmeExpenditure: data.settings.mmeExpenditure,
            });
            setIsMdcfModalOpen(true);
            return;
        }

        const summary = calculateMonthlySummary(data, selectedMonth);
        const { totals, monthEntries } = summary;

        let newSummary: Record<string, string | number> = {};
        const monthDate = new Date(`${selectedMonth}-02T00:00:00`);
        const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        switch (reportType) {
            case 'daily_consumption':
                newSummary = {
                    Report: 'Daily Consumption Register',
                    'For Month': monthName,
                    'Total Meal Days': monthEntries.filter(e => e.totalPresent > 0).length,
                    'Rice Consumed': `${totals.rice.toFixed(3)} kg`,
                    'Total Expenditure': `Rs. ${totals.expenditure.toFixed(2)}`,
                };
                break;
            case 'roll_statement':
                const totalEnrollment = data.settings.classRolls.reduce(
                    (sum, c) => sum + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls,
                    0
                );
                newSummary = { Report: 'Roll Statement', 'Total Enrollment': totalEnrollment };
                break;
            case 'rice_requirement':
                const workingDays = monthEntries.filter(e => e.totalPresent > 0).length;
                const enrollment = data.settings.classRolls.reduce(
                    (sum, c) => sum + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls,
                    0
                );
                const totalRiceKg = data.settings.classRolls.reduce((total, c) => {
                    let cat: Category | null = null;
                    if (['bal', 'pp1', 'pp2'].includes(c.id)) cat = 'balvatika';
                    else if (['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)) cat = 'primary';
                    else if (['c6', 'c7', 'c8'].includes(c.id)) cat = 'middle';
                    if (cat) {
                        const classRoll = c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls;
                        total += (classRoll * workingDays * data.settings.rates.rice[cat]) / 1000;
                    }
                    return total;
                }, 0);
                newSummary = {
                    Report: 'Rice Requirement Certificate',
                    'For Month': monthName,
                    'Total Enrollment': enrollment,
                    'Working Days': workingDays,
                    'Total Rice Required': `${totalRiceKg.toFixed(3)} kg`,
                };
                break;
            case 'yearly_consumption_detailed':
                newSummary = {
                    Report: 'Detailed Yearly Consumption Report',
                    'For Financial Year': selectedFinancialYear,
                    Note: 'This report compiles category-wise details for each month in the financial year.',
                };
                break;
            case 'receipts_ledger':
                newSummary = {
                    Report: 'Allotment & Receipts Register',
                    'Total Receipts Recorded': data.receipts.length,
                };
                break;
        }

        setReportSummary(newSummary);
        setIsConfirmModalOpen(true);
    };

    const handleReportExport = (overrideData?: MdcfDataType) => {
        setIsGenerating(true);
        setTimeout(async () => {
            try {
                if (pdfPreviewData) {
                    URL.revokeObjectURL(pdfPreviewData.blobUrl);
                }

                const parameter = ['yearly_consumption_detailed'].includes(reportType)
                    ? selectedFinancialYear
                    : selectedMonth;

                const pdfOptions: PdfExportOptions = {
                    themeColor,
                    watermarkText,
                };

                const { pdfBlob, filename } = generatePDFReport(reportType, data, parameter, overrideData, pdfOptions);
                const blobUrl = URL.createObjectURL(pdfBlob);

                setPdfPreviewData({
                    blobUrl: blobUrl,
                    pdfBlob: pdfBlob,
                    filename: filename,
                    generationData: overrideData,
                });

                if (!isPreviewOpen) setIsPreviewOpen(true);
                showToast('Pixel-perfect PDF generated!', 'success');
            } catch (error: any) {
                console.error('PDF generation failed:', error);
                showToast(error.message || 'Failed to generate PDF report.', 'error');
            } finally {
                setIsGenerating(false);
            }
        }, 50);
    };

    const handleClosePreview = () => {
        setIsPreviewOpen(false);
    };

    const handleRegenerate = () => {
        handleClosePreview();
        setTimeout(() => {
            if (reportType === 'mdcf') {
                setIsMdcfModalOpen(true);
            } else {
                initiateReportGeneration();
            }
        }, 100);
    };

    const handleMdcfChange = (section: keyof MdcfDataType, field: string, value: any) => {
        setMdcfData(prev => (prev ? { ...prev, [section]: { ...(prev as any)[section], [field]: value } } : null));
    };

    const handleMdcfCookChange = (id: string, field: keyof CookCumHelper, value: string | number) => {
        setMdcfData(prev =>
            prev ? { ...prev, cooks: prev.cooks?.map(cook => (cook.id === id ? { ...cook, [field]: value } : cook)) } : null
        );
    };

    const needsMonth = !['roll_statement', 'yearly_consumption_detailed', 'receipts_ledger'].includes(reportType);
    const needsYear = ['yearly_consumption_detailed'].includes(reportType);

    return (
        <>
            {isGenerating && (
                <div
                    className="fixed inset-0 z-[101] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
                    role="status"
                    aria-live="polite"
                >
                    <div className="flex flex-col items-center justify-center text-white">
                        <svg className="animate-spin h-10 w-10 text-white mb-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                        <p className="text-lg font-semibold">Creating Pixel-Perfect Document...</p>
                        <p className="text-sm text-gray-300">Applying layout, headers & page numbers.</p>
                    </div>
                </div>
            )}

            <PDFPreviewModal
                isOpen={isPreviewOpen}
                onClose={handleClosePreview}
                pdfUrl={pdfPreviewData?.blobUrl || ''}
                pdfBlob={pdfPreviewData?.pdfBlob || null}
                filename={pdfPreviewData?.filename || 'report.pdf'}
                onRegenerate={handleRegenerate}
            />

            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Report Export">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Please review the report summary below before generating.
                    </p>
                    {reportSummary && (
                        <div className="text-sm space-y-2 bg-indigo-50/60 dark:bg-slate-900/60 p-3.5 rounded-xl border border-indigo-100 dark:border-slate-800">
                            {Object.entries(reportSummary).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center text-xs sm:text-sm">
                                    <strong className="text-slate-700 dark:text-slate-300 pr-2">{key}:</strong>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-right">{value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setIsConfirmModalOpen(false);
                                handleReportExport();
                            }}
                        >
                            Generate Document
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isMdcfModalOpen}
                onClose={() => setIsMdcfModalOpen(false)}
                title={`Details for MDCF Report - ${new Date(selectedMonth + '-02').toLocaleString('default', {
                    month: 'long',
                    year: 'numeric',
                })}`}
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300 -mt-2">
                        Confirm or adjust monthly inspection, health, or cook payments before generating.
                    </p>
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                        {mdcfData && (
                            <Accordion defaultOpenId="health">
                                <AccordionItem id="health" title="Health Status">
                                    <div className="grid grid-cols-2 gap-3">
                                        <NumberInput
                                            label="IFA Tablets (Boys)"
                                            id="m-ifa-boys"
                                            min={0}
                                            value={mdcfData.healthStatus?.ifaBoys || 0}
                                            onChange={v => handleMdcfChange('healthStatus', 'ifaBoys', v)}
                                        />
                                        <NumberInput
                                            label="IFA Tablets (Girls)"
                                            id="m-ifa-girls"
                                            min={0}
                                            value={mdcfData.healthStatus?.ifaGirls || 0}
                                            onChange={v => handleMdcfChange('healthStatus', 'ifaGirls', v)}
                                        />
                                        <NumberInput
                                            label="Screened by RBSK"
                                            id="m-screened-rbsk"
                                            min={0}
                                            value={mdcfData.healthStatus?.screenedByRBSK || 0}
                                            onChange={v => handleMdcfChange('healthStatus', 'screenedByRBSK', v)}
                                        />
                                        <NumberInput
                                            label="Referred by RBSK"
                                            id="m-referred-rbsk"
                                            min={0}
                                            value={mdcfData.healthStatus?.referredByRBSK || 0}
                                            onChange={v => handleMdcfChange('healthStatus', 'referredByRBSK', v)}
                                        />
                                    </div>
                                </AccordionItem>
                                <AccordionItem id="inspection" title="Inspection Report">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                            <label htmlFor="m-inspected" className="font-medium text-slate-700 dark:text-slate-300 text-sm">
                                                Was an inspection conducted?
                                            </label>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    id="m-inspected"
                                                    className="sr-only peer"
                                                    checked={mdcfData.inspectionReport?.inspected}
                                                    onChange={e => handleMdcfChange('inspectionReport', 'inspected', e.target.checked)}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                        {mdcfData.inspectionReport?.inspected && (
                                            <div>
                                                <label htmlFor="m-inspected-by" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                                                    Inspected by:
                                                </label>
                                                <select
                                                    id="m-inspected-by"
                                                    value={mdcfData.inspectionReport.inspectedBy}
                                                    onChange={e => handleMdcfChange('inspectionReport', 'inspectedBy', e.target.value as InspectionAuthority)}
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                >
                                                    <option value="">Select Inspector</option>
                                                    <option value="Task Force">Task Force</option>
                                                    <option value="District Officials">District Officials</option>
                                                    <option value="Block Officials">Block Officials</option>
                                                    <option value="SMC Members">SMC Members</option>
                                                </select>
                                            </div>
                                        )}
                                        <NumberInput
                                            label="Untoward Incidents"
                                            id="m-incidents"
                                            min={0}
                                            value={mdcfData.inspectionReport?.incidentsCount || 0}
                                            onChange={v => handleMdcfChange('inspectionReport', 'incidentsCount', v)}
                                        />
                                    </div>
                                </AccordionItem>
                                <AccordionItem id="cooks" title="Cook-Cum-Helper Details">
                                    <div className="space-y-3">
                                        {mdcfData.cooks?.map((cook, index) => (
                                            <div key={cook.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                                                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                                    Cook #{index + 1}: {cook.name}
                                                </p>
                                                <NumberInput
                                                    label="Amount Paid this month (₹)"
                                                    id={`m-cook-amount-${cook.id}`}
                                                    min={0}
                                                    value={cook.amountPaid}
                                                    onChange={v => handleMdcfCookChange(cook.id, 'amountPaid', v)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </AccordionItem>
                                <AccordionItem id="mme" title="MME Expenditure">
                                    <NumberInput
                                        label="MME Expenditure this month (₹)"
                                        id="m-mme-expenditure"
                                        min={0}
                                        value={mdcfData.mmeExpenditure || 0}
                                        onChange={v => setMdcfData(p => (p ? { ...p, mmeExpenditure: v } : null))}
                                    />
                                </AccordionItem>
                            </Accordion>
                        )}
                    </div>
                    <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button variant="secondary" onClick={() => setIsMdcfModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setIsMdcfModalOpen(false);
                                handleReportExport(mdcfData || undefined);
                            }}
                        >
                            Export Document
                        </Button>
                    </div>
                </div>
            </Modal>

            <div className="space-y-4">
                <Card title="Document & Report Center">
                    <div className="space-y-4">
                        {/* Report Type Selector */}
                        <div>
                            <label htmlFor="report-type" className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
                                Report Document
                            </label>
                            <select
                                id="report-type"
                                value={reportType}
                                onChange={e => setReportType(e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                            >
                                <option value="mdcf">Monthly Data Collection Format (MDCF)</option>
                                <option value="roll_statement">Roll Statement (Student Enrollment)</option>
                                <option value="daily_consumption">Daily Consumption Register</option>
                                <option value="rice_requirement">Rice Requirement Certificate</option>
                                <option value="yearly_consumption_detailed">Yearly Detailed Consumption Register</option>
                                <option value="receipts_ledger">Allotment & Receipts Register</option>
                            </select>
                            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{reportDescriptions[reportType]}</p>
                        </div>

                        {/* Date Filters */}
                        {needsMonth && (
                            <div>
                                <label htmlFor="month-select" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                                    Select Month
                                </label>
                                <input
                                    id="month-select"
                                    type="month"
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                />
                            </div>
                        )}

                        {needsYear && (
                            <div>
                                <label htmlFor="year-select" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                                    Select Financial Year
                                </label>
                                <select
                                    id="year-select"
                                    value={selectedFinancialYear}
                                    onChange={e => setSelectedFinancialYear(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                >
                                    {financialYearOptions.map(year => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* PDF Options */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-indigo-500" /> PDF Style & Customization Options
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="theme-color" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                                        Header Theme Accent
                                    </label>
                                    <select
                                        id="theme-color"
                                        value={themeColor}
                                        onChange={e => setThemeColor(e.target.value as any)}
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-lg p-2 focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        <option value="navy">Government Official Navy</option>
                                        <option value="indigo">Executive Indigo</option>
                                        <option value="slate">Minimalist Slate</option>
                                        <option value="classic">Classic Grayscale</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="watermark-text" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                                        Watermark (Optional)
                                    </label>
                                    <input
                                        id="watermark-text"
                                        type="text"
                                        placeholder="e.g. OFFICIAL COPY, DUPLICATE"
                                        value={watermarkText}
                                        onChange={e => setWatermarkText(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-lg p-2 focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button onClick={initiateReportGeneration} className="w-full" disabled={isGenerating}>
                            Generate & Preview Pixel-Perfect PDF
                        </Button>

                        {pdfPreviewData && (
                            <Button variant="secondary" onClick={() => setIsPreviewOpen(true)} className="w-full">
                                Re-Open Last Generated Report ({pdfPreviewData.filename})
                            </Button>
                        )}
                    </div>
                </Card>

                {/* Audit Standards Card */}
                <Card>
                    <div className="flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
                        <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">Official Compliance & Audit Verification</p>
                            <p className="leading-relaxed">
                                Generated PDF reports include official page headers, UDISE metadata, signature lines for MDM Incharge & Head of Institution, and automated Page X of Y numbering as per PM POSHAN guidelines.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
};

export default Reports;
