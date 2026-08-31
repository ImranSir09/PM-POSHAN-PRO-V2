import { AppData, Category, ClassRoll, Settings } from '../types';
import { calculateMonthlySummary } from './summaryCalculator';

interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
    [key: string]: any;
}

declare const jspdf: any;

export interface PdfExportOptions {
    watermarkText?: string;
    themeColor?: 'navy' | 'indigo' | 'slate' | 'classic';
}

const getThemeColors = (theme: PdfExportOptions['themeColor'] = 'navy') => {
    switch (theme) {
        case 'indigo':
            return {
                headFill: [67, 56, 202], // indigo-700
                headText: [255, 255, 255],
                footFill: [224, 231, 255], // indigo-100
                footText: [30, 27, 75],
                alternateFill: [245, 247, 255],
            };
        case 'slate':
            return {
                headFill: [51, 65, 85], // slate-700
                headText: [255, 255, 255],
                footFill: [226, 232, 240], // slate-200
                footText: [15, 23, 42],
                alternateFill: [248, 250, 252],
            };
        case 'classic':
            return {
                headFill: [220, 220, 220],
                headText: [0, 0, 0],
                footFill: [200, 200, 200],
                footText: [0, 0, 0],
                alternateFill: [255, 255, 255],
            };
        case 'navy':
        default:
            return {
                headFill: [30, 58, 138], // blue-900 (Government official navy)
                headText: [255, 255, 255],
                footFill: [219, 234, 254], // blue-100
                footText: [23, 37, 84],
                alternateFill: [248, 250, 252],
            };
    }
};

const addPageHeaderAndFooter = (
    doc: jsPDF,
    schoolDetails: AppData['settings']['schoolDetails'],
    documentTitle?: string,
    watermarkText?: string
) => {
    const totalPages = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const generatedDate = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Watermark if requested
        if (watermarkText && watermarkText.trim().length > 0) {
            try {
                doc.saveGraphicsState();
                if (doc.GState) {
                    doc.setGState(new doc.GState({ opacity: 0.08 }));
                }
                doc.setFontSize(32);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(100, 116, 139);
                doc.text(watermarkText.toUpperCase(), pageWidth / 2, pageHeight / 2, {
                    align: 'center',
                    angle: 45,
                });
                doc.restoreGraphicsState();
            } catch (e) {
                // Fallback if GState not supported
                doc.setFontSize(28);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(220, 220, 220);
                doc.text(watermarkText.toUpperCase(), pageWidth / 2, pageHeight / 2, {
                    align: 'center',
                    angle: 45,
                });
            }
        }

        // Running Footer
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

        doc.setFontSize(7).setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(
            `PM POSHAN Tracker | ${schoolDetails.name || 'School'} (UDISE: ${schoolDetails.udise || 'N/A'})`,
            14,
            pageHeight - 6
        );
        doc.text(
            `Generated: ${generatedDate} | Page ${i} of ${totalPages}`,
            pageWidth - 14,
            pageHeight - 6,
            { align: 'right' }
        );
    }
};

const addSignatureBlock = (doc: jsPDF, settings: AppData['settings'], startY: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const leftPos = pageWidth / 4;
    const rightPos = (pageWidth * 3) / 4;
    const signatureSpacing = 16;

    let y = startY + signatureSpacing;

    if (y > pageHeight - 45) {
        doc.addPage();
        y = 25;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);

    // Left Signature
    doc.setFontSize(8).setFont(undefined, 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('................................................................', leftPos, y, { align: 'center' });
    doc.text(`(${settings.mdmIncharge?.name || 'Name & Sign'})`, leftPos, y + 4, { align: 'center' });
    doc.setFont(undefined, 'bold');
    doc.text('MDM Incharge / Teacher Incharge', leftPos, y + 8, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    doc.text(`Contact: ${settings.mdmIncharge?.contact || 'N/A'}`, leftPos, y + 12, { align: 'center' });

    // Right Signature
    doc.setFontSize(8).setFont(undefined, 'normal');
    doc.text('................................................................', rightPos, y, { align: 'center' });
    doc.text(`(${settings.headOfInstitution?.name || 'Name & Sign'})`, rightPos, y + 4, { align: 'center' });
    doc.setFont(undefined, 'bold');
    doc.text('Head of Institution / Headmaster', rightPos, y + 8, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    doc.text(`Seal & Stamp | Contact: ${settings.headOfInstitution?.contact || 'N/A'}`, rightPos, y + 12, { align: 'center' });
};

const drawCheckbox = (doc: jsPDF, x: number, y: number, text: string, checked: boolean) => {
    doc.rect(x, y, 3, 3);
    doc.text(text, x + 5, y + 2.5);
    if (checked) {
        doc.setFont(undefined, 'bold');
        doc.text('X', x + 0.8, y + 2.5);
        doc.setFont(undefined, 'normal');
    }
};

type MdcfOverrideData = Partial<Pick<Settings, 'healthStatus' | 'inspectionReport' | 'cooks' | 'mmeExpenditure'>>;

const generateMDCF = (
    data: AppData,
    selectedMonth: string,
    overrideData?: MdcfOverrideData,
    options?: PdfExportOptions
): Blob => {
    const doc = new jspdf.jsPDF();
    const colors = getThemeColors(options?.themeColor);
    const settings = { ...data.settings, ...(overrideData || {}) };
    const { schoolDetails } = settings;
    const summaryData = calculateMonthlySummary(data, selectedMonth);
    const { monthEntries, riceAbstracts, cashAbstracts, categoryTotals } = summaryData;

    const monthDate = new Date(`${selectedMonth}-02`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();

    // Header Branding
    doc.setFillColor(colors.headFill[0], colors.headFill[1], colors.headFill[2]);
    doc.rect(14, 10, doc.internal.pageSize.getWidth() - 28, 14, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11).setFont(undefined, 'bold');
    doc.text('PRADHAN MANTRI POSHAN SHAKTI NIRMAN (PM POSHAN)', doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });
    doc.setFontSize(9).setFont(undefined, 'normal');
    doc.text('Monthly Data Capture Format (MDCF)', doc.internal.pageSize.getWidth() / 2, 21, { align: 'center' });

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(7);
    doc.text('Instructions: Keep following registers handy:- 1) Enrolment Register 2) Cash & Bank Book 3) Grain Passbook 4) Cooking Cost Details', 14, 28);

    // 1. School Details
    doc.setFontSize(9).setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('1. School Details', 14, 34);

    doc.autoTable({
        startY: 36,
        body: [[`Month-Year: ${monthName} ${year}`, `UDISE Code: ${schoolDetails.udise || 'N/A'}`, `School Name: ${schoolDetails.name || 'N/A'}`]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
        headStyles: { fillColor: colors.headFill, textColor: colors.headText },
    });

    const onRoll = data.settings.classRolls.reduce((sum, c) => sum + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0);

    doc.setFontSize(8);
    drawCheckbox(doc, 20, 52, 'Government', schoolDetails.schoolTypeMDCF === 'Government');
    drawCheckbox(doc, 20, 57, 'Local Body', schoolDetails.schoolTypeMDCF === 'Local Body');
    drawCheckbox(doc, 20, 62, 'EGS/AIE Centers', schoolDetails.schoolTypeMDCF === 'EGS/AIE Centers');
    drawCheckbox(doc, 65, 52, 'NCLP', schoolDetails.schoolTypeMDCF === 'NCLP');
    drawCheckbox(doc, 65, 57, 'Madras / Maqtab', schoolDetails.schoolTypeMDCF === 'Madras / Maqtab');

    drawCheckbox(doc, 110, 52, 'Primary', schoolDetails.schoolCategoryMDCF === 'Primary');
    drawCheckbox(doc, 110, 57, 'Upper Primary', schoolDetails.schoolCategoryMDCF === 'Upper Primary');
    drawCheckbox(doc, 110, 62, 'Primary with Upper Primary', schoolDetails.schoolCategoryMDCF === 'Primary with Upper Primary');

    doc.autoTable({
        startY: 67,
        body: [
            [`State / UT: ${schoolDetails.state || 'N/A'}`, `District: ${schoolDetails.district || 'N/A'}`, `Block/Zone: ${schoolDetails.block || 'N/A'}`, `Village/Ward: ${schoolDetails.village || 'N/A'}`],
            [`Kitchen Type: ${schoolDetails.kitchenType || 'N/A'}`, `Enrolment: ${onRoll}`, '', '']
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] }
    });

    // 2. Meals Availed Status
    const actualDaysServed = {
        balvatika: monthEntries.filter(e => e.present.balvatika > 0).length,
        primary: monthEntries.filter(e => e.present.primary > 0).length,
        middle: monthEntries.filter(e => e.present.middle > 0).length,
    };
    doc.setFontSize(9).setFont(undefined, 'bold');
    doc.text('2. Meals Availed Status', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Metric', 'Bal Vatika', 'Primary', 'Upper Primary']],
        body: [
            ['School Working Days in Month', monthEntries.length, monthEntries.length, monthEntries.length],
            ['Actual Days MDM Served', actualDaysServed.balvatika, actualDaysServed.primary, actualDaysServed.middle],
            ['Total Meals Served in Month', categoryTotals.present.balvatika, categoryTotals.present.primary, categoryTotals.present.middle],
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
        headStyles: { fillColor: colors.headFill, textColor: colors.headText, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: colors.alternateFill }
    });

    // 3. Fund Details (in Rs.)
    doc.setFontSize(9).setFont(undefined, 'bold');
    doc.text('3. Cooking Cost & Fund Details (in ₹)', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Component', 'Opening Balance (₹)', 'Received (₹)', 'Expenditure (₹)', 'Closing Balance (₹)']],
        body: [
            ['Cooking Cost - Bal Vatika', cashAbstracts.balvatika.opening.toFixed(2), cashAbstracts.balvatika.received.toFixed(2), (cashAbstracts.balvatika.expenditure || 0).toFixed(2), cashAbstracts.balvatika.balance.toFixed(2)],
            ['Cooking Cost - Primary', cashAbstracts.primary.opening.toFixed(2), cashAbstracts.primary.received.toFixed(2), (cashAbstracts.primary.expenditure || 0).toFixed(2), cashAbstracts.primary.balance.toFixed(2)],
            ['Cooking Cost - Upper Primary', cashAbstracts.middle.opening.toFixed(2), cashAbstracts.middle.received.toFixed(2), (cashAbstracts.middle.expenditure || 0).toFixed(2), cashAbstracts.middle.balance.toFixed(2)],
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
        headStyles: { fillColor: colors.headFill, textColor: colors.headText, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: colors.alternateFill }
    });

    // 4. Cook Cum Helper Payment Details
    doc.setFontSize(9).setFont(undefined, 'bold');
    doc.text('4. Cook Cum Helper Payment Details', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [['S.No', 'Name', 'Gender', 'Category', 'Mode of Payment', 'Amount Paid (₹)']],
        body: settings.cooks.length > 0 ? settings.cooks.map((cook, index) => [
            index + 1,
            cook.name,
            cook.gender,
            cook.category,
            cook.paymentMode,
            cook.amountPaid.toFixed(2)
        ]) : [['1', 'N/A', '-', '-', '-', '0.00']],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
        headStyles: { fillColor: colors.headFill, textColor: colors.headText, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: colors.alternateFill }
    });

    // 5. Food Grains Details (in Kgs)
    doc.setFontSize(9).setFont(undefined, 'bold');
    doc.text('5. Food Grains / Rice Details (in kg)', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Component', 'Opening Balance (kg)', 'Received (kg)', 'Utilized (kg)', 'Closing Balance (kg)']],
        body: [
            ['Rice - Bal Vatika', riceAbstracts.balvatika.opening.toFixed(3), riceAbstracts.balvatika.received.toFixed(3), (riceAbstracts.balvatika.consumed || 0).toFixed(3), riceAbstracts.balvatika.balance.toFixed(3)],
            ['Rice - Primary', riceAbstracts.primary.opening.toFixed(3), riceAbstracts.primary.received.toFixed(3), (riceAbstracts.primary.consumed || 0).toFixed(3), riceAbstracts.primary.balance.toFixed(3)],
            ['Rice - Upper Primary', riceAbstracts.middle.opening.toFixed(3), riceAbstracts.middle.received.toFixed(3), (riceAbstracts.middle.consumed || 0).toFixed(3), riceAbstracts.middle.balance.toFixed(3)],
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
        headStyles: { fillColor: colors.headFill, textColor: colors.headText, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: colors.alternateFill }
    });

    // 6. Other Details
    doc.setFontSize(9).setFont(undefined, 'bold');
    doc.text('6. Health, Inspection & MME Details', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        body: [
            ['Children given IFA Tablets (Boys)', settings.healthStatus?.ifaBoys || 0],
            ['Children given IFA Tablets (Girls)', settings.healthStatus?.ifaGirls || 0],
            ['Children Screened by RBSK Team', settings.healthStatus?.screenedByRBSK || 0],
            ['Children Referred by RBSK Team', settings.healthStatus?.referredByRBSK || 0],
            ['Was MDM Inspected during Month?', settings.inspectionReport?.inspected ? 'Yes' : 'No'],
            ['If Inspected, by Whom', settings.inspectionReport?.inspected ? (settings.inspectionReport?.inspectedBy || 'Official') : 'N/A'],
            ['Untoward Incidents Reported', settings.inspectionReport?.incidentsCount || 0],
            ['MME Expenditure (in ₹)', (settings.mmeExpenditure || 0).toFixed(2)]
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] }
    });

    addSignatureBlock(doc, settings, doc.lastAutoTable.finalY);
    addPageHeaderAndFooter(doc, schoolDetails, 'MDCF Report', options?.watermarkText);

    return doc.output('blob');
};

const generateRollStatementPDF = (data: AppData, options?: PdfExportOptions): Blob => {
    const doc = new jspdf.jsPDF();
    const colors = getThemeColors(options?.themeColor);
    const { settings } = data;
    const { schoolDetails } = settings;

    // Banner Header
    doc.setFillColor(colors.headFill[0], colors.headFill[1], colors.headFill[2]);
    doc.rect(14, 10, doc.internal.pageSize.getWidth() - 28, 14, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11).setFont(undefined, 'bold');
    doc.text((schoolDetails.name || 'SCHOOL ENROLLMENT RECORD').toUpperCase(), doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });
    doc.setFontSize(9).setFont(undefined, 'normal');
    doc.text('STUDENT ENROLLMENT ROLL STATEMENT', doc.internal.pageSize.getWidth() / 2, 21, { align: 'center' });

    const head = [['Class', 'Gen (Boys)', 'Gen (Girls)', 'ST/SC (Boys)', 'ST/SC (Girls)', 'Total Boys', 'Total Girls', 'Total On Roll']];
    const body: any[][] = [];

    let grandTotal = { genB: 0, genG: 0, stscB: 0, stscG: 0, totalB: 0, totalG: 0, onRoll: 0 };

    const calculateSectionTotals = (classes: ClassRoll[]) => {
        return classes.reduce((acc, cr) => {
            acc.genB += cr.general.boys;
            acc.genG += cr.general.girls;
            acc.stscB += cr.stsc.boys;
            acc.stscG += cr.stsc.girls;
            const totalBoys = cr.general.boys + cr.stsc.boys;
            const totalGirls = cr.general.girls + cr.stsc.girls;
            acc.totalB += totalBoys;
            acc.totalG += totalGirls;
            acc.onRoll += totalBoys + totalGirls;
            return acc;
        }, { genB: 0, genG: 0, stscB: 0, stscG: 0, totalB: 0, totalG: 0, onRoll: 0 });
    };

    const sections = [
        { title: 'Middle Section (VI-VIII)', ids: ['c8', 'c7', 'c6'] },
        { title: 'Primary Section (I-V)', ids: ['c5', 'c4', 'c3', 'c2', 'c1'] },
        { title: 'Pre-Primary Section', ids: ['bal', 'pp1', 'pp2'] },
    ];

    sections.forEach(section => {
        const sectionClasses = (settings.classRolls || []).filter(cr => section.ids.includes(cr.id));
        if (sectionClasses.length > 0) {
            body.push([{ content: section.title, colSpan: 8, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } } as any]);

            sectionClasses.forEach(cr => {
                const totalBoys = cr.general.boys + cr.stsc.boys;
                const totalGirls = cr.general.girls + cr.stsc.girls;
                const onRoll = totalBoys + totalGirls;
                body.push([cr.name, cr.general.boys, cr.general.girls, cr.stsc.boys, cr.stsc.girls, totalBoys, totalGirls, onRoll]);
            });

            const sectionTotals = calculateSectionTotals(sectionClasses);
            body.push([
                { content: `${section.title.split(' ')[0]} Total`, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.genB, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.genG, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.stscB, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.stscG, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.totalB, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.totalG, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.onRoll, styles: { fontStyle: 'bold', fillColor: colors.footFill, textColor: colors.footText } },
            ]);

            grandTotal.genB += sectionTotals.genB;
            grandTotal.genG += sectionTotals.genG;
            grandTotal.stscB += sectionTotals.stscB;
            grandTotal.stscG += sectionTotals.stscG;
            grandTotal.totalB += sectionTotals.totalB;
            grandTotal.totalG += sectionTotals.totalG;
            grandTotal.onRoll += sectionTotals.onRoll;
        }
    });

    const foot = [['Grand Total', grandTotal.genB, grandTotal.genG, grandTotal.stscB, grandTotal.stscG, grandTotal.totalB, grandTotal.totalG, grandTotal.onRoll]];

    doc.autoTable({
        startY: 28,
        head: head,
        body: body,
        foot: foot,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
        headStyles: { fillColor: colors.headFill, textColor: colors.headText, fontStyle: 'bold' },
        footStyles: { fillColor: colors.footFill, textColor: colors.footText, fontStyle: 'bold' },
    });

    addSignatureBlock(doc, settings, doc.lastAutoTable.finalY);
    addPageHeaderAndFooter(doc, schoolDetails, 'Roll Statement', options?.watermarkText);

    return doc.output('blob');
};

const generateDailyConsumptionPDF = (data: AppData, selectedMonth: string, options?: PdfExportOptions): Blob => {
    const doc = new jspdf.jsPDF('p', 'mm', 'a4');
    const colors = getThemeColors(options?.themeColor);
    const { settings } = data;
    const { schoolDetails, rates } = settings;
    const summaryData = calculateMonthlySummary(data, selectedMonth);
    const { monthEntries, riceAbstracts, cashAbstracts } = summaryData;

    const monthDate = new Date(`${selectedMonth}-02`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();
    const categories: Category[] = ['balvatika', 'primary', 'middle'];

    const onRollTotals: Record<Category, number> = { balvatika: 0, primary: 0, middle: 0 };
    settings.classRolls.forEach(c => {
        const classTotal = c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls;
        if (['bal', 'pp1', 'pp2'].includes(c.id)) onRollTotals.balvatika += classTotal;
        else if (['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)) onRollTotals.primary += classTotal;
        else if (['c6', 'c7', 'c8'].includes(c.id)) onRollTotals.middle += classTotal;
    });

    let renderedCategoryCount = 0;

    categories.forEach((category) => {
        const categoryOnRoll = onRollTotals[category];
        if (categoryOnRoll === 0) return;

        if (renderedCategoryCount > 0) {
            doc.addPage();
        }
        renderedCategoryCount++;

        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

        // Header Banner
        doc.setFillColor(colors.headFill[0], colors.headFill[1], colors.headFill[2]);
        doc.rect(14, 10, doc.internal.pageSize.getWidth() - 28, 14, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11).setFont(undefined, 'bold');
        doc.text((schoolDetails.name || 'SCHOOL').toUpperCase(), doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });
        doc.setFontSize(9).setFont(undefined, 'normal');
        doc.text(`Daily Consumption Register (${categoryName}) - ${monthName} ${year}`, doc.internal.pageSize.getWidth() / 2, 21, { align: 'center' });

        const head = [['S.No', 'Date', 'Roll', 'Present', 'Rice (kg)', 'Dal/Veg (₹)', 'Oil/Cond (₹)', 'Salt (₹)', 'Fuel (₹)', 'Total (₹)', 'Remarks']];
        const body: any[][] = [];
        const totals = { present: 0, riceUsed: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, totalCost: 0 };

        monthEntries.forEach((entry, entryIndex) => {
            const present = entry.present[category];
            const mealServed = present > 0;

            if (mealServed) {
                const riceUsed = (present * rates.rice[category]) / 1000;
                const dalVeg = present * rates.dalVeg[category];
                const oilCond = present * rates.oilCond[category];
                const salt = present * rates.salt[category];
                const fuel = present * rates.fuel[category];
                const totalCost = dalVeg + oilCond + salt + fuel;

                totals.present += present;
                totals.riceUsed += riceUsed;
                totals.dalVeg += dalVeg;
                totals.oilCond += oilCond;
                totals.salt += salt;
                totals.fuel += fuel;
                totals.totalCost += totalCost;

                body.push([
                    entryIndex + 1,
                    new Date(entry.date + 'T00:00:00').toLocaleDateString('en-IN'),
                    categoryOnRoll,
                    present,
                    riceUsed.toFixed(3),
                    dalVeg.toFixed(2),
                    oilCond.toFixed(2),
                    salt.toFixed(2),
                    fuel.toFixed(2),
                    totalCost.toFixed(2),
                    'Served'
                ]);
            } else {
                body.push([
                    { content: `${new Date(entry.date + 'T00:00:00').toLocaleDateString('en-IN')} - ${entry.reasonForNoMeal || 'No Meal Served'}`, colSpan: 11, styles: { halign: 'center', fontStyle: 'italic', textColor: [220, 38, 38] } } as any
                ]);
            }
        });

        const foot = [['Total', '', '', totals.present, totals.riceUsed.toFixed(3), totals.dalVeg.toFixed(2), totals.oilCond.toFixed(2), totals.salt.toFixed(2), totals.fuel.toFixed(2), totals.totalCost.toFixed(2), '']];

        doc.autoTable({
            startY: 28,
            head: head,
            body: body,
            foot: foot,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1.5, textColor: [15, 23, 42] },
            headStyles: { fillColor: colors.headFill, textColor: colors.headText, fontStyle: 'bold' },
            footStyles: { fillColor: colors.footFill, textColor: colors.footText, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: colors.alternateFill }
        });

        const mainTableFinalY = doc.lastAutoTable.finalY;
        let abstractStartY = mainTableFinalY + 6;

        if (abstractStartY > doc.internal.pageSize.getHeight() - 60) {
            doc.addPage();
            abstractStartY = 20;
        }

        const riceCatAbstract = riceAbstracts[category];
        const cashCatAbstract = cashAbstracts[category];

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 14;
        const gap = 4;
        const tableWidth = (pageWidth - (margin * 2) - gap) / 2;

        // Rice Abstract
        doc.autoTable({
            startY: abstractStartY,
            head: [[`Rice Abstract - ${categoryName} (kg)`, 'Qty']],
            body: [
                ['Opening Balance', riceCatAbstract.opening.toFixed(3)],
                ['Received in Month', riceCatAbstract.received.toFixed(3)],
                ['Total Stock', riceCatAbstract.total.toFixed(3)],
                ['Consumed in Month', (riceCatAbstract.consumed || 0).toFixed(3)],
                ['Closing Balance', { content: riceCatAbstract.balance.toFixed(3), styles: { fontStyle: 'bold' } }],
            ],
            theme: 'grid',
            tableWidth: tableWidth,
            margin: { left: margin },
            styles: { fontSize: 8, cellPadding: 1.5, halign: 'right' },
            headStyles: { halign: 'center', fillColor: colors.headFill, textColor: colors.headText },
            columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        });

        const riceTableFinalY = doc.lastAutoTable.finalY;

        // Cash Abstract
        doc.autoTable({
            startY: abstractStartY,
            head: [[`Cash Abstract - ${categoryName} (₹)`, 'Amount']],
            body: [
                ['Opening Balance', cashCatAbstract.opening.toFixed(2)],
                ['Received in Month', cashCatAbstract.received.toFixed(2)],
                ['Total Funds', cashCatAbstract.total.toFixed(2)],
                ['Expenditure in Month', (cashCatAbstract.expenditure || 0).toFixed(2)],
                ['Closing Balance', { content: cashCatAbstract.balance.toFixed(2), styles: { fontStyle: 'bold' } }],
            ],
            theme: 'grid',
            tableWidth: tableWidth,
            margin: { left: margin + tableWidth + gap },
            styles: { fontSize: 8, cellPadding: 1.5, halign: 'right' },
            headStyles: { halign: 'center', fillColor: colors.headFill, textColor: colors.headText },
            columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        });

        const cashTableFinalY = doc.lastAutoTable.finalY;
        const abstractTablesFinalY = Math.max(riceTableFinalY, cashTableFinalY);
        addSignatureBlock(doc, settings, abstractTablesFinalY);
    });

    addPageHeaderAndFooter(doc, schoolDetails, 'Daily Consumption Register', options?.watermarkText);
    return doc.output('blob');
};

const generateRiceRequirementPDF = (data: AppData, selectedMonth: string, options?: PdfExportOptions): Blob => {
    const doc = new jspdf.jsPDF();
    const colors = getThemeColors(options?.themeColor);
    const { settings } = data;
    const { schoolDetails } = settings;
    const summary = calculateMonthlySummary(data, selectedMonth);
    const workingDays = summary.monthEntries.filter(e => e.totalPresent > 0).length;

    const monthDate = new Date(`${selectedMonth}-02`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();

    doc.setFillColor(colors.headFill[0], colors.headFill[1], colors.headFill[2]);
    doc.rect(14, 10, doc.internal.pageSize.getWidth() - 28, 14, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11).setFont(undefined, 'bold');
    doc.text((schoolDetails.name || 'SCHOOL').toUpperCase(), doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });
    doc.setFontSize(9).setFont(undefined, 'normal');
    doc.text('OFFICIAL RICE REQUIREMENT CERTIFICATE', doc.internal.pageSize.getWidth() / 2, 21, { align: 'center' });

    const enrollment = settings.classRolls.reduce((sum, c) => sum + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0);

    const riceByCategory = { balvatika: 0, primary: 0, middle: 0 };
    settings.classRolls.forEach(c => {
        let cat: Category | null = null;
        if (['bal', 'pp1', 'pp2'].includes(c.id)) cat = 'balvatika';
        else if (['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)) cat = 'primary';
        else if (['c6', 'c7', 'c8'].includes(c.id)) cat = 'middle';
        if (cat) {
            const classRoll = c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls;
            riceByCategory[cat] += (classRoll * workingDays * settings.rates.rice[cat]) / 1000;
        }
    });
    const totalRiceKg = Object.values(riceByCategory).reduce((sum, val) => sum + val, 0);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10).setFont(undefined, 'normal');
    const bodyText = `Certified that the total enrollment of students in ${schoolDetails.name || 'this school'} is ${enrollment} for the month of ${monthName}, ${year}. The school functioned for ${workingDays} days during this month. The monthly rice requirement under PM POSHAN is certified as follows:`;
    doc.text(bodyText, 14, 32, { maxWidth: 180, align: 'justify' });

    doc.autoTable({
        startY: 50,
        head: [['Category', 'Enrollment', 'Working Days', 'Norm (g/student/day)', 'Total Requirement (kg)']],
        body: [
            ['Balvatika', settings.classRolls.filter(c => ['bal', 'pp1', 'pp2'].includes(c.id)).reduce((s, c) => s + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0), workingDays, settings.rates.rice.balvatika, riceByCategory.balvatika.toFixed(3)],
            ['Primary (I-V)', settings.classRolls.filter(c => ['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)).reduce((s, c) => s + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0), workingDays, settings.rates.rice.primary, riceByCategory.primary.toFixed(3)],
            ['Upper Primary (VI-VIII)', settings.classRolls.filter(c => ['c6', 'c7', 'c8'].includes(c.id)).reduce((s, c) => s + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0), workingDays, settings.rates.rice.middle, riceByCategory.middle.toFixed(3)],
        ],
        foot: [['Total', enrollment, '', '', totalRiceKg.toFixed(3)]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
        headStyles: { fillColor: colors.headFill, textColor: colors.headText, fontStyle: 'bold' },
        footStyles: { fillColor: colors.footFill, textColor: colors.footText, fontStyle: 'bold' },
    });

    addSignatureBlock(doc, settings, doc.lastAutoTable.finalY + 15);
    addPageHeaderAndFooter(doc, schoolDetails, 'Rice Requirement Certificate', options?.watermarkText);

    return doc.output('blob');
};

const generateYearlyConsumptionDetailedPDF = (data: AppData, financialYear: string, options?: PdfExportOptions): Blob => {
    const doc = new jspdf.jsPDF('l', 'mm', 'a4');
    const colors = getThemeColors(options?.themeColor);
    const { settings } = data;
    const { schoolDetails } = settings;
    const categories: Category[] = ['balvatika', 'primary', 'middle'];

    const onRollTotals: Record<Category, number> = { balvatika: 0, primary: 0, middle: 0 };
    settings.classRolls.forEach(c => {
        const classTotal = c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls;
        if (['bal', 'pp1', 'pp2'].includes(c.id)) onRollTotals.balvatika += classTotal;
        else if (['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)) onRollTotals.primary += classTotal;
        else if (['c6', 'c7', 'c8'].includes(c.id)) onRollTotals.middle += classTotal;
    });
    const totalOnRoll = onRollTotals.balvatika + onRollTotals.primary + onRollTotals.middle;

    const [startYear, endYear] = financialYear.split('-').map(Number);

    doc.setFillColor(colors.headFill[0], colors.headFill[1], colors.headFill[2]);
    doc.rect(14, 10, doc.internal.pageSize.getWidth() - 28, 14, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11).setFont(undefined, 'bold');
    doc.text((schoolDetails.name || 'SCHOOL').toUpperCase(), doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });
    doc.setFontSize(9).setFont(undefined, 'normal');
    doc.text(`Yearly Detailed Consumption Register (FY ${financialYear})`, doc.internal.pageSize.getWidth() / 2, 21, { align: 'center' });

    const head = [
        [
            { content: 'Month', rowSpan: 2, styles: { valign: 'middle' } } as any,
            { content: 'Category', rowSpan: 2, styles: { valign: 'middle' } } as any,
            { content: 'On Roll', rowSpan: 2, styles: { valign: 'middle' } } as any,
            { content: 'Meals Served', rowSpan: 2, styles: { valign: 'middle' } } as any,
            { content: 'Rice Stock (in kg)', colSpan: 4, styles: { halign: 'center' } } as any,
            { content: 'Cooking Cost Funds (in ₹)', colSpan: 4, styles: { halign: 'center' } } as any,
        ],
        [
            'Opening', 'Received', 'Consumed', 'Closing',
            'Opening', 'Received', 'Expenditure', 'Closing',
        ],
    ];

    const body: any[][] = [];
    const grandTotals = {
        mealsServed: 0,
        riceReceived: 0,
        riceConsumed: 0,
        cashReceived: 0,
        cashExpenditure: 0,
    };

    let yearlyOpeningRice = 0;
    let yearlyOpeningCash = 0;
    let yearlyClosingRice = 0;
    let yearlyClosingCash = 0;

    for (let i = 0; i < 12; i++) {
        const monthIndex = (3 + i) % 12;
        const year = monthIndex < 3 ? endYear : startYear;
        const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        const monthDate = new Date(year, monthIndex, 1);
        const monthName = monthDate.toLocaleString('default', { month: 'long' });

        const summary = calculateMonthlySummary(data, monthKey);

        const monthTotals = {
            onRoll: 0, mealsServed: 0,
            riceOpening: 0, riceReceived: 0, riceConsumed: 0, riceClosing: 0,
            cashOpening: 0, cashReceived: 0, cashExpenditure: 0, cashClosing: 0,
        };

        categories.forEach((cat, catIndex) => {
            const onRoll = onRollTotals[cat];
            const mealsServed = summary.categoryTotals.present[cat];
            const rice = summary.riceAbstracts[cat];
            const cash = summary.cashAbstracts[cat];

            const rowData = [
                cat.charAt(0).toUpperCase() + cat.slice(1),
                onRoll,
                mealsServed,
                rice.opening.toFixed(3),
                rice.received.toFixed(3),
                (rice.consumed || 0).toFixed(3),
                { content: rice.balance.toFixed(3), styles: { fontStyle: 'bold' } },
                cash.opening.toFixed(2),
                cash.received.toFixed(2),
                (cash.expenditure || 0).toFixed(2),
                { content: cash.balance.toFixed(2), styles: { fontStyle: 'bold' } },
            ];

            if (catIndex === 0) {
                rowData.unshift({ content: monthName, rowSpan: 3 } as any);
            }

            body.push(rowData);

            monthTotals.onRoll += onRoll;
            monthTotals.mealsServed += mealsServed;
            monthTotals.riceOpening += rice.opening;
            monthTotals.riceReceived += rice.received;
            monthTotals.riceConsumed += (rice.consumed || 0);
            monthTotals.riceClosing += rice.balance;
            monthTotals.cashOpening += cash.opening;
            monthTotals.cashReceived += cash.received;
            monthTotals.cashExpenditure += (cash.expenditure || 0);
            monthTotals.cashClosing += cash.balance;
        });

        if (i === 0) {
            yearlyOpeningRice = monthTotals.riceOpening;
            yearlyOpeningCash = monthTotals.cashOpening;
        }

        if (i === 11) {
            yearlyClosingRice = monthTotals.riceClosing;
            yearlyClosingCash = monthTotals.cashClosing;
        }

        grandTotals.mealsServed += monthTotals.mealsServed;
        grandTotals.riceReceived += monthTotals.riceReceived;
        grandTotals.riceConsumed += monthTotals.riceConsumed;
        grandTotals.cashReceived += monthTotals.cashReceived;
        grandTotals.cashExpenditure += monthTotals.cashExpenditure;
    }

    const foot = [[
        { content: 'Grand Total', colSpan: 2, styles: { halign: 'center' } },
        totalOnRoll,
        grandTotals.mealsServed,
        yearlyOpeningRice.toFixed(3),
        grandTotals.riceReceived.toFixed(3),
        grandTotals.riceConsumed.toFixed(3),
        yearlyClosingRice.toFixed(3),
        yearlyOpeningCash.toFixed(2),
        grandTotals.cashReceived.toFixed(2),
        grandTotals.cashExpenditure.toFixed(2),
        yearlyClosingCash.toFixed(2),
    ]];

    doc.autoTable({
        startY: 28,
        head: head,
        body: body,
        foot: foot,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.5, halign: 'right', textColor: [15, 23, 42] },
        headStyles: { fillColor: colors.headFill, textColor: colors.headText, halign: 'center', fontSize: 7.5, fontStyle: 'bold' },
        footStyles: { fillColor: colors.footFill, textColor: colors.footText, fontStyle: 'bold' },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' },
            1: { halign: 'left' }
        },
        showFoot: 'lastPage',
    });

    addSignatureBlock(doc, settings, doc.lastAutoTable.finalY);
    addPageHeaderAndFooter(doc, schoolDetails, 'Yearly Consumption Report', options?.watermarkText);

    return doc.output('blob');
};

export const generatePDFReport = (
    reportType: string,
    data: AppData,
    parameter: string,
    overrideData?: MdcfOverrideData,
    options?: PdfExportOptions
): { pdfBlob: Blob; filename: string } => {
    const schoolName = (data.settings.schoolDetails.name || 'School').replace(/[\\/:"*?<>|.\s]+/g, '_');
    let pdfBlob: Blob;
    let filename = `${schoolName}_Report.pdf`;

    switch (reportType) {
        case 'mdcf':
            pdfBlob = generateMDCF(data, parameter, overrideData, options);
            filename = `${schoolName}_MDCF_${parameter}.pdf`;
            break;
        case 'roll_statement':
            pdfBlob = generateRollStatementPDF(data, options);
            filename = `${schoolName}_Roll_Statement.pdf`;
            break;
        case 'daily_consumption':
            pdfBlob = generateDailyConsumptionPDF(data, parameter, options);
            filename = `${schoolName}_Daily_Consumption_${parameter}.pdf`;
            break;
        case 'rice_requirement':
            pdfBlob = generateRiceRequirementPDF(data, parameter, options);
            filename = `${schoolName}_Rice_Requirement_${parameter}.pdf`;
            break;
        case 'yearly_consumption_detailed':
            pdfBlob = generateYearlyConsumptionDetailedPDF(data, parameter, options);
            filename = `${schoolName}_Yearly_Consumption_${parameter.replace('-', '_')}.pdf`;
            break;
        default:
            throw new Error('Invalid report type selected.');
    }

    return { pdfBlob, filename };
};
