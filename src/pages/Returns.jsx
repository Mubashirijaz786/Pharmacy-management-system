import React, { useContext, useState, useMemo, useRef, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { formatCurrency, formatDate } from "../utils/helpers";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import { PrintExportActions } from "../components/common/PrintExportActions";
import {
  IoSearchOutline,
  IoReturnUpBackOutline,
  IoPrintOutline,
  IoEyeOutline,
  IoCheckmarkCircle,
  IoTrashOutline,
  IoWarningOutline,
  IoAddOutline,
  IoRemoveOutline
} from "react-icons/io5";

export const Returns = () => {
  const { sales, processReturn, salesReturns, currentBranch, currentUser, taxRate, addToast, deleteReturn, deleteMultipleReturns, exportToExcel, exportTableToPDF } = useContext(AppContext);

  // Return form states
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchedSale, setSearchedSale] = useState(null);
  const [returnItemsState, setReturnItemsState] = useState({}); // { medId: qtyToReturn }
  const [returnReason, setReturnReason] = useState("Customer request / Damaged packaging");
  
  // Printable Receipt Modal State
  const [receiptVoucher, setReceiptVoucher] = useState(null);
  const [voucherPrintFormat, setVoucherPrintFormat] = useState("thermal");
  const [deleteTargetReturn, setDeleteTargetReturn] = useState(null);
  const [selectedReturnIds, setSelectedReturnIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Ref for auto-focusing the first return input
  const firstQtyInputRef = useRef(null);

  // Get matching invoices as suggestions
  const suggestions = useMemo(() => {
    const originalSalesOnly = sales.filter(
      (s) => !s.isReturn && s.type !== "RETURN" && !(s.invoiceNo || s.invoiceNumber || "").startsWith("RET-")
    );
    const query = invoiceQuery.toLowerCase().trim();
    if (!query) {
      return originalSalesOnly;
    }
    return originalSalesOnly.filter((s) => {
      const invNo = s.invoiceNo || s.invoiceNumber || s.id || "";
      const matchesInvoice = invNo.toLowerCase().includes(query);
      const matchesCustomer = s.customerName && s.customerName.toLowerCase().includes(query);
      const matchesContact = s.customerContact && s.customerContact.toLowerCase().includes(query);
      return matchesInvoice || matchesCustomer || matchesContact;
    });
  }, [sales, invoiceQuery]);

  const handleSelectSuggestion = (sale) => {
    setSearchedSale(sale);
    setInvoiceQuery(sale.invoiceNo || sale.invoiceNumber || sale.id || "");
    setShowSuggestions(false);
    
    // Initialize return quantities with remaining available returnable units
    const initialQtys = {};
    (sale.items || []).forEach((item) => {
      const alreadyRet = item.returnedQty || 0;
      const maxAvail = Math.max(0, (item.qty || item.quantity || 0) - alreadyRet);
      initialQtys[item.medicineId] = maxAvail > 0 ? 1 : 0;
    });
    setReturnItemsState(initialQtys);

    // Auto-focus and highlight the quantity input after rendering
    setTimeout(() => {
      if (firstQtyInputRef.current) {
        firstQtyInputRef.current.focus();
        firstQtyInputRef.current.select();
      }
    }, 100);
  };

  const handleSearchInvoice = (e) => {
    e.preventDefault();
    if (!invoiceQuery.trim()) return;
    
    const query = invoiceQuery.toLowerCase().trim();
    const sale = sales.find(
      (s) =>
        !s.isReturn &&
        s.type !== "RETURN" &&
        !(s.invoiceNo || s.invoiceNumber || "").startsWith("RET-") &&
        (((s.invoiceNo || s.invoiceNumber || s.id || "").toLowerCase().includes(query)) ||
          (s.customerName && s.customerName.toLowerCase().includes(query)) ||
          (s.customerContact && s.customerContact.toLowerCase().includes(query)))
    );
    
    if (!sale) {
      addToast(`No matching sales invoice found for "${invoiceQuery}".`, "warning");
      setSearchedSale(null);
      return;
    }
    
    handleSelectSuggestion(sale);
  };

  // Strict Quantity Clamping (Prevents typing above purchased/available limit)
  const handleQtyChange = (medId, val, maxVal) => {
    if (val === "" || val === null || val === undefined) {
      setReturnItemsState((prev) => ({
        ...prev,
        [medId]: 0
      }));
      return;
    }
    const cleanStr = String(val).replace(/[^0-9]/g, "");
    if (!cleanStr) {
      setReturnItemsState((prev) => ({
        ...prev,
        [medId]: 0
      }));
      return;
    }
    let parsed = parseInt(cleanStr, 10);
    if (isNaN(parsed)) parsed = 0;
    if (parsed > maxVal) {
      parsed = maxVal; // Strictly clamp to max returnable!
    }
    if (parsed < 0) parsed = 0;

    setReturnItemsState((prev) => ({
      ...prev,
      [medId]: parsed
    }));
  };

  // Stepper handlers
  const handleIncrementQty = (medId, maxVal) => {
    const current = Number(returnItemsState[medId] || 0);
    if (current < maxVal) {
      setReturnItemsState((prev) => ({
        ...prev,
        [medId]: current + 1
      }));
    }
  };

  const handleDecrementQty = (medId) => {
    const current = Number(returnItemsState[medId] || 0);
    if (current > 0) {
      setReturnItemsState((prev) => ({
        ...prev,
        [medId]: current - 1
      }));
    }
  };

  const handleSetMaxQty = (medId, maxVal) => {
    setReturnItemsState((prev) => ({
      ...prev,
      [medId]: maxVal
    }));
  };

  // Calculate dynamic refund amount
  const computedRefundTotal = useMemo(() => {
    if (!searchedSale) return 0;
    let subtotal = 0;
    (searchedSale.items || []).forEach((item) => {
      const returnQty = returnItemsState[item.medicineId] || 0;
      subtotal += returnQty * item.price;
    });
    const refundTax = subtotal * (taxRate || 0.05);
    return subtotal + refundTax;
  }, [searchedSale, returnItemsState, taxRate]);

  const handleProcessReturnSubmit = (e) => {
    e.preventDefault();
    if (!searchedSale) return;

    // Build returnItems array
    const returnItems = [];
    const factor = 1 + (taxRate || 0.05);

    (searchedSale.items || []).forEach((item) => {
      const qty = returnItemsState[item.medicineId] || 0;
      const alreadyRet = item.returnedQty || 0;
      const maxReturnable = Math.max(0, item.qty - alreadyRet);

      if (qty > 0) {
        if (qty > maxReturnable) {
          addToast(`Cannot return ${qty} of "${item.name}". Only ${maxReturnable} units remain returnable!`, "danger");
          return;
        }
        returnItems.push({
          medicineId: item.medicineId,
          name: item.name,
          qtyToReturn: qty,
          refundAmount: qty * item.price * factor
        });
      }
    });

    if (returnItems.length === 0) {
      addToast("Please select at least 1 returnable item quantity to process.", "warning");
      return;
    }

    const report = processReturn(searchedSale.invoiceNo || searchedSale.invoiceNumber || searchedSale.id, returnItems, returnReason);
    if (report) {
      setReceiptVoucher(report);
      setSearchedSale(null);
      setInvoiceQuery("");
      setReturnReason("Customer request / Damaged packaging");

      // Instant Single-Click Auto Print Return Refund Voucher
      setTimeout(() => {
        window.print();
      }, 150);
    }
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  const handleVoucherPdf = () => {
    if (!receiptVoucher) return;
    const headers = ["#", "Item Description", "Batch #", "Quantity Returned", "Refund Rate", "Line Refund"];
    const rows = (receiptVoucher.items || []).map((it, idx) => [
      idx + 1,
      it.medicineName || it.name || "Item",
      it.batchNumber || "-",
      it.quantity || 1,
      formatCurrency(it.unitPrice || it.price || 0),
      formatCurrency(it.total || 0)
    ]);
    const retId = receiptVoucher.invoiceNo || receiptVoucher.invoiceNumber || receiptVoucher.id || "Return";
    exportTableToPDF(
      `Sales Return & Refund Voucher #${retId}`,
      headers,
      rows,
      `Return_Voucher_${retId}.pdf`,
      {
        "Original Invoice": receiptVoucher.originalInvoiceNo || "-",
        "Customer": receiptVoucher.customerName || "Walking Customer",
        "Return Date": formatDate(receiptVoucher.date),
        "Processed By": receiptVoucher.cashier || currentUser.name,
        "Net Refund Total": formatCurrency(receiptVoucher.total || 0),
        "Return Reason": receiptVoucher.reason || "Customer Return"
      },
      currentBranch
    );
  };

  const handleVoucherExcel = () => {
    if (!receiptVoucher) return;
    const headers = ["#", "Item Description", "Batch #", "Quantity Returned", "Refund Rate", "Line Refund"];
    const rows = (receiptVoucher.items || []).map((it, idx) => [
      idx + 1,
      it.medicineName || it.name || "Item",
      it.batchNumber || "-",
      it.quantity || 1,
      (it.unitPrice || it.price || 0).toFixed(2),
      (it.total || 0).toFixed(2)
    ]);
    const retId = receiptVoucher.invoiceNo || receiptVoucher.invoiceNumber || receiptVoucher.id || "Return";
    exportToExcel(
      `Sales Return & Refund Voucher #${retId}`,
      headers,
      rows,
      `Return_Voucher_${retId}.xls`,
      {
        "Original Invoice": receiptVoucher.originalInvoiceNo || "-",
        "Customer": receiptVoucher.customerName || "Walking Customer",
        "Return Date": formatDate(receiptVoucher.date),
        "Grand Refund Total": formatCurrency(receiptVoucher.total || 0)
      }
    );
  };

  const handleToggleSelectAllReturns = () => {
    if (selectedReturnIds.length === salesReturns.length && salesReturns.length > 0) {
      setSelectedReturnIds([]);
    } else {
      setSelectedReturnIds(salesReturns.map((r) => r.invoiceNo || r.invoiceNumber || r.id));
    }
  };

  const handleToggleSelectReturn = (retId, e) => {
    e.stopPropagation();
    setSelectedReturnIds((prev) =>
      prev.includes(retId) ? prev.filter((id) => id !== retId) : [...prev, retId]
    );
  };

  const handleConfirmBulkDelete = () => {
    deleteMultipleReturns(selectedReturnIds);
    setSelectedReturnIds([]);
    setShowBulkDeleteModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Returns & Refund Ledger</h1>
          <p className="text-sm text-slate-500 font-semibold mt-0.5">
            Process customer returns at original sold rate, restock medicines into inventory, and issue printable refund vouchers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Search & Return Action Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Invoice search card */}
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Find Original Sales Invoice</h3>
            
            <form onSubmit={handleSearchInvoice} className="flex gap-2 relative">
              <div className="relative flex-grow">
                <IoSearchOutline className="absolute left-3.5 top-3.5 text-slate-400 w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Search by invoice no (e.g. INV-1001), customer name, or contact number..."
                  value={invoiceQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setInvoiceQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-slate-800 rounded-xl text-xs font-bold outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                />

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)}></div>
                    <div className="absolute top-12 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-fade-in">
                      {suggestions.map((sale) => (
                        <button
                          key={sale.invoiceNo}
                          type="button"
                          onClick={() => handleSelectSuggestion(sale)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="text-xs font-black text-slate-800 font-mono">{sale.invoiceNo}</div>
                            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              Customer: {sale.customerName || "Walk-in"} &bull; Date: {new Date(sale.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900 font-mono">{formatCurrency(sale.total)}</span>
                            {sale.returnStatus && (
                              <span className="block text-[9px] font-bold text-amber-700">{sale.returnStatus}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-[0.98] shadow-2xs self-start"
              >
                Find Invoice
              </button>
            </form>
          </div>

          {/* If invoice found: show return configurations sheet */}
          {searchedSale && (
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-mono">Invoice Reference: {searchedSale.invoiceNo}</h3>
                  <span className="text-xs text-slate-500 font-semibold mt-0.5 block">
                    Customer: <strong>{searchedSale.customerName}</strong> &bull; Date: {new Date(searchedSale.date).toLocaleDateString()} &bull; Original Total: {formatCurrency(searchedSale.total)}
                  </span>
                </div>
                <Badge type={searchedSale.isFullyReturned ? "danger" : searchedSale.isPartiallyReturned ? "warning" : "success"}>
                  {searchedSale.returnStatus || "Active"}
                </Badge>
              </div>

              {/* Items checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Select Return Quantities</h4>
                
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 text-xs overflow-hidden bg-white">
                  <div className="grid grid-cols-12 bg-slate-100 p-2.5 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <span className="col-span-4">Medicine Item</span>
                    <span className="col-span-2 text-center">Purchased</span>
                    <span className="col-span-2 text-center">Already Ret.</span>
                    <span className="col-span-2 text-right">Sold Rate</span>
                    <span className="col-span-2 text-right">Return Qty</span>
                  </div>

                  {(searchedSale.items || []).map((item, idx) => {
                    const medId = item.medicineId || item.id || (item.medicine ? item.medicine.id : "");
                    const itemName = item.name || (item.medicine ? item.medicine.name : "") || "Medicine Item";
                    const itemQty = Number(item.qty ?? item.quantity ?? 1);
                    const itemPrice = Number(item.price ?? item.unitPrice ?? item.sellingPrice ?? (item.medicine ? item.medicine.sellingPrice : 0) ?? 0);
                    const alreadyRet = Number(item.returnedQty || 0);
                    const maxAvail = Math.max(0, itemQty - alreadyRet);
                    const isDepleted = maxAvail <= 0;
                    const currentVal = returnItemsState[medId] || 0;

                    return (
                      <div key={medId || idx} className={`grid grid-cols-12 p-3 items-center gap-2 ${isDepleted ? "bg-slate-50 text-slate-400" : "hover:bg-slate-50/60"}`}>
                        <div className="col-span-4">
                          <span className="font-bold text-slate-900 block">{itemName}</span>
                          <span className="text-[10px] text-slate-500 font-semibold font-mono">Max returnable: <strong className="text-slate-700">{maxAvail} units</strong></span>
                          {isDepleted && (
                            <span className="ml-2 text-[9px] font-black bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded">
                              Fully Returned
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 text-center font-mono font-bold text-slate-800">{itemQty}</div>
                        <div className="col-span-2 text-center font-mono font-bold text-amber-700">{alreadyRet}</div>
                        <div className="col-span-2 text-right font-mono text-slate-700 font-bold">{formatCurrency(itemPrice)}</div>
                        <div className="col-span-2 flex items-center justify-end">
                          {isDepleted ? (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">0 Left</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDecrementQty(medId)}
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95 transition-all"
                                title="Decrease"
                              >
                                -
                              </button>
                              <input
                                ref={idx === 0 ? firstQtyInputRef : null}
                                type="number"
                                min="0"
                                max={maxAvail}
                                value={currentVal === 0 ? "" : currentVal}
                                placeholder="0"
                                onKeyDown={(e) => {
                                  if (e.key === "-" || e.key === "e" || e.key === "+") {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => handleQtyChange(medId, e.target.value, maxAvail)}
                                className="w-12 bg-white border-2 border-emerald-500 focus:border-emerald-600 text-center rounded-lg py-1 font-black text-xs font-mono text-emerald-950 outline-none shadow-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleIncrementQty(medId, maxAvail)}
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95 transition-all"
                                title="Increase"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetMaxQty(medId, maxAvail)}
                                className="text-[9px] font-black px-1.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded cursor-pointer transition-colors whitespace-nowrap"
                                title={`Set to Max (${maxAvail})`}
                              >
                                Max
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reason & Refund Button */}
              <form onSubmit={handleProcessReturnSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                    Return Reason / Notes
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Patient prescription revised / Package damaged"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all shadow-2xs"
                  />
                </div>

                {searchedSale.isFullyReturned && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <span>⛔ This sales invoice has already been fully refunded and returned. No items remaining to return.</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Estimated Refund Amount</span>
                    <h3 className="text-xl font-black text-slate-900 font-mono mt-0.5">{formatCurrency(computedRefundTotal)}</h3>
                  </div>

                  <button
                    type="submit"
                    disabled={computedRefundTotal <= 0 || searchedSale.isFullyReturned}
                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer ${
                      computedRefundTotal <= 0 || searchedSale.isFullyReturned
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                        : "bg-slate-900 hover:bg-slate-800 text-amber-300 shadow-slate-900/10"
                    }`}
                  >
                    <IoReturnUpBackOutline className="w-4.5 h-4.5" />
                    <span>{searchedSale.isFullyReturned ? "Fully Returned" : "Process Return & Issue Voucher"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Side: Returns history list (1 col) */}
        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4 h-fit">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Return History Log</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Audit list of all processed customer returns</p>
            </div>
            {currentUser?.role === "Admin" && salesReturns.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAllReturns}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer whitespace-nowrap"
              >
                {selectedReturnIds.length === salesReturns.length ? "Deselect All" : `Select All (${salesReturns.length})`}
              </button>
            )}
          </div>

          {/* Bulk Selection Action Bar */}
          {currentUser?.role === "Admin" && selectedReturnIds.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 animate-fade-in">
              <span className="text-xs font-black text-rose-900">
                {selectedReturnIds.length} of {salesReturns.length} Selected
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedReturnIds([])}
                  className="px-2.5 py-1 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <IoTrashOutline className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedReturnIds.length})</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {salesReturns.length === 0 ? (
              <p className="text-center text-xs text-slate-450 py-12 font-bold">No returns recorded in system database.</p>
            ) : (
              salesReturns.map((ret) => {
                const retId = ret.invoiceNo || ret.invoiceNumber || ret.id;
                const isSelected = selectedReturnIds.includes(retId);

                return (
                  <div
                    key={retId}
                    onClick={() => setReceiptVoucher(ret)}
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all cursor-pointer shadow-2xs animate-fade-in group relative ${
                      isSelected
                        ? "bg-rose-50/60 border-rose-300 ring-1 ring-rose-400"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {currentUser?.role === "Admin" && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectReturn(retId, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                          />
                        )}
                        <span className="font-mono font-extrabold text-slate-900">{ret.invoiceNo}</span>
                      </div>
                      <span className="text-slate-900 font-mono font-extrabold">{formatCurrency(ret.total)}</span>
                    </div>

                    <div className="text-slate-600 font-bold">
                      Ref: <span className="font-extrabold text-slate-800 font-mono">#{ret.originalInvoiceNo || "Direct"}</span> &bull; {ret.customerName}
                    </div>
                    <p className="text-[11px] text-slate-500 italic">Reason: {ret.returnReason}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/60">
                      <span>{formatDate(ret.date)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 font-bold flex items-center gap-1 hover:underline">
                          <IoEyeOutline className="w-3.5 h-3.5" /> View Voucher
                        </span>
                        {currentUser?.role === "Admin" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetReturn(ret);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Delete Return Record"
                          >
                            <IoTrashOutline className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* --- SALES RETURN & REFUND VOUCHER MODAL (DUAL PRINT FORMAT) --- */}
      <Modal
        isOpen={!!receiptVoucher}
        onClose={() => setReceiptVoucher(null)}
        title="Sales Return & Refund Voucher"
        size={voucherPrintFormat === "a4" ? "xl" : "md"}
      >
        {receiptVoucher && (
          <div className="space-y-5">
            {/* Format Toggle Bar */}
            <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl text-xs font-bold no-print">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium pl-1">Print Layout:</span>
                <button
                  type="button"
                  onClick={() => setVoucherPrintFormat("thermal")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    voucherPrintFormat === "thermal"
                      ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🧾 Thermal (80mm)
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherPrintFormat("a4")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    voucherPrintFormat === "a4"
                      ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📄 Full Page (A4)
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-mono pr-1">
                {voucherPrintFormat === "thermal" ? "80mm POS Roll" : "Standard 210mm Sheet"}
              </div>
            </div>

            {/* Thermal Print Format */}
            {voucherPrintFormat === "thermal" && (
              <div className="print-thermal print-receipt bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-700 font-mono text-[11px] leading-relaxed shadow-inner">
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    SALES RETURN & REFUND VOUCHER
                  </h3>
                  <p className="text-[9px] text-slate-500">{receiptVoucher.branch || currentBranch.name}</p>
                  <p className="text-[8px] text-slate-400">Date: {new Date(receiptVoucher.date).toLocaleString()}</p>
                </div>

                <div className="border-t border-dashed border-slate-300 my-3"></div>

                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Return Voucher #:</span>
                    <span className="font-bold text-slate-800">{receiptVoucher.invoiceNo}</span>
                  </div>
                  {receiptVoucher.originalInvoiceNo && (
                    <div className="flex justify-between text-slate-800 font-bold">
                      <span>Original Invoice Ref:</span>
                      <span>#{receiptVoucher.originalInvoiceNo}</span>
                    </div>
                  )}
                  {receiptVoucher.returnReason && (
                    <div className="flex justify-between text-slate-600">
                      <span>Reason:</span>
                      <span>{receiptVoucher.returnReason}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold text-slate-800">{receiptVoucher.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier / Staff:</span>
                    <span>{receiptVoucher.cashier}</span>
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
                  {(receiptVoucher.items || []).map((item, idx) => (
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
                    <span className="font-semibold">{formatCurrency(receiptVoucher.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (VAT {taxRate * 100}%):</span>
                    <span>{formatCurrency(receiptVoucher.tax)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-slate-900 border-t border-dashed border-slate-300 pt-1.5 mt-1.5">
                    <span>Total Refund Paid:</span>
                    <span>{formatCurrency(receiptVoucher.total)}</span>
                  </div>
                </div>

                <div className="text-center text-[8px] text-slate-500 mt-5 leading-tight space-y-1">
                  <div className="font-bold text-[9px] text-rose-700 bg-rose-50 border border-rose-200 py-1 px-2 rounded">
                    ★ Present this Return Voucher at the Main Cash Counter to collect your cash refund.
                  </div>
                  <div className="text-[7.5px] text-slate-400">Goods returned have been restocked into inventory &bull; Certified Returns</div>
                </div>
              </div>
            )}

            {/* A4 Print Format */}
            {voucherPrintFormat === "a4" && (
              <div className="print-a4 bg-white p-8 rounded-2xl border border-slate-200 text-slate-800 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-5 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-slate-900"></span>
                      <h2 className="text-xl font-extrabold text-slate-900 font-heading">
                        Sales Return & Refund Voucher
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">Retail Pharmacy & POS Solutions</p>
                    <p className="text-xs text-slate-600 font-bold mt-0.5">Branch: {receiptVoucher.branch || currentBranch.name}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                      Credit Return Note
                    </div>
                    <div className="text-base font-black text-slate-900 font-mono mt-0.5">{receiptVoucher.invoiceNo}</div>
                    <div className="text-xs text-slate-500 mt-1">Date: {new Date(receiptVoucher.date).toLocaleString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Customer Details</div>
                    <div className="font-extrabold text-slate-900 text-sm mt-0.5">{receiptVoucher.customerName}</div>
                    <div className="text-slate-500 mt-0.5">Cell: {receiptVoucher.customerContact || "N/A"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Refund Information</div>
                    {receiptVoucher.originalInvoiceNo && (
                      <div className="font-bold text-slate-800 mt-0.5">Orig. Invoice Ref: #{receiptVoucher.originalInvoiceNo}</div>
                    )}
                    <div className="font-bold text-slate-800 mt-0.5">Method: {receiptVoucher.paymentMethod}</div>
                    <div className="text-slate-500 mt-0.5">Processed By: {receiptVoucher.cashier}</div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Returned Medicine Description</th>
                        <th className="py-2.5 px-3 text-center">Qty Returned</th>
                        <th className="py-2.5 px-3 text-right">Return Unit Rate</th>
                        <th className="py-2.5 px-3 text-right">Tax</th>
                        <th className="py-2.5 px-3 text-right">Refund Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(receiptVoucher.items || []).map((item, idx) => (
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
                      <span className="font-semibold">{formatCurrency(receiptVoucher.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tax (VAT {taxRate * 100}%):</span>
                      <span>{formatCurrency(receiptVoucher.tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-300 pt-2 mt-2">
                      <span>Total Refund Issued:</span>
                      <span>{formatCurrency(receiptVoucher.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between text-xs text-rose-800">
                  <span className="font-bold">★ Counter Refund Notice:</span>
                  <span>Please present this Return Voucher at the Main Cash Counter to collect your refund amount of <strong>{formatCurrency(receiptVoucher.total)}</strong>.</span>
                </div>

                <div className="pt-6 border-t border-dashed border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                  <span>Sales Return Verified. Stock updated into inventory.</span>
                  <span>PharmaCare Systems &bull; Certified Returns</span>
                </div>
              </div>
            )}

            {/* Print Action Controls */}
            <div className="flex flex-wrap items-center justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => setReceiptVoucher(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold cursor-pointer border border-slate-300"
              >
                Close
              </button>
              <PrintExportActions
                onDirectPrint={handlePrintVoucher}
                onPdf={handleVoucherPdf}
                onExcel={handleVoucherExcel}
                printLabel="Direct Print"
                pdfLabel="PDF"
                excelLabel="Excel Export"
                size="md"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* --- RETURN RECORD DELETE CONFIRMATION MODAL --- */}
      <Modal
        isOpen={!!deleteTargetReturn}
        onClose={() => setDeleteTargetReturn(null)}
        title="Delete Return Voucher Record"
      >
        {deleteTargetReturn && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <IoWarningOutline className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-black text-rose-900">Are you sure you want to delete this return record?</h4>
                <p className="text-xs text-rose-700 font-semibold">
                  Return Voucher <strong className="font-mono">{deleteTargetReturn.invoiceNo}</strong> (Refund: {formatCurrency(deleteTargetReturn.total)}) will be permanently deleted from the return history and sales database.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteTargetReturn(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteReturn(deleteTargetReturn.invoiceNo || deleteTargetReturn.invoiceNumber || deleteTargetReturn.id);
                  setDeleteTargetReturn(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Delete Return Voucher Permanently
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- BULK RETURN RECORD DELETE CONFIRMATION MODAL --- */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Delete Multiple Return Voucher Records"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
            <IoWarningOutline className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-black text-rose-900">
                Are you sure you want to delete {selectedReturnIds.length} return records?
              </h4>
              <p className="text-xs text-rose-700 font-semibold">
                You have selected <strong>{selectedReturnIds.length} return vouchers</strong>. They will be permanently removed from the returns history and system database.
              </p>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1 text-xs">
            {selectedReturnIds.map((id) => (
              <div key={id} className="font-mono font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>{id}</span>
              </div>
            ))}
          </div>

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
              Delete {selectedReturnIds.length} Return Vouchers Permanently
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
