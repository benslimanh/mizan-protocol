// frontend/src/utils/pdfGenerator.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COMPANY_NAME = "Mizan Bank";
const CURRENCY = "$";

export const generatePromiseToPurchase = (contract, client) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(234, 88, 12); // Orange brand color
    doc.text(COMPANY_NAME, 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Islamic Banking Division", 20, 26);
    doc.text(new Date().toDateString(), 160, 20);

    doc.setDrawColor(200);
    doc.line(20, 30, 190, 30);

    // Title
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text("UNDERTAKING TO PURCHASE (WA'D)", 105, 50, null, null, "center");

    // Content
    doc.setFontSize(12);
    const bodyText = `
  I, the undersigned ${client?.name || "[Client Name]"}, hereby request ${COMPANY_NAME} to purchase the asset described below.
  
  I solemnly promise and undertake that upon the Bank acquiring the said asset, I shall purchase it from the Bank through a Murabaha Sale Contract for the total cost plus the agreed profit margin.
  
  I acknowledge that the "Hamish Jiddiyyah" (Security Deposit) of ${CURRENCY}${contract.summary.security_deposit?.toLocaleString()} provided herewith is to ensure the seriousness of this order. In case of my breach of this promise, the Bank is authorized to deduct actual damages from this deposit.
  `;

    const splitText = doc.splitTextToSize(bodyText, 170);
    doc.text(splitText, 20, 70);

    // Asset Details Table
    doc.autoTable({
        startY: 120,
        head: [['Asset Details', 'Values']],
        body: [
            ['Asset Cost (Principal)', `${CURRENCY}${contract.summary.asset_price.toLocaleString()}`],
            ['Down Payment %', `${(contract.summary.down_payment_from_pct / contract.summary.asset_price * 100).toFixed(2)}%`],
            ['Security Deposit', `${CURRENCY}${contract.summary.security_deposit.toLocaleString()}`],
            ['Tenure', `${contract.duration_months || 12} Months`],
            ['Anticipated Profit Rate', `${(contract.profit_rate || 0.05) * 100}% p.a.`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60] }
    });

    // Signatures
    doc.text("_______________________", 30, 250);
    doc.text("Client Signature", 30, 260);

    doc.text("_______________________", 140, 250);
    doc.text("Bank Officer", 140, 260);

    doc.save(`Promise_${contract.id || 'Draft'}.pdf`);
};

export const generateMurabahaContract = (contract, client) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(234, 88, 12);
    doc.text(COMPANY_NAME, 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("MURABAHA SALE CONTRACT", 105, 40, null, null, "center");

    // Parties
    doc.setFontSize(10);
    doc.text(`Contract ID: ${contract.id}`, 20, 55);
    doc.text(`Date of Sale: ${new Date().toLocaleDateString()}`, 150, 55);

    const intro = `This Murabaha Agreement is executed between ${COMPANY_NAME} (The Seller) and ${client?.name} (The Buyer). The Seller hereby sells the Asset to the Buyer for the Total Murabaha Price specified below, to be paid in deferred installments.`;
    doc.text(doc.splitTextToSize(intro, 170), 20, 65);

    // Financials
    doc.autoTable({
        startY: 85,
        head: [['Financial Breakdown', 'Amount']],
        body: [
            ['Cost of Asset', `${CURRENCY}${contract.summary.asset_price.toLocaleString()}`],
            ['Total Down Payment (Invl. Deposit)', `${CURRENCY}${contract.summary.total_down_payment.toLocaleString()}`],
            ['Financed Amount', `${CURRENCY}${contract.summary.financed_amount.toLocaleString()}`],
            ['Total Profit', `${CURRENCY}${contract.summary.total_profit.toLocaleString()}`],
            ['Total Contract Value (Murabaha Price)', `${CURRENCY}${contract.summary.total_cost.toLocaleString()}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12] }
    });

    // Schedule
    doc.text("Payment Schedule", 20, doc.lastAutoTable.finalY + 15);

    // Prepare Schedule Data
    const scheduleRows = contract.schedule.map(row => [
        row.month,
        row.date,
        `${CURRENCY}${row.monthly_installment.toLocaleString()}`,
        `${CURRENCY}${row.principal_paid.toLocaleString()}`,
        `${CURRENCY}${row.profit_portion.toLocaleString()}`,
        `${CURRENCY}${row.remaining_balance.toLocaleString()}`
    ]);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['#', 'Date', 'Installment', 'Principal', 'Profit', 'Balance']],
        body: scheduleRows,
        theme: 'grid',
        styles: { fontSize: 8 }
    });

    // Signatures
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.text("_______________________", 30, finalY);
    doc.text("Buyer (Client)", 30, finalY + 10);

    doc.text("_______________________", 140, finalY);
    doc.text("Seller (Bank)", 140, finalY + 10);

    doc.save(`Murabaha_Contract_${contract.id}.pdf`);
};
