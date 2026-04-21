import jsPDF from "jspdf";
import "jspdf-autotable";

export const generateCashbookPDF = (data: any, month: string) => {
  const doc = new jsPDF();

  const receipts = Array.isArray(data.receipts) ? data.receipts : [];
  const expenses = Array.isArray(data.dailyEntries) ? data.dailyEntries : [];

  let openingBalance = Number(data.openingBalance || 0);

  const totalIncome = receipts.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);
  const totalExpense = expenses.reduce((sum: number, e: any) => sum + (parseFloat(e.totalCost) || 0), 0);

  const totalAvailable = openingBalance + totalIncome;
  const closingBalance = totalAvailable - totalExpense;

  doc.setFontSize(16);
  doc.text("Cash Book - Page 1", 14, 15);

  doc.setFontSize(10);
  doc.text(`Month: ${month}`, 14, 22);

  doc.autoTable({
    startY: 30,
    head: [["Particulars", "Amount"]],
    body: [
      ["Opening Balance", openingBalance],
      ["Total Income", totalIncome],
      ["Total Available", totalAvailable],
    ],
  });

  const lastY = (doc as any).lastAutoTable?.finalY || 40;

  doc.autoTable({
    startY: lastY + 10,
    head: [["Date", "Description", "Amount"]],
    body: receipts.map((r: any) => [
      r.date,
      r.description || "Receipt",
      r.amount,
    ]),
  });

  doc.addPage();

  doc.setFontSize(16);
  doc.text("Cash Book - Page 2", 14, 15);

  doc.autoTable({
    startY: 25,
    head: [["Date", "Description", "Amount"]],
    body: expenses.map((e: any) => [
      e.date,
      "Meal Expense",
      e.totalCost,
    ]),
  });

  const lastY2 = (doc as any).lastAutoTable?.finalY || 40;

  doc.autoTable({
    startY: lastY2 + 10,
    head: [["Summary", "Amount"]],
    body: [
      ["Total Income", totalIncome],
      ["Total Expenditure", totalExpense],
      ["Closing Balance", closingBalance],
    ],
  });

  return {
    pdfBlob: doc.output("blob"),
    filename: `Cashbook-${month}.pdf`
  };
};
