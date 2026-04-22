import jsPDF from "jspdf";
import "jspdf-autotable";
import { calculateMonthlySummary } from "../services/summaryCalculator";

export const generateCashbookPDF = (data: any, month: string) => {
  const doc = new jsPDF();

  const summary = calculateMonthlySummary(data, month);

  const { cashAbstracts, monthEntries } = summary;

  // ---------- TOTALS ----------
  const openingBalance =
    cashAbstracts.balvatika.opening +
    cashAbstracts.primary.opening +
    cashAbstracts.middle.opening;

  const totalIncome =
    cashAbstracts.balvatika.received +
    cashAbstracts.primary.received +
    cashAbstracts.middle.received;

  const totalExpense =
    (cashAbstracts.balvatika.expenditure || 0) +
    (cashAbstracts.primary.expenditure || 0) +
    (cashAbstracts.middle.expenditure || 0);

  const closingBalance =
    cashAbstracts.balvatika.balance +
    cashAbstracts.primary.balance +
    cashAbstracts.middle.balance;

  const totalAvailable = openingBalance + totalIncome;

  // ---------- DAILY EXPENSE ROWS ----------
  const expenseRows = monthEntries.map((e: any) => [
    e.date || "",
    "Meal Expense",
    (e.totalCost || 0).toFixed(2),
  ]);

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
    head: [["Type", "Amount"]],
    body: [
      ["Funds Received (Balvatika)", cashAbstracts.balvatika.received.toFixed(2)],
      ["Funds Received (Primary)", cashAbstracts.primary.received.toFixed(2)],
      ["Funds Received (Upper Primary)", cashAbstracts.middle.received.toFixed(2)],
    ],
  });

  // ---------- PAGE 2 ----------
  doc.addPage();

  doc.setFontSize(14);
  doc.text("PM POSHAN CASHBOOK", 14, 15);

  doc.autoTable({
    startY: 25,
    head: [["Date", "Description", "Amount"]],
    body: expenseRows,
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