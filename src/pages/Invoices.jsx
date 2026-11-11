import React, { useContext, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { formatCurrency, formatDate } from "../utils/helpers";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import { PrintExportActions } from "../components/common/PrintExportActions";
import {
  IoSearchOutline,
  IoPrintOutline,
  IoEyeOutline,
  IoCalendarOutline,
  IoDownloadOutline,
  IoTrashOutline,
  IoWarningOutline,
  IoCheckmarkDoneOutline,
  IoCloseCircleOutline
} from "react-icons/io5";

export const Invoices = () => {
  const { sales, currentUser, currentBranch, taxRate, invoiceFormat, exportToExcel, exportTableToPDF, deleteInvoice, deleteMultipleInvoices } = useContext(AppContext);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [dateFilter, setDateFilter] = useState("");
  const [previewInvoiceFormat, setPreviewInvoiceFormat] = useState(() => invoiceFormat || "thermal");

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [singleDeleteTarget, setSingleDeleteTarget] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [restockOnDelete, setRestockOnDelete] = useState(true);

  const isAdmin = currentUser?.role === "Admin";

  // Update preview format whenever a new invoice is opened
  const handleOpenInvoice = (sale) => {
    setSelectedInvoice(sale);
    setPreviewInvoiceFormat(invoiceFormat || "thermal");
  };

  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "sales" | "returns"

  // Filter Sales Invoices
  const filteredInvoices = useMemo(() => {
    return sales.filter((sale) => {
      if (typeFilter === "sales" && sale.isReturn) return false;
      if (typeFilter === "returns" && !sale.isReturn) return false;

      const query = searchQuery.toLowerCase().trim();
      const invoiceIdentifier = sale.invoiceNo || sale.invoiceNumber || sale.id || "";
      const matchesSearch =
        invoiceIdentifier.toLowerCase().includes(query) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(query)) ||
        (sale.customerContact && sale.customerContact.toLowerCase().includes(query)) ||
        (sale.cashier && sale.cashier.toLowerCase().includes(query));

      const saleDate = sale.date || sale.createdAt || "";
      const matchesDate = dateFilter ? saleDate.startsWith(dateFilter) : true;

      return matchesSearch && matchesDate;
    });
  }, [sales, searchQuery, dateFilter, typeFilter]);

  const salesCount = useMemo(() => sales.filter((s) => !s.isReturn).length, [sales]);
  const returnsCount = useMemo(() => sales.filter((s) => s.isReturn).length, [sales]);

  // Multi-select helpers
  const isAllSelected = filteredInvoices.length > 0 && filteredInvoices.every((s) => selectedIds.has(s.invoiceNo || s.invoiceNumber || s.id));
  const isSomeSelected = filteredInvoices.some((s) => selectedIds.has(s.invoiceNo || s.invoiceNumber || s.id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(filteredInvoices.map((s) => s.invoiceNo || s.invoiceNumber || s.id));
      setSelectedIds(allIds);
    }
  };

  const handleToggleSelectOne = (invId) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(invId)) {
        updated.delete(invId);
      } else {
        updated.add(invId);
      }
      return updated;
    });
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportListExcel = () => {
    const headers = ["Invoice No", "Type", "Date", "Customer Name", "Contact", "Cashier", "Payment Method", "Total (Rs)"];
    const rows = filteredInvoices.map((inv) => [
      inv.invoiceNo || inv.invoiceNumber || inv.id || "N/A",
      inv.isReturn ? "RETURN" : "SALE",
      formatDate(inv.date),
      inv.customerName || "Walking Customer",
      inv.customerContact || "N/A",
      inv.cashier || "-",
      inv.paymentMethod || "Cash",
      (inv.isReturn ? -inv.total : inv.total).toFixed(2)
    ]);
    exportToExcel(
      "Sales Invoices & Returns Registry",
      headers,
      rows,
      `Sales_Invoices_${new Date().toISOString().split("T")[0]}.xls`,
      {
        "Total Invoices": filteredInvoices.length,
        "Total Revenue": formatCurrency(filteredInvoices.reduce((acc, i) => acc + (i.isReturn ? -i.total : i.total), 0))
      }
    );
  };

  const handleExportListPDF = () => {
    const headers = ["Invoice No", "Type", "Date", "Customer Name", "Contact", "Cashier", "Payment Method", "Total"];
    const rows = filteredInvoices.map((inv) => [
      inv.invoiceNo || inv.invoiceNumber || inv.id || "N/A",
      inv.isReturn ? "RETURN" : "SALE",
      formatDate(inv.date),
      inv.customerName || "Walking Customer",
      inv.customerContact || "N/A",
      inv.cashier || "-",
      inv.paymentMethod || "Cash",
      formatCurrency(inv.isReturn ? -inv.total : inv.total)
    ]);
    exportTableToPDF(
      "Sales Invoices & Returns Registry",
      headers,
      rows,
      `Sales_Invoices_${new Date().toISOString().split("T")[0]}.pdf`,
      {
        "Total Records": filteredInvoices.length,
        "Total Sales Amount": formatCurrency(filteredInvoices.reduce((acc, i) => acc + (i.isReturn ? -i.total : i.total), 0))
      },
      currentBranch
    );
  };

  const handleInvoicePdf = () => {
    if (!selectedInvoice) return;
    const invId = selectedInvoice.invoiceNo || selectedInvoice.invoiceNumber || selectedInvoice.id || "Invoice";
    const headers = ["#", "Item Description", "Batch #", "Quantity", "Unit Price", "Discount", "Total"];
    const rows = (selectedInvoice.items || []).map((it, idx) => [
      idx + 1,
      it.medicineName || it.name || "Item",
      it.batchNumber || "-",
      it.quantity || 1,
      formatCurrency(it.unitPrice || it.price || 0),
      `${it.discount || 0}%`,
      formatCurrency(it.total || 0)
    ]);
    exportTableToPDF(
      `Tax Invoice #${invId}`,
      headers,
      rows,
      `Invoice_${invId}.pdf`,
      {
        "Customer": selectedInvoice.customerName || "Walking Customer",
        "Date": formatDate(selectedInvoice.date),
        "Cashier": selectedInvoice.cashier || "Cashier",
        "Payment Method": selectedInvoice.paymentMethod || "Cash",
        "Invoice Total": formatCurrency(selectedInvoice.total || 0)
      },
      currentBranch
    );
  };

  const handleInvoiceExcel = () => {
    if (!selectedInvoice) return;
    const invId = selectedInvoice.invoiceNo || selectedInvoice.invoiceNumber || selectedInvoice.id || "Invoice";
    const headers = ["#", "Item Description", "Batch #", "Quantity", "Unit Price", "Discount", "Total"];
    const rows = (selectedInvoice.items || []).map((it, idx) => [
      idx + 1,
      it.medicineName || it.name || "Item",
      it.batchNumber || "-",
      it.quantity || 1,
      (it.unitPrice || it.price || 0).toFixed(2),
      `${it.discount || 0}%`,
      (it.total || 0).toFixed(2)
    ]);
    exportToExcel(
      `Tax Invoice #${invId}`,
      headers,
      rows,
      `Invoice_${invId}.xls`,
      {
        "Customer": selectedInvoice.customerName || "Walking Customer",
        "Date": formatDate(selectedInvoice.date),
        "Cashier": selectedInvoice.cashier || "Cashier",
        "Payment Method": selectedInvoice.paymentMethod || "Cash",
        "Grand Total": formatCurrency(selectedInvoice.total || 0)
      }
    );
  };

  const handleExportSelected = () => {
    const selectedList = filteredInvoices.filter((s) => selectedIds.has(s.invoiceNo || s.invoiceNumber || s.id));
    const headers = ["Invoice No", "Type", "Date", "Customer Name", "Contact", "Cashier", "Payment Method", "Total (Rs)"];
    const rows = selectedList.map((inv) => [
      inv.invoiceNo || inv.invoiceNumber || inv.id || "N/A",
      inv.isReturn ? "RETURN" : "SALE",
      formatDate(inv.date),
      inv.customerName || "Walking Customer",
      inv.customerContact || "N/A",
      inv.cashier,
      inv.paymentMethod,
      (inv.isReturn ? -inv.total : inv.total).toFixed(2)
    ]);
    exportToExcel("Selected Invoices", headers, rows, `Selected_Invoices_${new Date().toISOString().split("T")[0]}.xls`);
  };

  const handlePrintList = () => {
    window.print();
  };

  // Confirm Single Deletion
  const handleConfirmSingleDelete = () => {
    if (!singleDeleteTarget) return;
    const invId = singleDeleteTarget.invoiceNo || singleDeleteTarget.invoiceNumber || singleDeleteTarget.id;
    deleteInvoice(invId, restockOnDelete);
    setSelectedIds((prev) => {
      const updated = new Set(prev);
      updated.delete(invId);
      return updated;
    });
    setSingleDeleteTarget(null);
  };

  // Confirm Bulk Deletion
  const handleConfirmBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const idsArray = Array.from(selectedIds);
    deleteMultipleInvoices(idsArray, restockOnDelete);
    setSelectedIds(new Set());
    setShowBulkDeleteModal(false);
  };

  return (
    <div className="space-y-6 print-area">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Invoices & Returns Registry</h1>
          <p className="text-sm text-slate-655 font-semibold mt-0.5">Comprehensive audit log of all completed sales transactions, invoices, and refund vouchers</p>
        </div>
        <div className="no-print">
          <PrintExportActions
            onDirectPrint={handlePrintList}
            onPdf={handleExportListPDF}
            onExcel={handleExportListExcel}
            printLabel="Direct Print"
            pdfLabel="PDF"
            excelLabel="Excel Export"
            size="sm"
          />
        </div>
      </div>

      {/* Bulk Selection Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white p-3.5 px-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in no-print border border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold tracking-wide">
              <strong className="text-emerald-300 font-black text-sm">{selectedIds.size}</strong> {selectedIds.size === 1 ? "invoice" : "invoices"} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeselectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <IoCloseCircleOutline className="w-4 h-4" />
              <span>Deselect All</span>
            </button>
            <button
              type="button"
              onClick={handleExportSelected}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <IoDownloadOutline className="w-4 h-4" />
              <span>Export Selected</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 cursor-pointer transition-all active:scale-[0.98]"
              >
                <IoTrashOutline className="w-4 h-4" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs & Filters Card */}
      <div className="space-y-3 no-print">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit text-xs font-bold">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              typeFilter === "all"
                ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Registry ({sales.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("sales")}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              typeFilter === "sales"
                ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Standard Sales ({salesCount})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("returns")}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              typeFilter === "returns"
                ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sales Returns & Refunds ({returnsCount})
          </button>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-grow w-full md:max-w-md">
            <IoSearchOutline className="absolute left-3.5 top-3 text-slate-455 w-4.5 h-4.5" />
            <input
              type="text"
              placeholder="Search by invoice no, customer name, cashier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 w-full md:w-auto">
            <IoCalendarOutline className="w-4 h-4 text-emerald-600" />
            <span>Filter Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2.5 py-0.5 text-xs font-bold outline-none cursor-pointer"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="text-slate-400 hover:text-slate-600 font-extrabold cursor-pointer ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
 
      {/* Table of Invoices */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-semibold space-y-2">
            <p className="text-sm">No sales invoices found matching criteria.</p>
            <p className="text-xs text-slate-400">Ensure the search phrase or date filter is correct.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                  {isAdmin && (
                    <th className="py-3 px-4 w-10 text-center no-print">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeSelected;
                        }}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        title="Select All"
                      />
                    </th>
                  )}
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Cashier / Staff</th>
                  <th className="py-3 px-4">M.O.P.</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredInvoices.map((sale) => {
                  const invId = sale.invoiceNo || sale.invoiceNumber || sale.id;
                  const isChecked = selectedIds.has(invId);

                  return (
                    <tr
                      key={invId}
                      className={`transition-colors ${
                        isChecked ? "bg-emerald-50/40" : "hover:bg-slate-50/60"
                      }`}
                    >
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-center no-print">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectOne(invId)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                        </td>
                      )}
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>{sale.invoiceNo}</span>
                          {sale.isReturn && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Return
                            </span>
                          )}
                          {sale.returnStatus === "Fully Returned" && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                              Fully Ret.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium text-xs">
                        {new Date(sale.date).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-bold text-slate-800">{sale.customerName}</div>
                          {sale.customerContact && (
                            <div className="text-xs text-slate-500 font-medium mt-0.5">{sale.customerContact}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">{sale.cashier}</td>
                      <td className="py-3.5 px-4">
                        <Badge type={sale.isReturn ? "info" : sale.paymentMethod === "Credit" ? "warning" : "success"}>
                          {sale.isReturn ? "Cash Refund" : sale.paymentMethod}
                        </Badge>
                      </td>
                      <td className={`py-3.5 px-4 text-right font-black font-mono ${
                        sale.isReturn ? "text-rose-700" : "text-slate-900"
                      }`}>
                        {sale.isReturn ? `- ${formatCurrency(sale.total)}` : formatCurrency(sale.total)}
                      </td>
                      <td className="py-3.5 px-4 text-center no-print">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => handleOpenInvoice(sale)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-955 font-bold text-xs rounded-lg transition-all border border-slate-200 cursor-pointer shadow-2xs"
                          >
                            <IoEyeOutline className="w-3.5 h-3.5" />
                            <span>{sale.isReturn ? "View Voucher" : "View"}</span>
                          </button>
                          {!sale.isReturn && (
                            <button
                              onClick={() => navigate(`/pos?edit=${sale.invoiceNo}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-955 font-bold text-xs rounded-lg transition-all border border-amber-200 cursor-pointer shadow-2xs"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setSingleDeleteTarget(sale);
                                setRestockOnDelete(true);
                              }}
                              className="inline-flex items-center p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 rounded-lg transition-colors border border-rose-200 cursor-pointer shadow-2xs"
                              title="Delete Invoice"
                            >
                              <IoTrashOutline className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- SINGLE INVOICE DELETE CONFIRMATION MODAL --- */}
      <Modal
        isOpen={!!singleDeleteTarget}
        onClose={() => setSingleDeleteTarget(null)}
        title="Delete Sales Invoice"
      >
        {singleDeleteTarget && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <IoWarningOutline className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-black text-rose-900">Are you sure you want to delete this invoice?</h4>
                <p className="text-xs text-rose-700 font-semibold">
                  Invoice <strong className="font-mono">{singleDeleteTarget.invoiceNo}</strong> (Total: {formatCurrency(singleDeleteTarget.total)}) will be permanently removed from the sales registry.
                </p>
              </div>
            </div>

            {!singleDeleteTarget.isReturn && (
              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
                <input
                  type="checkbox"
                  checked={restockOnDelete}
                  onChange={(e) => setRestockOnDelete(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">Restock medicine items back into inventory</span>
                  <span className="text-[11px] text-slate-500 font-medium">Add sold quantities back to available batches</span>
                </div>
              </label>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSingleDeleteTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Delete Invoice Permanently
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- BULK DELETE CONFIRMATION MODAL --- */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Delete Selected Invoices (Bulk)"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
            <IoWarningOutline className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-black text-rose-900">
                Are you sure you want to delete {selectedIds.size} selected invoices?
              </h4>
              <p className="text-xs text-rose-700 font-semibold">
                This action is irreversible and will permanently delete all {selectedIds.size} selected transaction records from the database and cloud.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
            <input
              type="checkbox"
              checked={restockOnDelete}
              onChange={(e) => setRestockOnDelete(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">Restock items back into inventory</span>
              <span className="text-[11px] text-slate-500 font-medium">Re-add items of standard sales back into batch stock</span>
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmBulkDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 cursor-pointer"
            >
              Delete {selectedIds.size} Invoices Permanently
            </button>
          </div>
        </div>
      </Modal>

      {/* --- RECEIPT & INVOICE MODAL (DUAL FORMAT) --- */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={selectedInvoice?.isReturn ? `Sales Return Voucher: ${selectedInvoice?.invoiceNo}` : `Sales Invoice: ${selectedInvoice?.invoiceNo}`}
        size={previewInvoiceFormat === "a4" ? "xl" : "md"}
      >
        {selectedInvoice && (
          <div className="space-y-5">
            {/* Format Switcher */}
            <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl text-xs font-bold no-print">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium pl-1">Print Layout:</span>
                <button
                  type="button"
                  onClick={() => setPreviewInvoiceFormat("thermal")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    previewInvoiceFormat === "thermal"
                      ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🧾 Thermal (80mm)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewInvoiceFormat("a4")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    previewInvoiceFormat === "a4"
                      ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📄 Full Page (A4)
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-mono pr-1">
                {previewInvoiceFormat === "thermal" ? "80mm POS Roll" : "Standard 210mm Sheet"}
              </div>
            </div>

            {/* Layout 1: THERMAL 80MM */}
            {previewInvoiceFormat === "thermal" && (
              <div className="print-thermal print-receipt bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-700 font-mono text-[11px] leading-relaxed shadow-inner">
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    {selectedInvoice.isReturn ? "SALES RETURN & REFUND VOUCHER" : "PharmaCare ERP"}
                  </h3>
                  <p className="text-[9px] text-slate-500">{selectedInvoice.branch || "Main Branch"}</p>
                  <p className="text-[8px] text-slate-400">Date: {new Date(selectedInvoice.date).toLocaleString()}</p>
                </div>

                <div className="border-t border-dashed border-slate-300 my-3"></div>

                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>{selectedInvoice.isReturn ? "Return Voucher #:" : "Invoice No:"}</span>
                    <span className="font-bold text-slate-800">{selectedInvoice.invoiceNo}</span>
                  </div>
                  {selectedInvoice.originalInvoiceNo && (
                    <div className="flex justify-between text-slate-800 font-bold">
                      <span>Original Invoice Ref:</span>
                      <span>#{selectedInvoice.originalInvoiceNo}</span>
                    </div>
                  )}
                  {selectedInvoice.returnReason && (
                    <div className="flex justify-between text-slate-600">
                      <span>Reason:</span>
                      <span>{selectedInvoice.returnReason}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold text-slate-800">{selectedInvoice.customerName}</span>
                  </div>
                  {selectedInvoice.customerContact && selectedInvoice.customerContact !== "N/A" && (
                    <div className="flex justify-between">
                      <span>Cell:</span>
                      <span>{selectedInvoice.customerContact}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Staff In-Charge:</span>
                    <span>{selectedInvoice.cashier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Type:</span>
                    <span className="font-bold">{selectedInvoice.paymentMethod}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-3"></div>

                <div className="space-y-2">
                  <div className="grid grid-cols-12 font-bold text-slate-800">
                    <span className="col-span-6">Medicine</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-2 text-right">Rate</span>
                    <span className="col-span-2 text-right">Total</span>
                  </div>
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 text-slate-600">
                      <span className="col-span-6 truncate font-semibold text-slate-700">{item.name}</span>
                      <span className="col-span-2 text-center">{item.qty}</span>
                      <span className="col-span-2 text-right">{formatCurrency(item.price)}</span>
                      <span className="col-span-2 text-right font-semibold text-slate-700">
                        {formatCurrency(item.qty * item.price)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-300 my-3"></div>

                <div className="space-y-1.5 text-right font-mono">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(selectedInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax (VAT {taxRate * 100}%):</span>
                    <span>{formatCurrency(selectedInvoice.tax)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-slate-800 border-t border-dashed border-slate-300 pt-1.5 mt-1.5">
                    <span>{selectedInvoice.isReturn ? "Total Refund Paid:" : "Grand Total:"}</span>
                    <span>{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                  {selectedInvoice.paymentMethod && selectedInvoice.paymentMethod.includes("Cash") && (
                    <div className="space-y-1.5 pt-1.5 border-t border-dotted border-slate-300 text-slate-600 font-semibold text-[10px]">
                      <div className="flex justify-between">
                        <span>Cash Paid:</span>
                        <span>{formatCurrency(selectedInvoice.amountPaid ?? selectedInvoice.total)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-650 font-bold">
                        <span>Change Given:</span>
                        <span>{formatCurrency(selectedInvoice.change ?? 0)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center text-[8px] text-slate-400 mt-6 leading-tight">
                  {selectedInvoice.isReturn ? "Goods return confirmed & restocked." : "Thank you for choosing PharmaCare ERP!"}
                </div>
              </div>
            )}

            {/* Layout 2: FULL PAGE A4 */}
            {previewInvoiceFormat === "a4" && (
              <div className="print-a4 bg-white p-8 rounded-2xl border border-slate-200 text-slate-800 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-5 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-md ${selectedInvoice.isReturn ? "bg-slate-900" : "bg-emerald-600"}`}></span>
                      <h2 className="text-xl font-extrabold text-slate-900 font-heading">
                        {selectedInvoice.isReturn ? "Sales Return & Refund Voucher" : "PharmaCare ERP"}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">Retail Pharmacy & Healthcare Solutions</p>
                    <p className="text-xs text-slate-600 font-bold mt-0.5">Branch: {selectedInvoice.branch || "Main Branch"}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                      {selectedInvoice.isReturn ? "Credit Return Note" : "Official Sales Invoice"}
                    </div>
                    <div className="text-base font-black text-slate-900 font-mono mt-0.5">{selectedInvoice.invoiceNo}</div>
                    <div className="text-xs text-slate-500 mt-1">Date: {new Date(selectedInvoice.date).toLocaleString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Customer Details</div>
                    <div className="font-extrabold text-slate-900 text-sm mt-0.5">{selectedInvoice.customerName}</div>
                    <div className="text-slate-500 mt-0.5">Contact: {selectedInvoice.customerContact || "N/A"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      {selectedInvoice.isReturn ? "Refund Information" : "Transaction Info"}
                    </div>
                    {selectedInvoice.originalInvoiceNo && (
                      <div className="font-bold text-slate-800 mt-0.5">Orig. Invoice Ref: #{selectedInvoice.originalInvoiceNo}</div>
                    )}
                    <div className="font-bold text-slate-800 mt-0.5">Payment: {selectedInvoice.paymentMethod}</div>
                    <div className="text-slate-500 mt-0.5">Processed By: {selectedInvoice.cashier}</div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">{selectedInvoice.isReturn ? "Returned Medicine" : "Medicine Description"}</th>
                        <th className="py-2.5 px-3 text-center">{selectedInvoice.isReturn ? "Qty Returned" : "Qty"}</th>
                        <th className="py-2.5 px-3 text-right">{selectedInvoice.isReturn ? "Return Unit Rate" : "Unit Price"}</th>
                        <th className="py-2.5 px-3 text-right">Tax</th>
                        <th className="py-2.5 px-3 text-right">{selectedInvoice.isReturn ? "Refund Total" : "Line Total"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">{item.qty}</td>
                          <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(item.price)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">{formatCurrency(item.tax || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            {formatCurrency(item.qty * item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="w-full sm:w-72 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    {selectedInvoice.discount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(selectedInvoice.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Tax (VAT {taxRate * 100}%):</span>
                      <span>{formatCurrency(selectedInvoice.tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-300 pt-2 mt-2">
                      <span>{selectedInvoice.isReturn ? "Total Refund Issued:" : "Grand Total:"}</span>
                      <span>{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-dashed border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                  <span>{selectedInvoice.isReturn ? "Goods return confirmed & restocked." : "Thank you for choosing PharmaCare ERP!"}</span>
                  <span>PharmaCare Systems &bull; Certified POS</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold cursor-pointer border border-slate-300"
              >
                Close
              </button>
              <PrintExportActions
                onDirectPrint={handlePrint}
                onPdf={handleInvoicePdf}
                onExcel={handleInvoiceExcel}
                printLabel="Direct Print"
                pdfLabel="PDF"
                excelLabel="Excel Export"
                size="md"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
