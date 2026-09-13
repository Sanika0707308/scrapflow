"use client";

import { useCallback, useEffect, useState } from "react";
import { DataPanel, FeaturePage, FormPanel, SummaryCards, type FeatureRow } from "@/components/FeaturePage";
import { formatQuantity } from "@/lib/quantity";

type ScrapType = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  currentStock: string | number;
  notes: string | null;
  createdAt: string;
};

type StockMovement = {
  id: string;
  type: "PURCHASE" | "SALE" | "OPENING" | "ADJUSTMENT";
  quantity: string | number;
  occurredAt: string;
  scrapType: { unit: string };
};

export default function StockPage() {
  const [scrapTypes, setScrapTypes] = useState<ScrapType[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stRes, movRes] = await Promise.all([
        fetch("/api/scrap-types"),
        fetch("/api/stock/movements?take=200"),
      ]);

      if (!stRes.ok) throw new Error("Failed to load scrap types");
      if (!movRes.ok) throw new Error("Failed to load stock movements");

      const stData = await stRes.json();
      const movData = await movRes.json();

      setScrapTypes(Array.isArray(stData) ? stData : []);
      setMovements(Array.isArray(movData) ? movData : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load stock data";
      setError(msg);
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

  const handleAddScrapType = async (values: Record<string, string>) => {
    const rawOpening = values["Opening stock"]?.trim();
    const openingStock = rawOpening && !isNaN(Number(rawOpening)) ? Number(rawOpening) : undefined;

    const payload = {
      name: values["Scrap name"].trim(),
      category: values["Category"]?.trim() || undefined,
      unit: values["Unit"]?.trim() || "Tonne (MT)",
      openingStock,
      notes: values["Notes"]?.trim() || undefined,
    };

    const res = await fetch("/api/scrap-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to add scrap type.");
    }

    await loadData();
  };

  // Calculations for KPI cards
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const totalAvailable = scrapTypes.reduce((acc, s) => acc + Number(s.currentStock), 0);
  const lowStockCount = scrapTypes.filter((s) => Number(s.currentStock) <= 0).length;

  const boughtThisMonth = movements
    .filter((m) => m.type === "PURCHASE" && m.occurredAt.startsWith(currentMonthPrefix))
    .reduce((acc, m) => acc + Math.abs(Number(m.quantity)), 0);

  const soldThisMonth = movements
    .filter((m) => m.type === "SALE" && m.occurredAt.startsWith(currentMonthPrefix))
    .reduce((acc, m) => acc + Math.abs(Number(m.quantity)), 0);

  const rows: FeatureRow[] = scrapTypes.map((s) => ({
    id: s.id,
    title: s.name,
    subtitle: `${s.category ? `${s.category} · ` : ""}Inventory`,
    amount: formatQuantity(s.currentStock),
    status: Number(s.currentStock) > 0 ? "In Stock" : "Out of Stock",
    tone: Number(s.currentStock) > 0 ? "green" : "red",
  }));

  return (
    <FeaturePage
      active="/stock"
      eyebrow="INVENTORY"
      title="Scrap stock"
      description="See how much material is available before you promise a delivery."
      actionLabel="Add scrap type"
      actionHref="#form"
    >
      <SummaryCards
        cards={[
          {
            label: "Available stock",
            value: formatQuantity(totalAvailable),
            note: `${scrapTypes.length} scrap types registered`,
            tone: "green",
          },
          {
            label: "Bought this month",
            value: formatQuantity(boughtThisMonth),
            note: "Recorded from purchases",
            tone: "amber",
          },
          {
            label: "Sold this month",
            value: formatQuantity(soldThisMonth),
            note: "Recorded from sales",
            tone: "blue",
          },
          {
            label: "Zero stock items",
            value: `${lowStockCount}`,
            note: lowStockCount > 0 ? "Materials need replenishment" : "All materials in stock",
            tone: lowStockCount > 0 ? "red" : "green",
          },
        ]}
      />

      <DataPanel
        title="Stock by scrap type"
        subtitle="Commercial units: metric tonnes (MT) and kilograms (kg)"
        rows={rows}
        loading={loading}
        error={error}
        emptyText="No scrap types added yet. Add a scrap type to start tracking stock."
      />

      <FormPanel
        title="Add a scrap type"
        fields={["Scrap name", "Category", "Unit", "Opening stock", "Notes"]}
        requiredFields={["Scrap name"]}
        disableLocalStorage={true}
        onSave={handleAddScrapType}
      />
    </FeaturePage>
  );
}
