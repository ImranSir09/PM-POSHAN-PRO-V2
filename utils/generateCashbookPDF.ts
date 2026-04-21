import jsPDF from "jspdf";
import "jspdf-autotable";

export const generateCashbookPDF = (data: any, month: string) => {
  const doc = new jsPDF();

  const allReceipts = Array.isArray(data.receipts) ? data.receipts : [];
  const allExpenses = Array.isArray(data.dailyEntries) ? data.dailyEntries : [];

  // ---------- DATE PARSER ----------
  const getDateObj = (dateStr: string) => {
    if (!dateStr) return null;

    // YYYY-MM-DD
    if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) {
      return new Date(dateStr);
    }

    // DD-MM-YYYY
    if (dateStr.includes("-")) {
      const [dd, mm, yyyy] = dateStr.split("-");
      return new Date(`${yyyy}-${mm}-${dd}`);
    }

    // DD/MM/YYYY
    if (dateStr.includes("/")) {
      const [dd, mm, yyyy] = dateStr.split("/");
      return new Date(`${yyyy}-${mm}-${dd}`);
    }

    return null;
  };

  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0);

  // ---------- FILTER CURRENT MONTH ----------
  const receipts = allReceipts.filter((r: any) => {
    const d = getDateObj(r.date);
    return d && d >= monthStart && d <= monthEnd;
  });

  const expenses = allExpenses.filter((e: any) => {
    const d = getDateObj(e.date);
    return d && d >= monthStart && d <= monthEnd;
  });

  // ---------- OPENING BALANCE ----------
  const previousReceipts = allReceipts
    .filter((r: any) => {
      const d = getDateObj(r.date);
      return d && d < monthStart;
    })
    .reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);

  const previousExpenses = allExpenses
    .filter((e: any) => {
      const d = getDateObj(e.date);
      return d && d < monthStart;
    })
    .reduce((sum: number, e: any) => sum + (parseFloat(e.totalCost) || 0), 0);

  const openingBalance = previousReceipts - previousExpenses;

  // ---------- CURRENT TOTALS ----------
  const totalIncome = receipts.reduce(
    (sum: number, r: any) => sum + (parseFloat(r.amount) || 0),
    0
  );

  const totalExpense = expenses.reduce(
    (sum: number, e: any) => sum + (parseFloat(e.totalCost) || 0),
    0
  );

  const totalAvailable = openingBalance + totalIncome;
  const closingBalance = totalAvailable - totalExpense;

  // ---------- SORT DATA ----------
  receipts.sort((a: any, b: any) => {
    const d1 = getDateObj(a.date)?.getTime() || 0;
    const d2 = getDateObj(b.date)?.getTime() || 0;
    return d1 - d2;
  });

  expenses.sort((a: any, b: any) => {
    const d1 = getDateObj(a.date)?.getTime() || 0;
    const d2 = getDateObj(b.date)?.getTime() || 0;
    return d1 - d2;
  });

  // ---------- PAGE 1 ----------
  doc.setFontSize(14);
  doc.text("PM POSHAN CASHBOOK", 14, 15);

  doc.setFontSize(10);
  doc.text(`Month: ${month}`, 14, 22);

  doc.autoTable({
    startY: 30,
    head: [["Particulars", "Amount"]],
    body: [
      ["Opening Balance", openingBalance.toFixed(2)],
      ["Total Income", totalIncome.toFixed(2)],
      ["Total Available", totalAvailable.toFixed(2)],
    ],
  });

  const lastY = (doc as any).lastAutoTable?.finalY || 40;

  doc.autoTable({
    startY: lastY + 10,
    head: [["Date", "Description", "Amount"]],
    body: receipts.map((r: any) => [
      r.date || "",
      r.description || "Receipt",
      (parseFloat(r.amount) || 0).toFixed(2),
    ]),
  });

  // ---------- PAGE 2 ----------
  doc.addPage();

  doc.setFontSize(14);
  doc.text("PM POSHAN CASHBOOK", 14, 15);

  doc.autoTable({
    startY: 25,
    head: [["Date", "Description", "Amount"]],
    body: expenses.map((e: any) => [
      e.date || "",
      "Meal Expense",
      (parseFloat(e.totalCost) || 0).toFixed(2),
    ]),
  });

  const lastY2 = (doc as any).lastAutoTable?.finalY || 40;

  doc.autoTable({
    startY: lastY2 + 10,
    head: [["Summary", "Amount"]],
    body: [
      ["Total Income", totalIncome.toFixed(2)],
      ["Total Expenditure", totalExpense.toFixed(2)],
      ["Closing Balance", closingBalance.toFixed(2)],
    ],
  });

  // ---------- SIGNATURE ----------
  doc.text("MDM Incharge", 20, 280);
  doc.text("Head of Institution", 140, 280);

  return {
    pdfBlob: doc.output("blob"),
    filename: `Cashbook-${month}.pdf`,
  };
};