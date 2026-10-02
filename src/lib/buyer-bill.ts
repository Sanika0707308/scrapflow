import { jsPDF } from "jspdf";
import { type BusinessProfile } from "./business-profile";
import { formatQuantity } from "./quantity";

export type BuyerBillItem = {
  id?: string;
  name: string;
  quantityKg: number;
  unit?: string;
  rate: number;
  amount: number;
};

export type BuyerBillData = {
  id?: string;
  billNumber: string;
  date: string;
  buyer: {
    id?: string;
    name: string;
    mobile?: string | null;
    address?: string | null;
    gstNumber?: string | null;
    contactPerson?: string | null;
  };
  items: BuyerBillItem[];
  totalAmount: number;
  amountPaid: number;
  outstandingAmount: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
  notes?: string | null;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatBillCurrency(amount: number): string {
  return currencyFormatter.format(amount || 0);
}

/**
 * Extracts or generates a standard buyer bill number from sale records.
 */
export function getSaleBillNumber(sale: { id: string; notes?: string | null; createdAt?: string }): string {
  if (sale.notes) {
    const match = sale.notes.match(/(?:Quick bill #|Bill #|Invoice #|INV-|SF-)([A-Za-z0-9-]+)/i);
    if (match) {
      if (match[0].startsWith("SF-") || match[0].startsWith("INV-")) {
        return match[0];
      }
      return match[1];
    }
  }
  return `BILL-${sale.id.slice(-6).toUpperCase()}`;
}

/**
 * Generates an 80mm thermal/slip or standard format PDF bill for the buyer.
 */
export function generateBuyerBillPdf(bill: BuyerBillData, profile?: Partial<BusinessProfile> | null): jsPDF {
  // Height dynamic based on items length
  const baseHeight = 180 + Math.max(0, (bill.items.length - 1) * 20);
  const pdf = new jsPDF({ unit: "mm", format: [80, baseHeight] });

  const bName = profile?.businessName || "ScrapFlow Business";
  const oName = profile?.ownerName || "Business Owner";

  const pdfMoney = (amount: number) =>
    `Rs. ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const center = (
    text: string,
    y: number,
    size: number,
    color: [number, number, number] = [35, 70, 62],
  ) => {
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    pdf.text(text, 40, y, { align: "center" });
  };

  const line = (y: number) => {
    pdf.setDrawColor(195, 210, 203);
    pdf.line(5, y, 75, y);
  };

  const right = (text: string, y: number, size = 9) => {
    pdf.setFontSize(size);
    pdf.setTextColor(45, 78, 68);
    pdf.text(text, 75, y, { align: "right" });
  };

  const left = (text: string, y: number, size = 9) => {
    pdf.setFontSize(size);
    pdf.setTextColor(45, 78, 68);
    pdf.text(text, 5, y);
  };

  // Header
  center(bName, 12, 14, [27, 74, 64]);
  center("SCRAP SALE INVOICE / BUYER BILL", 18, 7.5, [90, 110, 102]);
  if (profile?.address) {
    center(profile.address.slice(0, 45), 23, 7, [90, 110, 102]);
  }
  if (profile?.gst) {
    center(`GSTIN: ${profile.gst}`, 28, 7, [90, 110, 102]);
  }
  line(31);

  // Bill metadata
  left(`Bill No: ${bill.billNumber}`, 37, 8);
  right(`Date: ${bill.date}`, 37, 8);

  // Buyer Info
  left("BILLED TO (BUYER):", 45, 7);
  const buyerLines = pdf.splitTextToSize(bill.buyer.name || "Buyer / Client", 68) as string[];
  pdf.setFontSize(10);
  pdf.setTextColor(27, 74, 64);
  pdf.text(buyerLines, 5, 50);

  let currentY = 50 + (buyerLines.length - 1) * 4;
  if (bill.buyer.mobile) {
    currentY += 4;
    left(`Mobile: ${bill.buyer.mobile}`, currentY, 7.5);
  }
  if (bill.buyer.gstNumber) {
    currentY += 4;
    left(`Buyer GST: ${bill.buyer.gstNumber}`, currentY, 7.5);
  }
  if (bill.buyer.address) {
    currentY += 4;
    left(`Address: ${bill.buyer.address.slice(0, 45)}`, currentY, 7);
  }

  currentY += 5;
  line(currentY);

  // Items table header
  currentY += 6;
  left("ITEM / SCRAP (QTY IN KG)", currentY, 7);
  right("AMOUNT", currentY, 7);
  currentY += 3;
  line(currentY);

  // Items
  for (const item of bill.items) {
    currentY += 6;
    const itemTitle = item.name;
    const titleLines = pdf.splitTextToSize(itemTitle, 48) as string[];
    pdf.setFontSize(9);
    pdf.setTextColor(45, 78, 68);
    pdf.text(titleLines, 5, currentY);

    right(pdfMoney(item.amount), currentY, 9);

    currentY += 4 + (titleLines.length - 1) * 3;
    const kgText = `${Number(item.quantityKg).toLocaleString("en-IN")} kg`;
    const formattedNote = item.quantityKg >= 1000 ? ` (${formatQuantity(item.quantityKg)})` : "";
    left(`${kgText}${formattedNote} @ Rs. ${item.rate.toLocaleString("en-IN")}`, currentY, 7.5);
  }

  currentY += 6;
  line(currentY);

  // Totals
  currentY += 7;
  left("Total Bill Amount", currentY, 9);
  right(pdfMoney(bill.totalAmount), currentY, 9);

  currentY += 7;
  left("Amount Paid / Received", currentY, 9);
  right(pdfMoney(bill.amountPaid), currentY, 9);

  currentY += 8;
  pdf.setFontSize(9);
  pdf.setTextColor(180, 94, 77); // reddish for due
  left("Udhari / Due Balance", currentY, 9);
  right(pdfMoney(bill.outstandingAmount), currentY, 10);

  currentY += 5;
  const statusLabel =
    bill.status === "PAID"
      ? "Status: FULLY PAID"
      : bill.status === "PARTIAL"
        ? "Status: PARTIALLY PAID (UDHARI)"
        : "Status: UNPAID (FULL UDHARI)";
  center(statusLabel, currentY, 7.5, bill.status === "PAID" ? [57, 129, 107] : [180, 94, 77]);

  if (bill.notes) {
    currentY += 5;
    center(`Note: ${bill.notes.slice(0, 45)}`, currentY, 7, [125, 140, 132]);
  }

  currentY += 7;
  line(currentY);

  currentY += 7;
  center("Thank you for your business!", currentY, 8, [90, 110, 102]);
  currentY += 5;
  center(`Authorized Signatory - ${oName}`, currentY, 7, [125, 140, 132]);

  return pdf;
}

/**
 * Downloads the buyer invoice as a PDF file.
 */
export function downloadBuyerBillPdf(bill: BuyerBillData, profile?: Partial<BusinessProfile> | null): void {
  const pdf = generateBuyerBillPdf(bill, profile);
  const cleanName = (bill.buyer.name || "buyer").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  pdf.save(`scrapflow-bill-${bill.billNumber.toLowerCase()}-${cleanName}.pdf`);
}

/**
 * Formats a clean WhatsApp message for the buyer's bill.
 */
export function getBuyerBillWhatsAppMessage(bill: BuyerBillData, profile?: Partial<BusinessProfile> | null): string {
  const bName = profile?.businessName || "ScrapFlow Business";
  const oName = profile?.ownerName || "Business Owner";
  const itemsSummary = bill.items
    .map(
      (i) =>
        `• ${i.name}: ${Number(i.quantityKg).toLocaleString("en-IN")} kg (${formatQuantity(i.quantityKg)}) @ ₹${i.rate.toLocaleString("en-IN")} = ₹${Number(i.amount).toLocaleString("en-IN")}`,
    )
    .join("\n");

  const statusText =
    bill.status === "PAID"
      ? "Fully Paid"
      : bill.status === "PARTIAL"
        ? `Partially Paid (Due: ₹${Number(bill.outstandingAmount).toLocaleString("en-IN")})`
        : `Unpaid / Udhari (Due: ₹${Number(bill.outstandingAmount).toLocaleString("en-IN")})`;

  return (
    `*TAX INVOICE / SALE BILL - ${bName}*\n` +
    `--------------------------------\n` +
    `*Bill No:* ${bill.billNumber}\n` +
    `*Date:* ${bill.date}\n` +
    `*Buyer:* ${bill.buyer.name}\n` +
    (bill.buyer.mobile ? `*Contact:* ${bill.buyer.mobile}\n` : "") +
    `--------------------------------\n` +
    `*Items:* \n${itemsSummary}\n` +
    `--------------------------------\n` +
    `*Total Amount:* ₹${Number(bill.totalAmount).toLocaleString("en-IN")}\n` +
    `*Paid Amount:* ₹${Number(bill.amountPaid).toLocaleString("en-IN")}\n` +
    `*Udhari / Due Balance:* ₹${Number(bill.outstandingAmount).toLocaleString("en-IN")}\n` +
    `*Payment Status:* ${statusText}\n` +
    (bill.notes ? `*Notes:* ${bill.notes}\n` : "") +
    `--------------------------------\n` +
    `Thank you for your business! Contact: ${oName}.`
  );
}

/**
 * Triggers direct browser printing of the buyer bill.
 */
export function printBuyerBill(bill: BuyerBillData, profile?: Partial<BusinessProfile> | null): void {
  const bName = profile?.businessName || "ScrapFlow Business";
  const oName = profile?.ownerName || "Business Owner";

  const printWindow = window.open("", "_blank", "width=650,height=750");
  if (!printWindow) {
    alert("Please allow popups to print the bill.");
    return;
  }

  const itemsHtml = bill.items
    .map(
      (i) => `
    <tr>
      <td style="padding: 8px 6px; border-bottom: 1px solid #edf1f0;">${i.name}</td>
      <td style="padding: 8px 6px; border-bottom: 1px solid #edf1f0; text-align: right;">${Number(i.quantityKg).toLocaleString("en-IN")} kg <small style="color: #71817d;">(${formatQuantity(i.quantityKg)})</small></td>
      <td style="padding: 8px 6px; border-bottom: 1px solid #edf1f0; text-align: right;">₹${i.rate.toLocaleString("en-IN")}</td>
      <td style="padding: 8px 6px; border-bottom: 1px solid #edf1f0; text-align: right; font-weight: 700;">₹${Number(i.amount).toLocaleString("en-IN")}</td>
    </tr>
  `,
    )
    .join("");

  const statusBadge =
    bill.status === "PAID"
      ? '<span style="background: #e2f4ea; color: #206d48; padding: 4px 8px; border-radius: 4px; font-weight: 700;">FULLY PAID</span>'
      : bill.status === "PARTIAL"
        ? '<span style="background: #fdf3d8; color: #9c6800; padding: 4px 8px; border-radius: 4px; font-weight: 700;">PARTIAL UDHARI</span>'
        : '<span style="background: #fde8e4; color: #b45e4d; padding: 4px 8px; border-radius: 4px; font-weight: 700;">UNPAID / UDHARI</span>';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bill #${bill.billNumber} - ${bill.buyer.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #163a35; padding: 24px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #163a35; padding-bottom: 12px; margin-bottom: 16px; }
          .header h1 { margin: 0; font-size: 24px; color: #163a35; }
          .header p { margin: 4px 0 0; color: #647571; font-size: 12px; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
          .buyer-box { background: #f5f7f6; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
          th { text-align: left; padding: 8px 6px; border-bottom: 2px solid #dfe8e4; color: #647571; font-size: 11px; text-transform: uppercase; }
          .totals { margin-top: 16px; border-top: 2px solid #dfe8e4; padding-top: 12px; font-size: 14px; }
          .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .totals-row.grand { font-size: 18px; font-weight: 800; border-top: 1px solid #dfe8e4; border-bottom: 1px solid #dfe8e4; padding: 8px 0; margin: 6px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #8a9995; border-top: 1px dashed #cbd6d2; padding-top: 16px; }
          @media print {
            body { padding: 0; }
            @page { margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${bName}</h1>
          <p>Scrap Trading & Material Dispatches</p>
          ${profile?.address ? `<p>${profile.address}</p>` : ""}
          ${profile?.mobile ? `<p>Contact: ${profile.mobile} ${profile.email ? `· ${profile.email}` : ""}</p>` : ""}
          ${profile?.gst ? `<p><strong>GSTIN:</strong> ${profile.gst}</p>` : ""}
        </div>

        <div class="meta">
          <div>
            <strong>Bill No:</strong> ${bill.billNumber}<br>
            <strong>Date:</strong> ${bill.date}
          </div>
          <div style="text-align: right;">
            <strong>Status:</strong> ${statusBadge}
          </div>
        </div>

        <div class="buyer-box">
          <strong>BILLED TO (BUYER):</strong><br>
          <span style="font-size: 15px; font-weight: 700; color: #163a35;">${bill.buyer.name}</span><br>
          ${bill.buyer.contactPerson ? `Contact: ${bill.buyer.contactPerson}<br>` : ""}
          ${bill.buyer.mobile ? `Mobile: ${bill.buyer.mobile}<br>` : ""}
          ${bill.buyer.address ? `Address: ${bill.buyer.address}<br>` : ""}
          ${bill.buyer.gstNumber ? `Buyer GST: ${bill.buyer.gstNumber}<br>` : ""}
        </div>

        <table>
          <thead>
            <tr>
              <th>Item / Material</th>
              <th style="text-align: right;">Quantity in kg</th>
              <th style="text-align: right;">Rate (₹)</th>
              <th style="text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>₹${Number(bill.totalAmount).toLocaleString("en-IN")}</span>
          </div>
          <div class="totals-row grand">
            <span>Total Bill Amount</span>
            <span>₹${Number(bill.totalAmount).toLocaleString("en-IN")}</span>
          </div>
          <div class="totals-row" style="color: #206d48;">
            <span>Paid Amount</span>
            <span>₹${Number(bill.amountPaid).toLocaleString("en-IN")}</span>
          </div>
          <div class="totals-row" style="color: #b45e4d; font-weight: 700;">
            <span>Udhari / Due Balance</span>
            <span>₹${Number(bill.outstandingAmount).toLocaleString("en-IN")}</span>
          </div>
        </div>

        ${bill.notes ? `<p style="margin-top: 14px; font-size: 12px; color: #566d66;"><strong>Notes / Challan:</strong> ${bill.notes}</p>` : ""}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p style="font-size: 11px;">Prepared by ${oName} · Generated by ScrapFlow</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}
