import jsPDF from "jspdf";
import "jspdf-autotable";

export const generateCashbookPDF = (data: any, month: string) => {
  const doc = new jsPDF();

  const allReceipts = Array.isArray(data.receipts) ? data.receipts : [];
  const allExpenses = Array.isArray(data.dailyEntries) ? data.dailyEntries : [];

  // -------- DATE HELPERS --------
  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    // fallback for dd-mm-yyyy
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return new Date(`${yyyy}-${mm}-${dd}`);
    }

    return null;
  };

  const isSameMonth = (dateStr: string) => {
    const d = parseDate(dateStr);
    if (!d) return false;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");

    return `${y}-${m}` === month;
  };

  const isBeforeMonth = (dateStr: string) => {
    const d = parseDate(dateStr);
    if (!d) return false;

    const [year, mon] = month.split("-").map(Number);
    return d < new Date(year, mon - 1, 1);
  };

  // -------- FILTER DATA --------
  const receipts = allReceipts.filter((r: any) =>
    isSameMonth(r.date)
  );

  const expenses = allExpenses.filter((e: any) =>
    isSameMonth(e.date)
  );

  // -------- OPENING BALANCE --------
  const previousReceipts = allReceipts
    .filter((r: any) => isBeforeMonth(r.date))
    .reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);

  const previousExpenses = allExpenses
    .filter((e: any) => isBeforeMonth(e.date))
    .reduce((sum: number, e: any) => sum + (parseFloat(e.totalCost) || 0), 0);

  const openingBalance = previousReceipts - previousExpenses;

  if (receipts.length === 0 && expenses.length === 0) {
    throw new Error("No data available for this month");
  }

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

  // -------- PAGE 1 --------
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

  // -------- PAGE 2 --------
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

  // -------- SIGNATURES --------
  doc.text("MDM Incharge", 20, 280);
  doc.text("Head of Institution", 140, 280);

  return {
    pdfBlob: doc.output("blob"),
    filename: `Cashbook-${month}.pdf`,
  };
};