"use client";

import { useCallback, useEffect, useState } from "react";
import { DataPanel, FeaturePage, type FeatureRow } from "@/components/FeaturePage";
import styles from "@/components/FeaturePage.module.css";
import { BuyerBillModal } from "@/components/BuyerBillModal";
import {
  type BuyerBillData,
  getSaleBillNumber,
} from "@/lib/buyer-bill";
import { formatQuantity, isTonneUnit } from "@/lib/quantity";

type Company = {
  id: string;
  name: string;
  type: "SUPPLIER" | "BUYER" | "BOTH";
  mobile: string | null;
  address: string | null;
  gstNumber: string | null;
  payableBalance: string | number;
  receivableBalance: string | number;
};

type ScrapType = {
  id: string;
  name: string;
  unit: string;
  currentStock: string | number;
};

type ApiSaleItem = {
  id: string;
  scrapTypeId: string;
  scrapType: {
    id: string;
    name: string;
    unit: string;
  };
  quantity: string | number;
  rate: string | number;
  amount: string | number;
};

type ApiSale = {
  id: string;
  buyerId: string;
  buyer: {
    id: string;
    name: string;
    mobile: string | null;
    address: string | null;
    gstNumber: string | null;
  };
  saleDate: string;
  notes: string | null;
  totalAmount: string | number;
  amountReceived: string | number;
  outstandingAmount: string | number;
  status: "PAID" | "PARTIAL" | "UNPAID";
  items: ApiSaleItem[];
  createdAt: string;
};

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function QuickBillPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [scrapTypes, setScrapTypes] = useState<ScrapType[]>([]);
  const [salesHistory, setSalesHistory] = useState<ApiSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Selected bill to view in modal
  const [selectedBillForModal, setSelectedBillForModal] = useState<BuyerBillData | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [scrapTypeId, setScrapTypeId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [amountReceived, setAmountReceived] = useState("");

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    customer?: string;
    scrapType?: string;
    quantity?: string;
    rate?: string;
    date?: string;
    amountReceived?: string;
  }>({});
  const [touched, setTouched] = useState<{
    customer?: boolean;
    scrapType?: boolean;
    quantity?: boolean;
    rate?: boolean;
    date?: boolean;
    amountReceived?: boolean;
  }>({});

  // UI state
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch live companies, scrap types, and sales history
  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [compRes, scrapRes, salesRes] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/scrap-types"),
        fetch("/api/sales?take=50"),
      ]);

      if (!compRes.ok) throw new Error("Failed to load companies");
      if (!scrapRes.ok) throw new Error("Failed to load scrap types");
      if (!salesRes.ok) throw new Error("Failed to load sales history");

      const compData: Company[] = await compRes.json();
      const scrapData: ScrapType[] = await scrapRes.json();
      const salesData: ApiSale[] = await salesRes.json();

      setCompanies(Array.isArray(compData) ? compData : []);
      setScrapTypes(Array.isArray(scrapData) ? scrapData : []);
      setSalesHistory(Array.isArray(salesData) ? salesData : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load reference data";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        void loadData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Customers are companies with type BUYER or BOTH
  const customers = companies.filter((c) => c.type === "BUYER" || c.type === "BOTH");
  const selectedCustomer = companies.find((c) => c.id === customerId);
  const selectedScrapType = scrapTypes.find((s) => s.id === scrapTypeId);

  // Unit and stock calculation
  const unit = selectedScrapType?.unit || "Tonne (MT)";
  const availableStockKg = selectedScrapType ? Number(selectedScrapType.currentStock) || 0 : 0;

  // Numeric quantities
  const rawQty = quantity.trim();
  const parsedQty = Number(rawQty);
  const isQtyValid = rawQty !== "" && !isNaN(parsedQty) && parsedQty > 0;
  const numQuantity = isQtyValid ? parsedQty : 0;

  const rawRate = rate.trim();
  const parsedRate = Number(rawRate);
  const isRateValid = rawRate !== "" && !isNaN(parsedRate) && parsedRate > 0;
  const numRate = isRateValid ? parsedRate : 0;

  // Automatic calculation: Total Amount = Quantity * Rate
  const totalAmount = numQuantity * numRate;

  // Convert entered quantity to kg for stock comparison
  const enteredQtyKg = isTonneUnit(unit) ? numQuantity * 1000 : numQuantity;
  const isStockInsufficient = selectedScrapType ? enteredQtyKg > availableStockKg || availableStockKg <= 0 : false;

  // Amount received & udhari calculation
  const rawReceived = amountReceived.trim();
  const parsedReceived = rawReceived === "" ? 0 : Number(rawReceived);
  const numReceived = !isNaN(parsedReceived) && parsedReceived >= 0 ? parsedReceived : 0;
  const remainingDue = Math.max(totalAmount - numReceived, 0);

  // Validation functions
  const validateCustomer = (id: string): string | undefined => {
    if (!id || !id.trim()) return "Customer / Company is required.";
    return undefined;
  };

  const validateScrapType = (id: string): string | undefined => {
    if (!id || !id.trim()) return "Scrap Type is required.";
    return undefined;
  };

  const validateQuantityField = (val: string, currentScrap: ScrapType | undefined): string | undefined => {
    const trimmed = val.trim();
    if (!trimmed) return "Quantity is required.";
    const num = Number(trimmed);
    if (isNaN(num) || num <= 0) return "Quantity must be a valid positive number greater than 0.";

    if (currentScrap) {
      const curStockKg = Number(currentScrap.currentStock) || 0;
      const inKg = isTonneUnit(currentScrap.unit) ? num * 1000 : num;
      if (inKg > curStockKg || curStockKg <= 0) {
        return `Insufficient stock available for this scrap type. Available: ${formatQuantity(curStockKg)}.`;
      }
    }
    return undefined;
  };

  const validateRateField = (val: string): string | undefined => {
    const trimmed = val.trim();
    if (!trimmed) return "Rate is required.";
    const num = Number(trimmed);
    if (isNaN(num) || num <= 0) return "Rate must be a valid positive number greater than 0.";
    return undefined;
  };

  const validateDateField = (val: string): string | undefined => {
    const trimmed = val.trim();
    if (!trimmed) return "Date is required.";
    if (isNaN(new Date(trimmed).getTime())) return "Please select a valid date.";
    return undefined;
  };

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    if (touched.customer || id) {
      setFieldErrors((prev) => ({ ...prev, customer: validateCustomer(id) }));
    }
  };

  const handleScrapChange = (id: string) => {
    setScrapTypeId(id);
    const chosenScrap = scrapTypes.find((s) => s.id === id);
    if (touched.scrapType || id) {
      setFieldErrors((prev) => ({ ...prev, scrapType: validateScrapType(id) }));
    }
    if (quantity.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        quantity: validateQuantityField(quantity, chosenScrap),
      }));
    }
  };

  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    if (touched.quantity || val.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        quantity: validateQuantityField(val, selectedScrapType),
      }));
    }
  };

  const handleRateChange = (val: string) => {
    setRate(val);
    if (touched.rate || val.trim()) {
      setFieldErrors((prev) => ({ ...prev, rate: validateRateField(val) }));
    }
  };

  const handleDateChange = (val: string) => {
    setBillDate(val);
    if (touched.date || val.trim()) {
      setFieldErrors((prev) => ({ ...prev, date: validateDateField(val) }));
    }
  };

  const handleAmountReceivedChange = (val: string) => {
    setAmountReceived(val);
    const trimmed = val.trim();
    if (trimmed !== "") {
      const num = Number(trimmed);
      if (isNaN(num) || num < 0) {
        setFieldErrors((prev) => ({ ...prev, amountReceived: "Amount received cannot be negative." }));
      } else if (totalAmount > 0 && num > totalAmount) {
        setFieldErrors((prev) => ({ ...prev, amountReceived: "Amount received cannot exceed the total amount." }));
      } else {
        setFieldErrors((prev) => ({ ...prev, amountReceived: undefined }));
      }
    } else {
      setFieldErrors((prev) => ({ ...prev, amountReceived: undefined }));
    }
  };

  // Submit and Generate Bill
  const handleGenerateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      customer: true,
      scrapType: true,
      quantity: true,
      rate: true,
      date: true,
      amountReceived: true,
    });

    const custErr = validateCustomer(customerId);
    const scrapErr = validateScrapType(scrapTypeId);
    const qtyErr = validateQuantityField(quantity, selectedScrapType);
    const rateErr = validateRateField(rate);
    const dateErr = validateDateField(billDate);

    let recErr: string | undefined;
    if (rawReceived !== "") {
      if (isNaN(parsedReceived) || parsedReceived < 0) {
        recErr = "Amount received cannot be negative.";
      } else if (totalAmount > 0 && parsedReceived > totalAmount) {
        recErr = "Amount received cannot exceed total amount.";
      }
    }

    const errors = {
      customer: custErr,
      scrapType: scrapErr,
      quantity: qtyErr,
      rate: rateErr,
      date: dateErr,
      amountReceived: recErr,
    };
    setFieldErrors(errors);

    if (custErr || scrapErr || qtyErr || rateErr || dateErr || recErr) {
      const firstError = custErr || scrapErr || qtyErr || rateErr || dateErr || recErr;
      setFormError(firstError || "Please fill in all required fields correctly.");
      return;
    }

    // Strict stock verification
    if (!selectedScrapType || enteredQtyKg > availableStockKg || availableStockKg <= 0) {
      setFormError("Insufficient stock available for this scrap type.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setSavedMessage(null);

    try {
      const payload = {
        buyerId: customerId,
        saleDate: new Date(billDate).toISOString(),
        notes: "Quick bill",
        amountReceived: numReceived,
        items: [
          {
            scrapTypeId,
            quantity: numQuantity,
            rate: numRate,
            unit,
          },
        ],
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Failed to create sales transaction and generate bill.");
      }

      const createdSale: ApiSale = body;
      const actualBillNumber = getSaleBillNumber(createdSale);

      // Build customer bill data for the modal
      const billData: BuyerBillData = {
        id: createdSale.id,
        billNumber: actualBillNumber,
        date: billDate,
        buyer: {
          id: selectedCustomer?.id,
          name: selectedCustomer?.name || "Customer",
          mobile: selectedCustomer?.mobile || null,
          address: selectedCustomer?.address || null,
          gstNumber: selectedCustomer?.gstNumber || null,
        },
        items: [
          {
            name: selectedScrapType.name,
            quantityKg: enteredQtyKg,
            unit,
            rate: numRate,
            amount: totalAmount,
          },
        ],
        totalAmount,
        amountPaid: numReceived,
        outstandingAmount: remainingDue,
        status: remainingDue === 0 ? "PAID" : numReceived > 0 ? "PARTIAL" : "UNPAID",
        notes: `Quick bill #${actualBillNumber}`,
      };

      // Reset form
      setQuantity("");
      setRate("");
      setAmountReceived("");
      setFieldErrors({});
      setTouched({});
      setSavedMessage(`Sale recorded and Bill #${actualBillNumber} generated successfully! Stock and customer udhari updated.`);

      // Automatically display the generated customer bill modal
      setSelectedBillForModal(billData);

      // Reload live data (refreshes stock and sales history)
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate bill.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert sales history to table rows
  const historyRows: FeatureRow[] = salesHistory.map((s) => {
    const firstItem = s.items[0];
    const scrapName = firstItem?.scrapType?.name || "Scrap Material";
    const itemQty = firstItem ? formatQuantity(isTonneUnit(firstItem.scrapType?.unit) ? Number(firstItem.quantity) * 1000 : Number(firstItem.quantity)) : "";
    const billNum = getSaleBillNumber(s);
    const dateFormatted = new Date(s.saleDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const due = Number(s.outstandingAmount) || 0;

    const modalData: BuyerBillData = {
      id: s.id,
      billNumber: billNum,
      date: s.saleDate.split("T")[0],
      buyer: {
        id: s.buyer.id,
        name: s.buyer.name,
        mobile: s.buyer.mobile,
        address: s.buyer.address,
        gstNumber: s.buyer.gstNumber,
      },
      items: s.items.map((i) => ({
        id: i.id,
        name: i.scrapType.name,
        quantityKg: isTonneUnit(i.scrapType.unit) ? Number(i.quantity) * 1000 : Number(i.quantity),
        unit: i.scrapType.unit,
        rate: Number(i.rate),
        amount: Number(i.amount),
      })),
      totalAmount: Number(s.totalAmount),
      amountPaid: Number(s.amountReceived),
      outstandingAmount: due,
      status: s.status,
      notes: s.notes,
    };

    return {
      id: s.id,
      title: `Bill #${billNum} · ${s.buyer.name}`,
      subtitle: `${itemQty ? `${itemQty} ${scrapName}` : scrapName} · ${dateFormatted}`,
      amount: money.format(Number(s.totalAmount)),
      status: due === 0 ? "Paid" : `Due: ${money.format(due)}`,
      tone: due === 0 ? ("green" as const) : ("amber" as const),
      actionLabel: "View Bill",
      onAction: () => setSelectedBillForModal(modalData),
    };
  });

  return (
    <FeaturePage
      active="/quick-bill"
      eyebrow="SALES & BILLING"
      title="Quick bill"
      description="Sell scrap, update stock and customer udhari, and generate the customer bill instantly."
    >
      {apiError && (
        <p className={styles.errorMessage} style={{ margin: "14px 0" }}>
          {apiError}
        </p>
      )}

      {/* Main Fast Entry Quick Bill Section */}
      <section className={styles.panel} id="quick-bill-form">
        <div className={styles.panelHeader}>
          <div>
            <h2>New Customer Bill</h2>
            <p>Select customer, scrap type, enter quantity and rate to generate a customer bill.</p>
          </div>
          <span className={`${styles.status} ${styles.green}`}>Live Inventory Connected</span>
        </div>

        <form onSubmit={handleGenerateBill} noValidate style={{ marginTop: "18px" }}>
          <div className={styles.formGrid}>
            {/* 1. Customer / Company * */}
            <label>
              <span>
                Customer / Company <span style={{ color: "#b45e4d" }}>*</span>
              </span>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, customer: true }));
                  setFieldErrors((prev) => ({ ...prev, customer: validateCustomer(customerId) }));
                }}
                style={fieldErrors.customer ? { borderColor: "#b45e4d" } : undefined}
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.customer ? (
                <span style={{ color: "#b45e4d", fontSize: "11px", marginTop: "2px" }}>
                  {fieldErrors.customer}
                </span>
              ) : (
                <span style={{ color: "#8a9b96", fontSize: "10px", marginTop: "2px" }}>
                  Select buyer from Companies directory
                </span>
              )}
            </label>

            {/* 2. Scrap Type * */}
            <label>
              <span>
                Scrap Type <span style={{ color: "#b45e4d" }}>*</span>
              </span>
              <select
                value={scrapTypeId}
                onChange={(e) => handleScrapChange(e.target.value)}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, scrapType: true }));
                  setFieldErrors((prev) => ({ ...prev, scrapType: validateScrapType(scrapTypeId) }));
                }}
                style={fieldErrors.scrapType ? { borderColor: "#b45e4d" } : undefined}
              >
                <option value="">Select Scrap Type</option>
                {scrapTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · Available: {formatQuantity(t.currentStock)}
                  </option>
                ))}
              </select>
              {fieldErrors.scrapType ? (
                <span style={{ color: "#b45e4d", fontSize: "11px", marginTop: "2px" }}>
                  {fieldErrors.scrapType}
                </span>
              ) : selectedScrapType ? (
                <span
                  style={{
                    color: availableStockKg <= 0 ? "#b45e4d" : "#39816b",
                    fontSize: "10px",
                    fontWeight: 500,
                    marginTop: "2px",
                  }}
                >
                  {availableStockKg <= 0
                    ? "Out of stock in yard"
                    : `In yard: ${formatQuantity(availableStockKg)} (${selectedScrapType.unit})`}
                </span>
              ) : (
                <span style={{ color: "#8a9b96", fontSize: "10px", marginTop: "2px" }}>
                  Select from central Scrap Type master (supports Marathi/English)
                </span>
              )}
            </label>

            {/* 3. Quantity * */}
            <label>
              <span>
                Quantity {selectedScrapType ? `(${selectedScrapType.unit})` : ""} <span style={{ color: "#b45e4d" }}>*</span>
              </span>
              <input
                type="number"
                step="any"
                min="0.001"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, quantity: true }));
                  setFieldErrors((prev) => ({
                    ...prev,
                    quantity: validateQuantityField(quantity, selectedScrapType),
                  }));
                }}
                placeholder={selectedScrapType && isTonneUnit(selectedScrapType.unit) ? "e.g. 10 or 12.5" : "e.g. 500"}
                style={fieldErrors.quantity ? { borderColor: "#b45e4d" } : undefined}
              />
              {fieldErrors.quantity ? (
                <span style={{ color: "#b45e4d", fontSize: "11px", marginTop: "2px" }}>
                  {fieldErrors.quantity}
                </span>
              ) : (
                <span style={{ color: "#8a9b96", fontSize: "10px", marginTop: "2px" }}>
                  Enter positive quantity to sell
                </span>
              )}
            </label>

            {/* 4. Rate * */}
            <label>
              <span>
                Rate {selectedScrapType ? `(₹ / ${selectedScrapType.unit})` : "(₹)"} <span style={{ color: "#b45e4d" }}>*</span>
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                value={rate}
                onChange={(e) => handleRateChange(e.target.value)}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, rate: true }));
                  setFieldErrors((prev) => ({ ...prev, rate: validateRateField(rate) }));
                }}
                placeholder={selectedScrapType && isTonneUnit(selectedScrapType.unit) ? "e.g. 42000" : "e.g. 45"}
                style={fieldErrors.rate ? { borderColor: "#b45e4d" } : undefined}
              />
              {fieldErrors.rate ? (
                <span style={{ color: "#b45e4d", fontSize: "11px", marginTop: "2px" }}>
                  {fieldErrors.rate}
                </span>
              ) : (
                <span style={{ color: "#8a9b96", fontSize: "10px", marginTop: "2px" }}>
                  Selling rate per unit
                </span>
              )}
            </label>

            {/* 5. Date * */}
            <label>
              <span>
                Date <span style={{ color: "#b45e4d" }}>*</span>
              </span>
              <input
                type="date"
                value={billDate}
                onChange={(e) => handleDateChange(e.target.value)}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, date: true }));
                  setFieldErrors((prev) => ({ ...prev, date: validateDateField(billDate) }));
                }}
                style={fieldErrors.date ? { borderColor: "#b45e4d" } : undefined}
              />
              {fieldErrors.date ? (
                <span style={{ color: "#b45e4d", fontSize: "11px", marginTop: "2px" }}>
                  {fieldErrors.date}
                </span>
              ) : (
                <span style={{ color: "#8a9b96", fontSize: "10px", marginTop: "2px" }}>
                  Date of sale transaction
                </span>
              )}
            </label>

            {/* Optional Amount Received Now */}
            <label>
              <span>Amount Received Now (₹)</span>
              <input
                type="number"
                step="any"
                min="0"
                value={amountReceived}
                onChange={(e) => handleAmountReceivedChange(e.target.value)}
                placeholder="0.00 (Leave empty for full udhari)"
                style={fieldErrors.amountReceived ? { borderColor: "#b45e4d" } : undefined}
              />
              {fieldErrors.amountReceived ? (
                <span style={{ color: "#b45e4d", fontSize: "11px", marginTop: "2px" }}>
                  {fieldErrors.amountReceived}
                </span>
              ) : (
                <span style={{ color: "#8a9b96", fontSize: "10px", marginTop: "2px" }}>
                  Optional. Remaining balance is saved to customer udhari
                </span>
              )}
            </label>
          </div>

          {/* Automatic Calculation Display */}
          <div className={styles.billTotal} style={{ marginTop: "18px" }}>
            <span>Total</span>
            <strong>{money.format(totalAmount)}</strong>
            <small>
              {numQuantity > 0 && numRate > 0 ? (
                <>
                  {numQuantity} {unit} × {money.format(numRate)} / {unit}
                  {numReceived > 0 && (
                    <> · Received: {money.format(numReceived)} · Due (Udhari): {money.format(remainingDue)}</>
                  )}
                </>
              ) : (
                "Total Amount = Quantity × Rate"
              )}
            </small>
          </div>

          <div style={{ marginTop: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className={styles.saveButton}
              type="submit"
              disabled={isSubmitting || isStockInsufficient}
              style={{ marginTop: 0 }}
            >
              {isSubmitting ? "Generating Bill..." : "Generate Bill"}
            </button>
          </div>

          {formError && (
            <p className={styles.errorMessage} style={{ marginTop: "14px" }}>
              {formError}
            </p>
          )}
          {savedMessage && (
            <p className={styles.successMessage} style={{ marginTop: "14px" }}>
              {savedMessage}
            </p>
          )}
        </form>
      </section>

      {/* Generated Bills & Sales History */}
      <DataPanel
        title="Recent Bills & Sales History"
        subtitle="Customer bills generated through Quick Bill"
        rows={historyRows}
        loading={loading}
        emptyText="No customer bills generated yet. Fill in the form above to generate your first bill."
      />

      {/* Customer Bill View & Print Modal */}
      <BuyerBillModal
        bill={selectedBillForModal}
        onClose={() => setSelectedBillForModal(null)}
      />
    </FeaturePage>
  );
}
