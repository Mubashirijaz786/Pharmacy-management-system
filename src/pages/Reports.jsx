import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "../context/AppContext";
import { formatCurrency } from "../utils/helpers";
import { PrintHeader } from "../components/common/PrintHeader";
import { PrintFooter } from "../components/common/PrintFooter";
import { PrintExportActions } from "../components/common/PrintExportActions";
import {
  IoTrendingUpOutline,
  IoCubeOutline,
  IoWalletOutline,
  IoFilterOutline,
  IoPrintOutline,
  IoDownloadOutline,
  IoArrowBackOutline,
  IoAnalyticsOutline,
  IoSearchOutline,
  IoCheckmarkCircleOutline,
  IoReceiptOutline,
  IoLockClosedOutline,
  IoLockOpenOutline,
  IoCalendarOutline
} from "react-icons/io5";

export const Reports = () => {
  const { sales, medicines, suppliers, customers, branches, currentBranch, currentUser, exportToExcel, exportTableToPDF } = useContext(AppContext);

  // Persistent session unlock state (PIN: 12345)
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem("pharmacy_reports_unlocked") === "true";
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [passError, setPassError] = useState("");

  // Tabs: "dashboard" or "criteria"
  const [activeTab, setActiveTab] = useState("dashboard");
  const [viewMode, setViewMode] = useState("criteria"); // "criteria" or "report"


  // Helper date generators
  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);
  const thirtyDaysAgoIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  }, []);

  // --- CRITERIA FIELDS STATE ---
  const [criteria, setCriteria] = useState({
    selectedMedicineId: "",
    selectedSupplier: "",
    dateFrom: thirtyDaysAgoIso,
    dateTo: todayIso,
    viewCost: true,
    viewRetail: true,
    viewProfit: true
  });

  // Quick Date Preset Handler
  const applyDatePreset = (preset) => {
    const now = new Date();
    let fromDate = new Date();
    const toDate = now.toISOString().split("T")[0];

    if (preset === "today") {
      fromDate = now;
    } else if (preset === "yesterday") {
      fromDate.setDate(now.getDate() - 1);
      const yStr = fromDate.toISOString().split("T")[0];
      setCriteria((prev) => ({ ...prev, dateFrom: yStr, dateTo: yStr }));
      return;
    } else if (preset === "7days") {
      fromDate.setDate(now.getDate() - 7);
    } else if (preset === "month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset === "30days") {
      fromDate.setDate(now.getDate() - 30);
    } else if (preset === "all") {
      setCriteria((prev) => ({ ...prev, dateFrom: "2020-01-01", dateTo: toDate }));
      return;
    }

    setCriteria((prev) => ({
      ...prev,
      dateFrom: fromDate.toISOString().split("T")[0],
      dateTo: toDate
    }));
  };

  const uniqueSuppliersList = useMemo(() => {
    const fromSuppliers = suppliers.map((s) => s.name).filter(Boolean);
    const fromMeds = medicines.map((m) => m.supplierName || m.company).filter(Boolean);
    const combined = [...fromSuppliers, ...fromMeds];
    return combined.length > 0 ? Array.from(new Set(combined)).sort() : ["Standard Distributor"];
  }, [suppliers, medicines]);

  // When medicine is selected, auto-select its supplier if available
  const handleMedicineChange = (medId) => {
    if (!medId) {
      setCriteria((prev) => ({
        ...prev,
        selectedMedicineId: ""
      }));
      return;
    }
    const med = medicines.find((m) => m.id === medId);
    const medSupplier =
      med?.supplierName ||
      suppliers.find((sup) => sup.id === med?.supplierId)?.name ||
      med?.company ||
      "";
    setCriteria((prev) => ({
      ...prev,
      selectedMedicineId: medId,
      ...(medSupplier ? { selectedSupplier: medSupplier } : {})
    }));
  };

  const resetAllFilters = () => {
    setCriteria({
      selectedMedicineId: "",
      selectedSupplier: "",
      dateFrom: thirtyDaysAgoIso,
      dateTo: todayIso,
      viewCost: true,
      viewRetail: true,
      viewProfit: true
    });
  };

  // Count active filters (excluding date range default)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (criteria.selectedMedicineId) count++;
    if (criteria.selectedSupplier) count++;
    return count;
  }, [criteria.selectedMedicineId, criteria.selectedSupplier]);

  // --- FILTERED REPORT ROWS COMPUTATION ---
  const reportRows = useMemo(() => {
    const rows = [];
    sales.forEach((s) => {
      // 1. Date filter
      const saleDate = s.date?.split("T")[0] || "";
      if (saleDate < criteria.dateFrom || saleDate > criteria.dateTo) return;

      (s.items || []).forEach((item) => {
        const med = medicines.find((m) => m.id === (item.medicineId || item.id));

        // 2. Product dropdown filter
        if (criteria.selectedMedicineId && (item.medicineId || item.id) !== criteria.selectedMedicineId) return;

        // 3. Supplier dropdown filter
        if (criteria.selectedSupplier) {
          const medSup = med?.supplierName || (suppliers.find((sup) => sup.id === med?.supplierId)?.name) || med?.company;
          if (medSup !== criteria.selectedSupplier) return;
        }

        // Form Date components
        const sDate = s.date ? new Date(s.date) : new Date();
        const formattedDate = sDate.toLocaleDateString();
        const month = sDate.toLocaleString("default", { month: "short" });
        const year = sDate.getFullYear();
        const timeFormatted = sDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const rowCost = parseFloat(med ? med.costPrice : item.costPrice || 0) || 0;
        const rowPrice = parseFloat(item.price || item.sellingPrice || 0) || 0;
        const itemQty = Number(item.qty || item.quantity || 1);
        const rowProfit = (rowPrice - rowCost) * itemQty;

        rows.push({
          id: `${s.invoiceNo}-${item.medicineId || item.id}-${rows.length}`,
          invoiceNo: s.invoiceNo,
          date: formattedDate,
          rawDate: saleDate,
          month,
          year,
          time: timeFormatted,
          customer: s.customerName || "Walk-In Customer",
          paymentForm: s.paymentMethod || "Cash",
          cashier: s.cashier || "Cashier",
          productCode: med ? med.id : (item.medicineId || item.id),
          productName: item.name,
          qty: itemQty,
          costPrice: rowCost,
          salePrice: rowPrice,
          totalCost: rowCost * itemQty,
          totalSale: rowPrice * itemQty,
          profit: rowProfit
        });
      });
    });

    return rows;
  }, [sales, medicines, criteria]);

  // Aggregated totals for Report
  const reportTotals = useMemo(() => {
    let totalQty = 0;
    let totalCost = 0;
    let totalSale = 0;
    let totalProfit = 0;

    reportRows.forEach((row) => {
      totalQty += row.qty;
      totalCost += row.totalCost;
      totalSale += row.totalSale;
      totalProfit += row.profit;
    });

    const margin = totalSale > 0 ? ((totalProfit / totalSale) * 100).toFixed(1) : "0.0";
    return { totalQty, totalCost, totalSale, totalProfit, margin, rowCount: reportRows.length };
  }, [reportRows]);

  // --- DASHBOARD FINANCIALS WITH PERIOD FILTERING ---
  const [dashboardPeriod, setDashboardPeriod] = useState("daily"); // "daily", "weekly", "monthly", "custom", "all"
  const [dashboardDate, setDashboardDate] = useState(todayIso);
  const [dashboardStartDate, setDashboardStartDate] = useState(todayIso.slice(0, 8) + "01");
  const [dashboardEndDate, setDashboardEndDate] = useState(todayIso);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [dashboardPage, setDashboardPage] = useState(1);

  const periodLabel = useMemo(() => {
    if (dashboardPeriod === "daily") {
      const d = new Date(dashboardDate || todayIso);
      return `Daily (${d.toLocaleDateString()})`;
    }
    if (dashboardPeriod === "weekly") {
      return `Weekly (Past 7 Days)`;
    }
    if (dashboardPeriod === "monthly") {
      const d = new Date(dashboardDate || todayIso);
      return `Monthly (${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })})`;
    }
    if (dashboardPeriod === "custom") {
      return `Custom Range (${new Date(dashboardStartDate).toLocaleDateString()} to ${new Date(dashboardEndDate).toLocaleDateString()})`;
    }
    return "All Time";
  }, [dashboardPeriod, dashboardDate, dashboardStartDate, dashboardEndDate, todayIso]);

  const filteredDashboardSales = useMemo(() => {
    let list = [...sales];
    const targetDate = dashboardDate || todayIso;

    if (dashboardPeriod === "daily") {
      list = list.filter((s) => s.date?.startsWith(targetDate));
    } else if (dashboardPeriod === "weekly") {
      const d = new Date(targetDate);
      const past7 = new Date(d);
      past7.setDate(past7.getDate() - 7);
      const past7Str = past7.toISOString().split("T")[0];
      list = list.filter((s) => {
        const sDate = s.date?.split("T")[0] || "";
        return sDate >= past7Str && sDate <= targetDate;
      });
    } else if (dashboardPeriod === "monthly") {
      const ym = targetDate.slice(0, 7);
      list = list.filter((s) => s.date?.startsWith(ym));
    } else if (dashboardPeriod === "custom") {
      const sStart = dashboardStartDate || "1970-01-01";
      const sEnd = dashboardEndDate || todayIso;
      list = list.filter((s) => {
        const sDate = s.date?.split("T")[0] || "";
        return sDate >= sStart && sDate <= sEnd;
      });
    }

    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [sales, dashboardPeriod, dashboardDate, dashboardStartDate, dashboardEndDate, todayIso]);

  const searchedDashboardSales = useMemo(() => {
    if (!dashboardSearch.trim()) return filteredDashboardSales;
    const q = dashboardSearch.toLowerCase();
    return filteredDashboardSales.filter((s) => {
      const inv = (s.invoiceNo || "").toLowerCase();
      const cust = (s.customerName || "").toLowerCase();
      const mop = (s.paymentMethod || "").toLowerCase();
      return inv.includes(q) || cust.includes(q) || mop.includes(q);
    });
  }, [filteredDashboardSales, dashboardSearch]);

  const dashboardPageSize = 8;
  const dashboardTotalPages = Math.ceil(searchedDashboardSales.length / dashboardPageSize) || 1;
  const paginatedDashboardSales = useMemo(() => {
    const start = (dashboardPage - 1) * dashboardPageSize;
    return searchedDashboardSales.slice(start, start + dashboardPageSize);
  }, [searchedDashboardSales, dashboardPage, dashboardPageSize]);

  const getSaleProfit = (s) => {
    let cost = 0;
    (s.items || []).forEach((item) => {
      const med = medicines.find((m) => m.id === (item.medicineId || item.id));
      cost += (med ? parseFloat(med.costPrice) || 0 : 0) * (Number(item.qty || item.quantity) || 1);
    });
    const total = Number(s.total) || 0;
    const profit = Math.max(0, total - cost);
    return s.isReturn ? -profit : profit;
  };

  const dashboardStats = useMemo(() => {
    const standard = filteredDashboardSales.filter((s) => !s.isReturn);
    const returns = filteredDashboardSales.filter((s) => s.isReturn);

    const grossSales = standard.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const returnsTotal = returns.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const netRevenue = Math.max(0, grossSales - returnsTotal);

    let totalCost = 0;
    let totalUnitsSold = 0;
    filteredDashboardSales.forEach((s) => {
      (s.items || []).forEach((item) => {
        const med = medicines.find((m) => m.id === (item.medicineId || item.id));
        const itemCost = (med ? parseFloat(med.costPrice) || 0 : 0) * (Number(item.qty || item.quantity) || 1);
        const qty = Number(item.qty || item.quantity) || 1;
        if (s.isReturn) {
          totalCost -= itemCost;
          totalUnitsSold -= qty;
        } else {
          totalCost += itemCost;
          totalUnitsSold += qty;
        }
      });
    });

    const netCost = Math.max(0, totalCost);
    const grossProfit = Math.max(0, netRevenue - netCost);
    const profitMargin = netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(1) : "0.0";

    return {
      invoicesCount: filteredDashboardSales.length,
      salesCount: standard.length,
      returnsCount: returns.length,
      unitsSold: Math.max(0, totalUnitsSold),
      grossSales,
      returnsTotal,
      netRevenue,
      netCost,
      grossProfit,
      profitMargin
    };
  }, [filteredDashboardSales, medicines]);

  const accountsReceivable = useMemo(() => customers.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0), [customers]);
  const accountsPayable = useMemo(() => suppliers.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0), [suppliers]);

  const inventoryMetrics = useMemo(() => {
    let totalUnits = 0;
    let totalCostVal = 0;
    let totalSellingVal = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    medicines.forEach((med) => {
      const qty = (med.batches || []).reduce((acc, curr) => acc + (Number(curr.qty ?? curr.quantity) || 0), 0);
      totalUnits += qty;
      totalCostVal += qty * (parseFloat(med.costPrice) || 0);
      totalSellingVal += qty * (parseFloat(med.sellingPrice) || 0);

      if (qty === 0) outOfStockCount++;
      else if (qty <= (med.minStockLevel || 15)) lowStockCount++;
    });

    return { totalUnits, totalCostVal, totalSellingVal, lowStockCount, outOfStockCount };
  }, [medicines]);


  // PIN Authorization Dialog
  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner border border-emerald-100">
            <IoLockClosedOutline />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Manager Authentication</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Financial reports, gross profit data, and ledger records are password-protected. Enter Manager PIN (Default: 12345) to unlock.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (passwordInput === "12345") {
                sessionStorage.setItem("pharmacy_reports_unlocked", "true");
                setIsUnlocked(true);
                setPassError("");
              } else {
                setPassError("Invalid PIN code. Please enter the correct manager PIN.");
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <input
                type="password"
                placeholder="Enter PIN (12345)"
                autoFocus
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-bold bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-4 py-3 outline-none transition-all"
              />
            </div>
            {passError && <p className="text-xs text-rose-600 font-bold">{passError}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Unlock Reports
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
        {/* Segmented Tab Switcher */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-white text-slate-900 shadow-sm font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <IoAnalyticsOutline className="w-4 h-4 text-emerald-600" />
            <span>Analytics Dashboard</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("criteria");
              setViewMode("criteria");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "criteria"
                ? "bg-white text-slate-900 shadow-sm font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <IoFilterOutline className="w-4 h-4 text-teal-600" />
            <span>Sales Report Criteria Loader</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Lock Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("pharmacy_reports_unlocked");
              setIsUnlocked(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-2xs"
            title="Lock Financial Reports"
          >
            <IoLockOpenOutline className="w-3.5 h-3.5 text-amber-600" />
            <span>Lock Screen</span>
          </button>
        </div>
      </div>

      {activeTab === "dashboard" ? (
        /* =================== TAB 1: BOXED ANALYTICS DASHBOARD =================== */
        <div className="space-y-4">
          {/* Top Filter & Period Switcher Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 border border-slate-300 rounded-lg shadow-2xs">
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <IoAnalyticsOutline className="w-4 h-4 text-slate-700" />
                <span>Financial Overview</span>
                <span className="text-xs font-mono font-bold text-slate-500">[{periodLabel}]</span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Filtered sales performance, net profit, and ledger accounts</p>
            </div>

            {/* Daily / Weekly / Monthly / All Time Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex border border-slate-300 rounded-md p-0.5 bg-slate-100 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setDashboardPeriod("daily"); setDashboardPage(1); }}
                  className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${dashboardPeriod === "daily" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => { setDashboardPeriod("weekly"); setDashboardPage(1); }}
                  className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${dashboardPeriod === "weekly" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => { setDashboardPeriod("monthly"); setDashboardPage(1); }}
                  className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${dashboardPeriod === "monthly" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => { setDashboardPeriod("custom"); setDashboardPage(1); }}
                  className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${dashboardPeriod === "custom" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Custom Range
                </button>
                <button
                  type="button"
                  onClick={() => { setDashboardPeriod("all"); setDashboardPage(1); }}
                  className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${dashboardPeriod === "all" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  All Time
                </button>
              </div>

              {dashboardPeriod === "custom" ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 border border-slate-300 bg-white rounded-md text-xs font-semibold text-slate-800">
                  <span className="text-[11px] text-slate-500 font-bold">From:</span>
                  <input
                    type="date"
                    value={dashboardStartDate}
                    onChange={(e) => { setDashboardStartDate(e.target.value); setDashboardPage(1); }}
                    className="font-mono outline-none bg-transparent cursor-pointer font-bold"
                  />
                  <span className="text-[11px] text-slate-500 font-bold ml-1">To:</span>
                  <input
                    type="date"
                    value={dashboardEndDate}
                    onChange={(e) => { setDashboardEndDate(e.target.value); setDashboardPage(1); }}
                    className="font-mono outline-none bg-transparent cursor-pointer font-bold"
                  />
                </div>
              ) : dashboardPeriod !== "all" ? (
                <input
                  type="date"
                  value={dashboardDate}
                  onChange={(e) => { setDashboardDate(e.target.value); setDashboardPage(1); }}
                  className="px-2.5 py-1.5 border border-slate-300 bg-white rounded-md text-xs font-mono font-bold text-slate-900 outline-none cursor-pointer"
                />
              ) : null}
            </div>
          </div>

          {/* Clean Boxy Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* 1. Net Sales Revenue */}
            <div className="bg-white p-3.5 border border-slate-300 rounded-lg flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Net Sales Revenue</span>
              <h3 className="text-xl font-black font-mono text-slate-900 mt-1">{formatCurrency(dashboardStats.netRevenue)}</h3>
              <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-100 flex justify-between">
                <span>Gross: <strong className="font-mono text-slate-700">{formatCurrency(dashboardStats.grossSales)}</strong></span>
                {dashboardStats.returnsCount > 0 && <span className="text-rose-600 font-mono">Ret: -{formatCurrency(dashboardStats.returnsTotal)}</span>}
              </div>
            </div>

            {/* 2. Gross Profit & Margin */}
            <div className="bg-white p-3.5 border border-slate-300 rounded-lg flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Gross Profit</span>
              <h3 className="text-xl font-black font-mono text-slate-900 mt-1">{formatCurrency(dashboardStats.grossProfit)}</h3>
              <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-100 flex justify-between">
                <span>Margin: <strong className="text-slate-800">{dashboardStats.profitMargin}%</strong></span>
                <span>COGS: <strong className="font-mono text-slate-700">{formatCurrency(dashboardStats.netCost)}</strong></span>
              </div>
            </div>

            {/* 3. Invoices & Units Sold */}
            <div className="bg-white p-3.5 border border-slate-300 rounded-lg flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sales Invoices</span>
              <h3 className="text-xl font-black font-mono text-slate-900 mt-1">{dashboardStats.invoicesCount} Invoices</h3>
              <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-100 flex justify-between">
                <span>Units Sold: <strong className="text-slate-800">{dashboardStats.unitsSold}</strong></span>
                <span>Returns: <strong className="text-slate-700">{dashboardStats.returnsCount}</strong></span>
              </div>
            </div>

            {/* 4. Inventory Valuation */}
            <div className="bg-white p-3.5 border border-slate-300 rounded-lg flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Stock Valuation (Cost)</span>
              <h3 className="text-xl font-black font-mono text-slate-900 mt-1">{formatCurrency(inventoryMetrics.totalCostVal)}</h3>
              <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-100 flex justify-between">
                <span>Retail: <strong className="font-mono text-slate-700">{formatCurrency(inventoryMetrics.totalSellingVal)}</strong></span>
                <span>{inventoryMetrics.totalUnits} Units</span>
              </div>
            </div>

            {/* 5. Customer Receivables */}
            <div className="bg-white p-3.5 border border-slate-300 rounded-lg flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Customer Receivables</span>
              <h3 className="text-xl font-black font-mono text-slate-900 mt-1">{formatCurrency(accountsReceivable)}</h3>
              <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-100">
                <span>Due from {customers.filter((c) => (c.balance || 0) > 0).length} customer accounts</span>
              </div>
            </div>

            {/* 6. Supplier Payables */}
            <div className="bg-white p-3.5 border border-slate-300 rounded-lg flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Supplier Payables</span>
              <h3 className="text-xl font-black font-mono text-slate-900 mt-1">{formatCurrency(accountsPayable)}</h3>
              <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-100">
                <span>Due to {suppliers.filter((s) => (s.balance || 0) > 0).length} suppliers</span>
              </div>
            </div>
          </div>

          {/* Sales Invoices Records Ledger Table */}
          <div className="bg-white border border-slate-300 rounded-lg overflow-hidden shadow-2xs print:border-0 print:shadow-none print:rounded-none">
            <div className="p-3 border-b border-slate-300 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Sales Ledger Records ({periodLabel})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Total {searchedDashboardSales.length} invoice transactions
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Search invoice #, customer..."
                  value={dashboardSearch}
                  onChange={(e) => { setDashboardSearch(e.target.value); setDashboardPage(1); }}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3 text-right">Net Amount</th>
                    <th className="py-2.5 px-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedDashboardSales.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400 font-semibold">
                        No sales transactions recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    paginatedDashboardSales.map((s) => {
                      const rowProfit = getSaleProfit(s);
                      const itemsCount = (s.items || []).reduce((acc, curr) => acc + (Number(curr.qty || curr.quantity) || 1), 0);
                      const isRet = s.isReturn;
                      return (
                        <tr key={s.id || s.invoiceNo} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {s.invoiceNo}
                            {isRet && <span className="ml-1 text-[10px] font-bold text-rose-600">(Return)</span>}
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                            {s.date ? new Date(s.date).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-"}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {s.customerName || "Walk-In Customer"}
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            {itemsCount}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {s.paymentMethod || "Cash"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                            {formatCurrency(s.total || 0)}
                          </td>
                          <td className={`py-2 px-3 text-right font-mono font-bold ${rowProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                            {formatCurrency(rowProfit)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {dashboardTotalPages > 1 && (
              <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Page {dashboardPage} of {dashboardTotalPages}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={dashboardPage <= 1}
                    onClick={() => setDashboardPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 border border-slate-300 rounded bg-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={dashboardPage >= dashboardTotalPages}
                    onClick={() => setDashboardPage((p) => Math.min(dashboardTotalPages, p + 1))}
                    className="px-2.5 py-1 border border-slate-300 rounded bg-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === "criteria" ? (
        /* =================== TAB 2: SALES REPORT CRITERIA LOADER =================== */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">
          {/* Header & Quick Date Presets */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-150 pb-3 gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <IoFilterOutline className="w-4.5 h-4.5 text-emerald-600" />
                <span>Sales Report Filter Criteria</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Configure date ranges and attributes to load itemized reports</p>
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => applyDatePreset("today")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset("yesterday")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset("7days")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset("month")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset("30days")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset("all")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all"
              >
                All Time
              </button>
            </div>
          </div>

          {/* Filter Form Grid: Medicine, Supplier, From Date, To Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Medicine Product Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Select Medicine</label>
              <select
                value={criteria.selectedMedicineId}
                onChange={(e) => handleMedicineChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-emerald-600 rounded-xl text-xs font-semibold outline-none transition-all cursor-pointer text-slate-800"
              >
                <option value="">All Medicines (Entire Catalog)</option>
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.brand ? `(${m.brand})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Supplier Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Supplier</label>
              <select
                value={criteria.selectedSupplier}
                onChange={(e) => setCriteria({ ...criteria, selectedSupplier: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-emerald-600 rounded-xl text-xs font-semibold outline-none transition-all cursor-pointer text-slate-800"
              >
                <option value="">All Suppliers</option>
                {uniqueSuppliersList.map((sup) => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
            </div>

            {/* 3. From Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">From Date</label>
              <input
                type="date"
                value={criteria.dateFrom}
                onChange={(e) => setCriteria({ ...criteria, dateFrom: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-emerald-600 rounded-xl text-xs font-semibold outline-none transition-all cursor-pointer text-slate-800"
              />
            </div>

            {/* 4. To Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">To Date</label>
              <input
                type="date"
                value={criteria.dateTo}
                onChange={(e) => setCriteria({ ...criteria, dateTo: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-emerald-600 rounded-xl text-xs font-semibold outline-none transition-all cursor-pointer text-slate-800"
              />
            </div>
          </div>

          {/* Action Footer Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-150 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500">
                {activeFilterCount > 0 ? (
                  <span>Active Filters: <strong className="text-slate-800 font-bold">{activeFilterCount} applied</strong></span>
                ) : (
                  <span>Filters: <strong className="text-slate-700 font-medium">All items matching date range</strong></span>
                )}
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold cursor-pointer"
                >
                  Reset All
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setViewMode("report")}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Load Sales Report</span>
              <span className="px-1.5 py-0.2 bg-emerald-900/30 rounded text-[10px] font-mono">
                {reportRows.length} rows
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* =================== TAB 3: DETAIL SALE REPORT =================== */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5 animate-fade-in print-area">
          {/* Universal Official Boxy Print Header */}
          <PrintHeader
            title="ITEMIZED SALES & PROFIT ANALYSIS LEDGER"
            subtitle={`Audit Period: ${criteria.dateFrom} to ${criteria.dateTo}`}
            branch={currentBranch}
            user={currentUser}
            metadata={{
              "Period": `${criteria.dateFrom} to ${criteria.dateTo}`,
              "Total Items Sold": `${reportTotals.totalQty} Units`,
              "Net Profit": formatCurrency(reportTotals.totalProfit),
              "Margin": `${reportTotals.margin}%`
            }}
          />

          {/* Header & Control Actions (Web only) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-150 pb-4 gap-4 no-print">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Itemized Sales & Profit Analysis Report
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Period: <strong className="text-slate-800 font-mono">{criteria.dateFrom}</strong> to{" "}
                <strong className="text-slate-800 font-mono">{criteria.dateTo}</strong>
                {criteria.productName && ` • Filtered by product: "${criteria.productName}"`}
              </p>
            </div>

            {/* Action buttons (Print / Export / Back) */}
            <div className="flex flex-wrap items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => setViewMode("criteria")}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-all active:scale-95"
              >
                <IoArrowBackOutline className="w-4 h-4 text-slate-500" />
                <span>Back to Criteria</span>
              </button>
              <PrintExportActions
                onDirectPrint={() => window.print()}
                onPdf={() => {
                  const headers = [
                    "Invoice No",
                    "Sale Date",
                    "Customer",
                    "Payment Form",
                    "Salesman",
                    "Product Name",
                    "Qty",
                    "Cost Price",
                    "Sale Price",
                    "Net Total",
                    "Profit"
                  ];
                  const rows = reportRows.map((row) => [
                    row.invoiceNo,
                    row.date,
                    row.customer,
                    row.paymentForm,
                    row.cashier,
                    row.productName,
                    row.qty,
                    formatCurrency(row.costPrice),
                    formatCurrency(row.salePrice),
                    formatCurrency(row.totalSale),
                    formatCurrency(row.profit)
                  ]);
                  exportTableToPDF(
                    "Detailed Sales & Profit Analysis Report",
                    headers,
                    rows,
                    `Detailed_Sales_Report_${criteria.dateFrom}_to_${criteria.dateTo}.pdf`,
                    {
                      "Period From": criteria.dateFrom,
                      "Period To": criteria.dateTo,
                      "Total Items": `${reportTotals.totalQty} Units`,
                      "Total Sales Revenue": formatCurrency(reportTotals.totalSale),
                      "Total Cost (COGS)": formatCurrency(reportTotals.totalCost),
                      "Net Profit": formatCurrency(reportTotals.totalProfit)
                    },
                    currentBranch
                  );
                }}
                onExcel={() => {
                  const headers = [
                    "Invoice No",
                    "Sale Date",
                    "Month",
                    "Year",
                    "Time",
                    "Customer",
                    "Payment Form",
                    "Salesman",
                    "Product Code",
                    "Product Name",
                    "Qty",
                    "Cost Price",
                    "Sale Price",
                    "Net Total",
                    "Profit"
                  ];
                  const rows = reportRows.map((row) => [
                    row.invoiceNo,
                    row.date,
                    row.month,
                    row.year,
                    row.time,
                    row.customer,
                    row.paymentForm,
                    row.cashier,
                    row.productCode,
                    row.productName,
                    row.qty,
                    row.costPrice.toFixed(2),
                    row.salePrice.toFixed(2),
                    row.totalSale.toFixed(2),
                    row.profit.toFixed(2)
                  ]);
                  exportToExcel(
                    "All - Detailed Sales & Profit Analysis Report",
                    headers,
                    rows,
                    `Detailed_Sales_Report_${criteria.dateFrom}_to_${criteria.dateTo}.xls`,
                    {
                      "Period From": criteria.dateFrom,
                      "Period To": criteria.dateTo,
                      "Total Items": `${reportTotals.totalQty} Units`,
                      "Total Sales Revenue": formatCurrency(reportTotals.totalSale),
                      "Net Profit": formatCurrency(reportTotals.totalProfit)
                    }
                  );
                }}
                printLabel="Direct Print"
                pdfLabel="PDF"
                excelLabel="Excel Export"
                size="sm"
              />
            </div>
          </div>

          {/* KPI Mini Strip for Quick Audits */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Items</span>
              <span className="text-base font-black font-mono text-slate-900">{reportTotals.totalQty} Units</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Sales Revenue</span>
              <span className="text-base font-black font-mono text-slate-900">{formatCurrency(reportTotals.totalSale)}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Cost (COGS)</span>
              <span className="text-base font-black font-mono text-slate-600">{formatCurrency(reportTotals.totalCost)}</span>
            </div>
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Net Profit</span>
              <span className="text-base font-black font-mono text-emerald-800">{formatCurrency(reportTotals.totalProfit)}</span>
            </div>
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
              <span className="text-[10px] font-bold text-indigo-700 uppercase block">Profit Margin</span>
              <span className="text-base font-black font-mono text-indigo-800">{reportTotals.margin}%</span>
            </div>
          </div>

          {/* Details Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl print:border-0 print:shadow-none print:rounded-none">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider bg-slate-50/80 sticky top-0">
                  <th className="py-3 px-3">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  {criteria.viewCost && <th className="py-3 px-3 text-right">Cost Price</th>}
                  {criteria.viewRetail && <th className="py-3 px-3 text-right">Sale Price</th>}
                  <th className="py-3 px-3 text-right">Line Total</th>
                  {criteria.viewProfit && <th className="py-3 px-3 text-right text-emerald-700 bg-emerald-50/30">Profit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {reportRows.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-12 text-center text-slate-400 font-semibold">
                      No sales matching the specified criteria loader configuration.
                    </td>
                  </tr>
                ) : (
                  reportRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{row.invoiceNo}</td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{row.date} {row.time}</td>
                      <td className="py-2.5 px-3 truncate max-w-[130px] font-semibold text-slate-800">{row.customer}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.paymentForm === "Credit" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {row.paymentForm}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{row.productName}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">{row.qty}</td>
                      {criteria.viewCost && <td className="py-2.5 px-3 text-right font-mono text-slate-500">{formatCurrency(row.costPrice)}</td>}
                      {criteria.viewRetail && <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(row.salePrice)}</td>}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">{formatCurrency(row.totalSale)}</td>
                      {criteria.viewProfit && (
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                          {formatCurrency(row.profit)}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              
              {/* Aggregated Totals Row */}
              {reportRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-extrabold text-slate-900 text-xs">
                    <td colSpan="5" className="py-3 px-3 text-right uppercase tracking-wider">Total Aggregates:</td>
                    <td className="py-3 px-3 text-center font-black">{reportTotals.totalQty}</td>
                    {criteria.viewCost && <td className="py-3 px-3 text-right font-mono">{formatCurrency(reportTotals.totalCost)}</td>}
                    {criteria.viewRetail && <td></td>}
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-950">{formatCurrency(reportTotals.totalSale)}</td>
                    {criteria.viewProfit && (
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-100/50">
                        {formatCurrency(reportTotals.totalProfit)}
                      </td>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <PrintFooter note="Official Sales & Profit Audit Ledger Record • PharmaCare ERP" />
        </div>
      )}
    </div>
  );
};
