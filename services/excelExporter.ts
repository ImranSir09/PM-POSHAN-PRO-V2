import { AppData, Category, CookCumHelper } from '../types';
import { calculateMonthlySummary } from './summaryCalculator';

/**
 * Utility to convert 2D array of strings/numbers to a clean CSV string
 * prefixed with UTF-8 BOM for perfect Microsoft Excel rendering.
 */
function arrayToCsv(data: (string | number | boolean | null | undefined)[][]): string {
    const csvContent = data
        .map(row =>
            row
                .map(val => {
                    if (val === null || val === undefined) return '""';
                    const str = String(val).replace(/"/g, '""');
                    return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
                })
                .join(',')
        )
        .join('\r\n');

    return '\uFEFF' + csvContent;
}

/**
 * Triggers a client-side file download for a CSV string
 */
function downloadCsv(csvString: string, filename: string) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

export const exportMDCFToExcel = (data: AppData, selectedMonth: string, overrideData?: any) => {
    const settings = { ...data.settings, ...(overrideData || {}) };
    const { schoolDetails } = settings;
    const summaryData = calculateMonthlySummary(data, selectedMonth);
    const { monthEntries, riceAbstracts, cashAbstracts, categoryTotals } = summaryData;

    const monthDate = new Date(`${selectedMonth}-02`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();
    const schoolName = schoolDetails.name || 'School';

    const rows: (string | number)[][] = [
        ['PRADHAN MANTRI POSHAN SHAKTI NIRMAN (PM POSHAN)'],
        ['MONTHLY DATA CAPTURE FORMAT (MDCF) REPORT'],
        [''],
        ['1. SCHOOL DETAILS'],
        ['School Name', schoolName],
        ['UDISE Code', schoolDetails.udise],
        ['Month & Year', `${monthName} ${year}`],
        ['School Type', schoolDetails.schoolTypeMDCF || '-'],
        ['School Category', schoolDetails.schoolCategoryMDCF || '-'],
        ['State', schoolDetails.state || '-'],
        ['District', schoolDetails.district || '-'],
        ['Block/Zone', schoolDetails.block || '-'],
        ['Village/Ward', schoolDetails.village || '-'],
        ['Kitchen Type', schoolDetails.kitchenType || '-'],
        [''],
        ['2. MEALS AVAILED STATUS'],
        ['Category', 'Bal Vatika', 'Primary', 'Upper Primary'],
        ['School Days in Month', monthEntries.length, monthEntries.length, monthEntries.length],
        [
            'Actual MDM Days Served',
            monthEntries.filter(e => e.present.balvatika > 0).length,
            monthEntries.filter(e => e.present.primary > 0).length,
            monthEntries.filter(e => e.present.middle > 0).length,
        ],
        [
            'Total Meals Served',
            categoryTotals.present.balvatika,
            categoryTotals.present.primary,
            categoryTotals.present.middle,
        ],
        [''],
        ['3. FUND DETAILS (in ₹)'],
        ['Component', 'Opening Balance (₹)', 'Received (₹)', 'Expenditure (₹)', 'Closing Balance (₹)'],
        [
            'Cooking Cost - Bal Vatika',
            cashAbstracts.balvatika.opening.toFixed(2),
            cashAbstracts.balvatika.received.toFixed(2),
            (cashAbstracts.balvatika.expenditure || 0).toFixed(2),
            cashAbstracts.balvatika.balance.toFixed(2),
        ],
        [
            'Cooking Cost - Primary',
            cashAbstracts.primary.opening.toFixed(2),
            cashAbstracts.primary.received.toFixed(2),
            (cashAbstracts.primary.expenditure || 0).toFixed(2),
            cashAbstracts.primary.balance.toFixed(2),
        ],
        [
            'Cooking Cost - Upper Primary',
            cashAbstracts.middle.opening.toFixed(2),
            cashAbstracts.middle.received.toFixed(2),
            (cashAbstracts.middle.expenditure || 0).toFixed(2),
            cashAbstracts.middle.balance.toFixed(2),
        ],
        [''],
        ['4. COOK CUM HELPER PAYMENT DETAILS'],
        ['S.No', 'Name', 'Gender', 'Category', 'Mode of Payment', 'Amount Paid (₹)'],
        ...settings.cooks.map((cook: CookCumHelper, idx: number) => [
            idx + 1,
            cook.name,
            cook.gender,
            cook.category,
            cook.paymentMode,
            cook.amountPaid.toFixed(2),
        ]),
        [''],
        ['5. FOOD GRAINS DETAILS (in kg)'],
        ['Component', 'Opening Balance (kg)', 'Received (kg)', 'Utilized (kg)', 'Closing Balance (kg)'],
        [
            'Rice - Bal Vatika',
            riceAbstracts.balvatika.opening.toFixed(3),
            riceAbstracts.balvatika.received.toFixed(3),
            (riceAbstracts.balvatika.consumed || 0).toFixed(3),
            riceAbstracts.balvatika.balance.toFixed(3),
        ],
        [
            'Rice - Primary',
            riceAbstracts.primary.opening.toFixed(3),
            riceAbstracts.primary.received.toFixed(3),
            (riceAbstracts.primary.consumed || 0).toFixed(3),
            riceAbstracts.primary.balance.toFixed(3),
        ],
        [
            'Rice - Upper Primary',
            riceAbstracts.middle.opening.toFixed(3),
            riceAbstracts.middle.received.toFixed(3),
            (riceAbstracts.middle.consumed || 0).toFixed(3),
            riceAbstracts.middle.balance.toFixed(3),
        ],
        [''],
        ['6. OTHER DETAILS'],
        ['IFA Tablets (Boys)', settings.healthStatus?.ifaBoys || 0],
        ['IFA Tablets (Girls)', settings.healthStatus?.ifaGirls || 0],
        ['Screened by RBSK', settings.healthStatus?.screenedByRBSK || 0],
        ['Referred by RBSK', settings.healthStatus?.referredByRBSK || 0],
        ['Inspected', settings.inspectionReport?.inspected ? 'Yes' : 'No'],
        ['Inspected By', settings.inspectionReport?.inspected ? settings.inspectionReport?.inspectedBy : 'N/A'],
        ['Untoward Incidents', settings.inspectionReport?.incidentsCount || 0],
        ['MME Expenditure (₹)', (settings.mmeExpenditure || 0).toFixed(2)],
        [''],
        ['MDM Incharge', settings.mdmIncharge?.name || '-'],
        ['Head of Institution', settings.headOfInstitution?.name || '-'],
    ];

    const safeSchoolName = schoolName.replace(/[\\/:"*?<>|.\s]+/g, '_');
    const csv = arrayToCsv(rows);
    downloadCsv(csv, `${safeSchoolName}_MDCF_${selectedMonth}.csv`);
};

export const exportDailyConsumptionToExcel = (data: AppData, selectedMonth: string) => {
    const { settings } = data;
    const { schoolDetails, rates } = settings;
    const summaryData = calculateMonthlySummary(data, selectedMonth);
    const { monthEntries } = summaryData;

    const monthDate = new Date(`${selectedMonth}-02`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();
    const schoolName = schoolDetails.name || 'School';
    const categories: Category[] = ['balvatika', 'primary', 'middle'];

    const rows: (string | number)[][] = [
        ['PM POSHAN - DAILY CONSUMPTION REGISTER'],
        ['School Name', schoolName],
        ['UDISE Code', schoolDetails.udise],
        ['Month & Year', `${monthName} ${year}`],
        [''],
    ];

    categories.forEach(category => {
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        rows.push([`CATEGORY: ${categoryName.toUpperCase()}`]);
        rows.push([
            'S.No',
            'Date',
            'Present Students',
            'Rice Consumed (kg)',
            'Dal/Veg (₹)',
            'Oil/Cond (₹)',
            'Salt (₹)',
            'Fuel (₹)',
            'Total Cost (₹)',
            'Status / Remarks',
        ]);

        let catPresent = 0;
        let catRice = 0;
        let catDal = 0;
        let catOil = 0;
        let catSalt = 0;
        let catFuel = 0;
        let catCost = 0;

        monthEntries.forEach((entry, idx) => {
            const present = entry.present[category];
            const mealServed = present > 0;
            const dateStr = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-IN');

            if (mealServed) {
                const rice = (present * rates.rice[category]) / 1000;
                const dal = present * rates.dalVeg[category];
                const oil = present * rates.oilCond[category];
                const salt = present * rates.salt[category];
                const fuel = present * rates.fuel[category];
                const total = dal + oil + salt + fuel;

                catPresent += present;
                catRice += rice;
                catDal += dal;
                catOil += oil;
                catSalt += salt;
                catFuel += fuel;
                catCost += total;

                rows.push([
                    idx + 1,
                    dateStr,
                    present,
                    rice.toFixed(3),
                    dal.toFixed(2),
                    oil.toFixed(2),
                    salt.toFixed(2),
                    fuel.toFixed(2),
                    total.toFixed(2),
                    'Served',
                ]);
            } else {
                rows.push([
                    idx + 1,
                    dateStr,
                    0,
                    '0.000',
                    '0.00',
                    '0.00',
                    '0.00',
                    '0.00',
                    '0.00',
                    entry.reasonForNoMeal || 'No Meal Served',
                ]);
            }
        });

        rows.push([
            'TOTAL',
            '',
            catPresent,
            catRice.toFixed(3),
            catDal.toFixed(2),
            catOil.toFixed(2),
            catSalt.toFixed(2),
            catFuel.toFixed(2),
            catCost.toFixed(2),
            '',
        ]);
        rows.push(['']);
    });

    const safeSchoolName = schoolName.replace(/[\\/:"*?<>|.\s]+/g, '_');
    const csv = arrayToCsv(rows);
    downloadCsv(csv, `${safeSchoolName}_Daily_Consumption_${selectedMonth}.csv`);
};

export const exportRollStatementToExcel = (data: AppData) => {
    const { settings } = data;
    const { schoolDetails } = settings;
    const schoolName = schoolDetails.name || 'School';

    const rows: (string | number)[][] = [
        ['PM POSHAN - STUDENT ENROLLMENT (ROLL STATEMENT)'],
        ['School Name', schoolName],
        ['UDISE Code', schoolDetails.udise],
        ['Generated On', new Date().toLocaleDateString('en-IN')],
        [''],
        ['Class', 'General (Boys)', 'General (Girls)', 'ST/SC (Boys)', 'ST/SC (Girls)', 'Total Boys', 'Total Girls', 'Total On Roll'],
    ];

    let grandGenB = 0;
    let grandGenG = 0;
    let grandStscB = 0;
    let grandStscG = 0;
    let grandBoys = 0;
    let grandGirls = 0;
    let grandOnRoll = 0;

    settings.classRolls.forEach(cr => {
        const totalB = cr.general.boys + cr.stsc.boys;
        const totalG = cr.general.girls + cr.stsc.girls;
        const onRoll = totalB + totalG;

        grandGenB += cr.general.boys;
        grandGenG += cr.general.girls;
        grandStscB += cr.stsc.boys;
        grandStscG += cr.stsc.girls;
        grandBoys += totalB;
        grandGirls += totalG;
        grandOnRoll += onRoll;

        rows.push([
            cr.name,
            cr.general.boys,
            cr.general.girls,
            cr.stsc.boys,
            cr.stsc.girls,
            totalB,
            totalG,
            onRoll,
        ]);
    });

    rows.push([
        'GRAND TOTAL',
        grandGenB,
        grandGenG,
        grandStscB,
        grandStscG,
        grandBoys,
        grandGirls,
        grandOnRoll,
    ]);

    const safeSchoolName = schoolName.replace(/[\\/:"*?<>|.\s]+/g, '_');
    const csv = arrayToCsv(rows);
    downloadCsv(csv, `${safeSchoolName}_Roll_Statement.csv`);
};

export const exportReceiptsToExcel = (data: AppData) => {
    const { settings, receipts } = data;
    const schoolName = settings.schoolDetails.name || 'School';

    const rows: (string | number)[][] = [
        ['PM POSHAN - ALLOTMENT & RECEIPTS REGISTER'],
        ['School Name', schoolName],
        ['UDISE Code', settings.schoolDetails.udise],
        ['Total Receipts Recorded', receipts.length],
        [''],
        ['Date', 'Rice - Balvatika (kg)', 'Rice - Primary (kg)', 'Rice - Middle (kg)', 'Total Rice (kg)', 'Cash - Balvatika (₹)', 'Cash - Primary (₹)', 'Cash - Middle (₹)', 'Total Cash (₹)'],
    ];

    receipts.forEach(r => {
        const dateStr = new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN');
        const totalRice = (r.rice?.balvatika || 0) + (r.rice?.primary || 0) + (r.rice?.middle || 0);
        const totalCash = (r.cash?.balvatika || 0) + (r.cash?.primary || 0) + (r.cash?.middle || 0);

        rows.push([
            dateStr,
            (r.rice?.balvatika || 0).toFixed(3),
            (r.rice?.primary || 0).toFixed(3),
            (r.rice?.middle || 0).toFixed(3),
            totalRice.toFixed(3),
            (r.cash?.balvatika || 0).toFixed(2),
            (r.cash?.primary || 0).toFixed(2),
            (r.cash?.middle || 0).toFixed(2),
            totalCash.toFixed(2),
        ]);
    });

    const safeSchoolName = schoolName.replace(/[\\/:"*?<>|.\s]+/g, '_');
    const csv = arrayToCsv(rows);
    downloadCsv(csv, `${safeSchoolName}_Receipts_Register.csv`);
};
