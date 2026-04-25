import jsPDF from "jspdf";
import "jspdf-autotable";
import { calculateMonthlySummary } from "../services/summaryCalculator";

export const generateCashbookPDF = (data: any, month: string) => {
  const doc = new jsPDF();

  const summary = calculateMonthlySummary(data, month);
  const { cashAbstracts, monthEntries } = summary;

  const schoolName = data?.settings?.schoolDetails?.name || "School Name";
  const udise = data?.settings?.schoolDetails?.udise || "";
  const zone = data?.settings?.schoolDetails?.block || "Zone";

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

  // ---------- HEADER ----------
  const addHeader = () => {
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(schoolName.toUpperCase(), pageWidth / 2, 12, { align: "center" });

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    if (udise) {
      doc.text(`UDISE: ${udise}`, pageWidth / 2, 17, { align: "center" });
    }

    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text("PM POSHAN CASHBOOK", pageWidth / 2, 23, { align: "center" });

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Month: ${month}`, 14, 30);
  };

  // ---------- PAGE 1 (RECEIPTS) ----------
  addHeader();

  doc.autoTable({
    startY: 35,
    head: [["Receipt No", "Particulars", "Amount (Rs)"]],
    body: [
      [
        "R-001",
        openingBalance >= 0 ? "Opening Balance" : "Opening Deficit",
        Math.abs(openingBalance).toFixed(2),
      ],
      [
        "R-002",
        `Received from Zonal Education Office (${zone})`,
        totalIncome.toFixed(2),
      ],
      [
        "",
        "Total Available",
        (openingBalance + totalIncome).toFixed(2),
      ],
    ],
  });

  // ---------- PAGE 2 (EXPENDITURE) ----------
  doc.addPage();
  addHeader();

  let runningBalance = openingBalance;
  let voucherCounter = 1;

  const expenseRows: any[] = [];

  monthEntries.forEach((e: any) => {
    const amount = parseFloat(e.totalCost) || 0;

    if (amount > 0) {
      runningBalance -= amount;

      const voucherNo = `V-${String(voucherCounter).padStart(3, "0")}`;

      expenseRows.push([
        voucherNo,
        e.date,
        "Mid Day Meal Expenditure",
        amount.toFixed(2),
        runningBalance.toFixed(2),
      ]);

      voucherCounter++;
    }
  });

  doc.autoTable({
    startY: 35,
    head: [["Voucher No", "Date", "Particulars", "Debit (Rs)", "Balance (Rs)"]],
    body: expenseRows,
  });

  const lastY = (doc as any).lastAutoTable?.finalY || 40;

  doc.autoTable({
    startY: lastY + 10,
    head: [["Summary", "Amount (Rs)"]],
    body: [
      ["Total Income", totalIncome.toFixed(2)],
      ["Total Expenditure", totalExpense.toFixed(2)],
      [
        closingBalance >= 0 ? "Closing Balance" : "Deficit",
        Math.abs(closingBalance).toFixed(2),
      ],
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