import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateCashbookPDF = (data: any, month: string) => {
  const doc = new jsPDF();

  const receipts = data.receipts || [];
  const expenses = data.dailyEntries || [];

  let openingBalance = data.openingBalance || 0;

  const totalIncome = receipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
  const totalExpense = expenses.reduce((sum: number, e: any) => sum + Number(e.totalCost || 0), 0);

  const totalAvailable = openingBalance + totalIncome;
  const closingBalance = totalAvailable - totalExpense;

  // ---------------- PAGE 1 ----------------
  doc.setFontSize(16);
  doc.text("Cash Book - Page 1", 14, 15);

  doc.setFontSize(10);
  doc.text(`Month: ${month}`, 14, 22);

  autoTable(doc, {
    startY: 30,
    head: [["Particulars", "Amount"]],
    body: [
      ["Opening Balance", openingBalance],
      ["Total Income (Receipts)", totalIncome],
      ["Total Available", totalAvailable],
    ],
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [["Date", "Description", "Amount"]],
    body: receipts.map((r: any) => [
      r.date,
      r.description || "Receipt",
      r.amount,
    ]),
  });

  // ---------------- PAGE 2 ----------------
  doc.addPage();

  doc.setFontSize(16);
  doc.text("Cash Book - Page 2", 14, 15);

  autoTable(doc, {
    startY: 25,
    head: [["Date", "Description", "Amount"]],
    body: expenses.map((e: any) => [
      e.date,
      "Meal Expense",
      e.totalCost,
    ]),
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [["Summary", "Amount"]],
    body: [
      ["Total Income", totalIncome],
      ["Total Expenditure", totalExpense],
      ["Closing Balance", closingBalance],
    ],
  });

  doc.save(`Cashbook-${month}.pdf`);
};