import React, { useContext, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { formatCurrency, formatDate } from "../utils/helpers";
import { Modal } from "../components/common/Modal";
import { PrintExportActions } from "../components/common/PrintExportActions";
import {
  IoWalletOutline,
  IoTrendingUpOutline,
  IoCartOutline,
  IoMedicalOutline,
  IoReceiptOutline,
  IoPeopleOutline,
  IoCalendarOutline,
  IoSearchOutline,
  IoEyeOutline,
  IoPrintOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline
} from "react-icons/io5";

export const Dashboard = () => {
  const { sales, medicines, currentBranch, currentUser, exportToExcel, exportTableToPDF } = useContext(AppContext);
  const navigate = useNavigate();

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const monthStartStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }, []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [startDate, setStartDate] = useState(monthStartStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [period, setPeriod] = useState("daily"); // "daily" | "weekly" | "monthly" | "custom"
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Selected invoice for detail view modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // --- FILTER SALES BY PERIOD (DAILY / WEEKLY / MONTHLY / CUSTOM RANGE) ---
  const filteredSales = useMemo(() => {
    let list = [...sales];
    const baseDate = new Date(selectedDate);

    if (period === "daily") {
      list = list.filter((s) => s.date && s.date.startsWith(selectedDate));
    } else if (period === "weekly") {
      const past7Days = new Date(baseDate);
      past7Days.setDate(baseDate.getDate() - 6);
      past7Days.setHours(0, 0, 0, 0);

      const nextDay = new Date(baseDate);
      nextDay.setDate(baseDate.getDate() + 1);
      nextDay.setHours(23, 59, 59, 999);

      list = list.filter((s) => {
        if (!s.date) return false;
        const sDate = new Date(s.date);
        return sDate >= past7Days && sDate <= nextDay;
      });
    } else if (period === "monthly") {
      const monthPrefix = selectedDate.substring(0, 7); // "YYYY-MM"
      list = list.filter((s) => s.date && s.date.startsWith(monthPrefix));
    } else if (period === "custom") {
      const sStart = startDate || "1970-01-01";
      const sEnd = endDate || todayStr;
      list = list.filter((s) => {
        if (!s.date) return false;
        const sDateStr = s.date.split("T")[0];
        return sDateStr >= sStart && sDateStr <= sEnd;
      });
    }

    // Text search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const inv = (s.invoiceNo || "").toLowerCase();
        const cust = (s.customerName || "").toLowerCase();
        const mop = (s.paymentMethod || "").toLowerCase();
        const hasItem = (s.items || []).some(
          (it) => (it.name || "").toLowerCase().includes(q)
        );
        return inv.includes(q) || cust.includes(q) || mop.includes(q) || hasItem;
      });
    }

    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [sales, period, selectedDate, startDate, endDate, todayStr, searchQuery]);

  // --- CALCULATE SUMMARY METRICS FOR SELECTED PERIOD ---
  const periodStats = useMemo(() => {
    const standard = filteredSales.filter((s) => !s.isReturn);
    const returns = filteredSales.filter((s) => s.isReturn);

    const grossSales = standard.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const returnsTotal = returns.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const netRevenue = Math.max(0, grossSales - returnsTotal);

    let profit = 0;
    filteredSales.forEach((sale) => {
      (sale.items || []).forEach((it) => {
        const med = medicines.find((m) => m.id === (it.medicineId || it.id));
        const cost = med ? (parseFloat(med.costPrice) || 0) : 0;
        const price = parseFloat(it.price || it.sellingPrice) || 0;
        const qty = Number(it.qty || it.quantity || 1);
        const itemProfit = (price - cost) * qty;

        if (sale.isReturn) {
          profit -= itemProfit;
        } else {
          profit += itemProfit;
        }
      });
    });

    profit = Math.max(0, profit);
    const margin = netRevenue > 0 ? ((profit / netRevenue) * 100).toFixed(1) : "0.0";

    return {
      totalCount: filteredSales.length,
      salesCount: standard.length,
      returnsCount: returns.length,
      grossSales,
      returnsTotal,
      netRevenue,
      profit,
      margin
    };
  }, [filteredSales, medicines]);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / pageSize) || 1;
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  const periodLabel = useMemo(() => {
    if (period === "daily") return `Daily (${formatDate(selectedDate)})`;
    if (period === "weekly") return `Weekly (Past 7 Days)`;
    if (period === "monthly") {
      const d = new Date(selectedDate);
      return `Monthly (${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })})`;
    }
    if (period === "custom") {
      return `Custom Range (${formatDate(startDate)} to ${formatDate(endDate)})`;
    }
    return "";
  }, [period, selectedDate, startDate, endDate]);

  const handleQuickInvoicePdf = () => {
    if (!selectedInvoice) return;
    const invId = selectedInvoice.invoiceNo || selectedInvoice.id || "Invoice";
    const headers = ["#", "Item Description", "Qty", "Unit Price", "Total"];
    const rows = (selectedInvoice.items || []).map((it, idx) => [
      idx + 1,
      it.name || it.medicineName || "Item",
      it.quantity || 1,
      formatCurrency(it.price || it.unitPrice || 0),
      formatCurrency(it.total || ((it.price || it.unitPrice || 0) * (it.quantity || 1)))
    ]);
    exportTableToPDF(
      `Sales Receipt #${invId}`,
      headers,
      rows,
      `Receipt_${invId}.pdf`,
      {
        Customer: selectedInvoice.customerName || "Walk-in Customer",
        Date: formatDate(selectedInvoice.date),
        Cashier: selectedInvoice.cashier || currentUser.name,
        Payment: selectedInvoice.paymentMethod || "Cash",
        "Invoice Total": formatCurrency(selectedInvoice.total || 0)
      },
      currentBranch
    );
  };

  const handleQuickInvoiceExcel = () => {
    if (!selectedInvoice) return;
    const invId = selectedInvoice.invoiceNo || selectedInvoice.id || "Invoice";
    const headers = ["#", "Item Description", "Qty", "Unit Price", "Total"];
    const rows = (selectedInvoice.items || []).map((it, idx) => [
      idx + 1,
      it.name || it.medicineName || "Item",
      it.quantity || 1,
      (it.price || it.unitPrice || 0).toFixed(2),
      (it.total || ((it.price || it.unitPrice || 0) * (it.quantity || 1))).toFixed(2)
    ]);
    exportToExcel(
      `Sales Receipt #${invId}`,
      headers,
      rows,
      `Receipt_${invId}.xls`,
      {
        Customer: selectedInvoice.customerName || "Walk-in Customer",
        Date: formatDate(selectedInvoice.date),
        Cashier: selectedInvoice.cashier || currentUser.name,
        "Grand Total": formatCurrency(selectedInvoice.total || 0)
      }
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. Top Controls Bar: Welcome + Period Switcher (Daily / Weekly / Monthly / Custom Range) + Quick POS */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white p-4 border border-slate-300 rounded-lg shadow-2xs">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">
            Dashboard & Sales Records
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Active Warehouse: <span className="font-bold text-slate-800">{currentBranch?.name}</span> &bull; Operator: <span className="font-bold text-slate-800">{currentUser?.name || "Admin"}</span>
          </p>
        </div>

        {/* Period Switcher & Date Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Daily / Weekly / Monthly / Custom Range Segmented Buttons */}
          <div className="inline-flex border border-slate-300 rounded-md p-0.5 bg-slate-100 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setPeriod("daily");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                period === "daily"
                  ? "bg-slate-900 text-white font-extrabold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriod("weekly");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                period === "weekly"
                  ? "bg-slate-900 text-white font-extrabold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriod("monthly");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                period === "monthly"
                  ? "bg-slate-900 text-white font-extrabold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriod("custom");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                period === "custom"
                  ? "bg-slate-900 text-white font-extrabold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Reference Date Picker or Custom Range From/To Pickers */}
          {period === "custom" ? (
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs">
              <IoCalendarOutline className="w-4 h-4 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
              />
              <span className="text-[11px] font-bold text-slate-500 ml-1">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs">
              <IoCalendarOutline className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value || todayStr);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
              />
            </div>
          )}

          {/* Quick POS Action */}
          <button
            onClick={() => navigate("/pos")}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <IoCartOutline className="w-4 h-4" />
            <span>POS Billing</span>
          </button>
        </div>
      </div>

      {/* 2. Boxy Metric Summary Cards (Dynamically calculate for selected period) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Net Sales Revenue */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              {period.toUpperCase()} NET REVENUE
            </span>
            <IoWalletOutline className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <div className="text-xl font-black font-mono text-slate-900">
              {formatCurrency(periodStats.netRevenue)}
            </div>
            <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
              <span>Gross: {formatCurrency(periodStats.grossSales)}</span>
              <span className="text-rose-600">Ret: -{formatCurrency(periodStats.returnsTotal)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Net Profit */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              {period.toUpperCase()} NET PROFIT
            </span>
            <IoTrendingUpOutline className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <div className="text-xl font-black font-mono text-slate-900">
              {formatCurrency(periodStats.profit)}
            </div>
            <div className="mt-1 pt-1.5 border-t border-slate-100 text-[10px] font-bold text-slate-600">
              Profit Margin: {periodStats.margin}%
            </div>
          </div>
        </div>

        {/* Card 3: Total Orders / Invoices */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              {period.toUpperCase()} INVOICES
            </span>
            <IoReceiptOutline className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <div className="text-xl font-black font-mono text-slate-900">
              {periodStats.salesCount} Invoices
            </div>
            <div className="mt-1 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
              Total Transactions: {periodStats.totalCount}
            </div>
          </div>
        </div>

        {/* Card 4: Returns & Refunds */}
        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              {period.toUpperCase()} RETURNS
            </span>
            <IoReceiptOutline className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <div className={`text-xl font-black font-mono ${periodStats.returnsTotal > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {formatCurrency(periodStats.returnsTotal)}
            </div>
            <div className="mt-1 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
              {periodStats.returnsCount} Return Vouchers
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Navigation Links (Boxy & Clean) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Link
          to="/pos"
          className="p-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors flex items-center gap-2.5"
        >
          <IoCartOutline className="w-5 h-5 text-slate-700" />
          <div>
            <div className="text-xs font-bold text-slate-900">POS Terminal</div>
            <div className="text-[10px] text-slate-500">Create New Invoice</div>
          </div>
        </Link>
        <Link
          to="/medicines"
          className="p-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors flex items-center gap-2.5"
        >
          <IoMedicalOutline className="w-5 h-5 text-slate-700" />
          <div>
            <div className="text-xs font-bold text-slate-900">Medicines Catalog</div>
            <div className="text-[10px] text-slate-500">Manage Stock & Prices</div>
          </div>
        </Link>
        <Link
          to="/customers"
          className="p-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors flex items-center gap-2.5"
        >
          <IoPeopleOutline className="w-5 h-5 text-slate-700" />
          <div>
            <div className="text-xs font-bold text-slate-900">Customer Ledgers</div>
            <div className="text-[10px] text-slate-500">Credit Accounts & Due</div>
          </div>
        </Link>
        <Link
          to="/reports"
          className="p-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors flex items-center gap-2.5"
        >
          <IoTrendingUpOutline className="w-5 h-5 text-slate-700" />
          <div>
            <div className="text-xs font-bold text-slate-900">Financial Reports</div>
            <div className="text-[10px] text-slate-500">Profit & Loss Statements</div>
          </div>
        </Link>
      </div>

      {/* 4. MAIN RECORDS TABLE (Replaces chart: Displays proper sales records for selected period) */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden space-y-0">
        {/* Table Header Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Sales & Invoice Records
              </h2>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-bold rounded">
                {periodLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Showing {filteredSales.length} records &bull; Total Amount: <span className="font-bold text-slate-900 font-mono">{formatCurrency(periodStats.netRevenue)}</span>
            </p>
          </div>

          {/* Search Input Filter */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search invoice #, customer, item..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-300 focus:border-slate-800 rounded px-3 py-1.5 pl-8 text-xs font-medium text-slate-900 outline-none"
            />
            <IoSearchOutline className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* The Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-300">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Items Summary</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3 text-center">Type</th>
                <th className="py-2.5 px-3 text-right">Net Amount</th>
                <th className="py-2.5 px-3 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-medium">
                    No sales records found for {periodLabel}. Start billing at POS!
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const isReturn = !!sale.isReturn;
                  const itemsCount = (sale.items || []).length;
                  const firstItemName = sale.items && sale.items[0]?.name;
                  const itemsPreview = itemsCount > 1
                    ? `${firstItemName} + ${itemsCount - 1} more`
                    : firstItemName || "No items";

                  return (
                    <tr key={sale.invoiceNo || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {globalIdx}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {sale.invoiceNo}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {sale.date ? formatDate(sale.date) : "N/A"}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {sale.customerName || "Walk-in Customer"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={itemsPreview}>
                        <span className="font-bold text-slate-800 font-mono">[{itemsCount}]</span> {itemsPreview}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 border border-slate-300 rounded text-[10px] font-semibold bg-white text-slate-800">
                          {sale.paymentMethod || "Cash"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          isReturn
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : "bg-slate-100 text-slate-800 border border-slate-300"
                        }`}>
                          {isReturn ? "Return" : "Sale"}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-black ${isReturn ? "text-rose-600" : "text-slate-900"}`}>
                        {isReturn ? `-${formatCurrency(sale.total)}` : formatCurrency(sale.total)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(sale)}
                          className="px-2.5 py-1 text-slate-700 hover:text-black border border-slate-300 hover:border-black rounded text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Page {currentPage} of {totalPages} ({filteredSales.length} total records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-slate-300 rounded bg-white font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2.5 py-1 border rounded text-xs font-bold cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-slate-300 rounded bg-white font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- INVOICE DETAILS MODAL --- */}
      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={`Invoice Details: ${selectedInvoice?.invoiceNo || ""}`}
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs font-sans">
            {/* Invoice Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 border border-slate-300 rounded">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Invoice #</span>
                <span className="font-mono font-black text-slate-900">{selectedInvoice.invoiceNo}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Date & Time</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedInvoice.date)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Customer</span>
                <span className="font-bold text-slate-900">{selectedInvoice.customerName || "Walk-in Customer"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Payment Method</span>
                <span className="font-bold text-slate-900">{selectedInvoice.paymentMethod || "Cash"}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-300">
                    <th className="py-2 px-3 w-8 text-center">#</th>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {(selectedInvoice.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{it.name}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold">{it.qty || it.quantity || 1}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatCurrency(it.price || it.sellingPrice || 0)}</td>
                      <td className="py-2 px-3 text-right font-mono font-black">{formatCurrency((it.qty || it.quantity || 1) * (it.price || it.sellingPrice || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end pt-1">
              <div className="w-64 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedInvoice.subTotal || selectedInvoice.total)}</span>
                </div>
                {Number(selectedInvoice.discount) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedInvoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-300 pt-1.5">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-200 no-print">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-1.5 border border-slate-300 rounded font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-xs"
              >
                Close
              </button>
              <PrintExportActions
                onDirectPrint={() => window.print()}
                onPdf={handleQuickInvoicePdf}
                onExcel={handleQuickInvoiceExcel}
                printLabel="Direct Print"
                pdfLabel="PDF"
                excelLabel="Excel Export"
                size="sm"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;
