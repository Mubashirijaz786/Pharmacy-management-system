import React, { useContext, useState, useMemo, useRef, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { formatCurrency, formatDate } from "../utils/helpers";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { Badge } from "../components/common/Badge";
import { PrintHeader } from "../components/common/PrintHeader";
import { PrintFooter } from "../components/common/PrintFooter";
import { PrintExportActions } from "../components/common/PrintExportActions";
import {
  IoAddOutline,
  IoSearchOutline,
  IoBusinessOutline,
  IoCardOutline,
  IoChevronForwardOutline,
  IoArrowBackOutline,
  IoTrashOutline,
  IoCreateOutline,
  IoDownloadOutline,
  IoPrintOutline
} from "react-icons/io5";

export const Suppliers = () => {
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    paySupplier,
    purchases,
    currentUser,
    currentBranch,
    exportToCSV,
    exportToExcel,
    exportTableToPDF,
    addToast
  } = useContext(AppContext);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState(null); // Active drilldown supplier
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  // Pay Form fields
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState("Cash in Hand");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // Supplier Form fields
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    company: "",
    address: ""
  });

  const nameInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const companyInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const submitButtonRef = useRef(null);

  useEffect(() => {
    if (showAddModal) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 60);
    }
  }, [showAddModal]);

  const handleKeyDownNext = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

  // Target supplier for direct payment from table
  const [payingSupplier, setPayingSupplier] = useState(null);

  // Filter suppliers list
  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.company.toLowerCase().includes(q) ||
        s.contact.includes(q)
    );
  }, [suppliers, searchQuery]);

  // Selected Supplier Details
  const activeSupplier = useMemo(() => {
    if (!selectedSupplierId) return null;
    return suppliers.find((s) => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // Selected Supplier Purchases History
  const supplierPurchases = useMemo(() => {
    if (!selectedSupplierId) return [];
    return purchases.filter((p) => p.supplierId === selectedSupplierId);
  }, [purchases, selectedSupplierId]);

  // Current supplier target for payment modal (either row clicked or drilldown)
  const currentPayTarget = payingSupplier || activeSupplier;

  // Handlers
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (editingSupplier) {
      updateSupplier({
        ...editingSupplier,
        name: formData.name,
        contact: formData.contact,
        company: formData.company,
        address: formData.address
      });
      setEditingSupplier(null);
    } else {
      addSupplier({
        ...formData,
        openingBalance: 0,
        balance: 0
      });
    }
    setFormData({ name: "", contact: "", company: "", address: "" });
    setShowAddModal(false);
  };

  const handleEditSupplier = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      contact: sup.contact,
      company: sup.company,
      address: sup.address || ""
    });
    setShowAddModal(true);
  };

  const handleOpenPay = (sup) => {
    setPayingSupplier(sup);
    setPayAmount("");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayMethod("Cash in Hand");
    setPayRef("");
    setPayNotes(`Ledger payment settlement for ${sup.name}`);
    setShowPayModal(true);
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    if (!currentPayTarget || !payAmount) return;
    const amount = parseFloat(payAmount);
    if (amount <= 0) {
      addToast("Please enter a valid payment amount.", "warning");
      return;
    }
    paySupplier(currentPayTarget.id, amount, {
      date: payDate,
      paymentMethod: payMethod,
      reference: payRef,
      notes: payNotes
    });
    setPayAmount("");
    setPayingSupplier(null);
    setShowPayModal(false);
  };

  const handleExportLedger = (sup) => {
    const targetPurchases = purchases.filter((p) => p.supplierId === sup.id);
    const headers = ["PO Number", "Order Date", "Delivery Status", "Total Amount (Rs)"];
    const rows = targetPurchases.map((po) => [
      po.poNumber,
      formatDate(po.date),
      po.status,
      (po.totalAmount || po.total || 0).toFixed(2)
    ]);
    exportToExcel(
      `Supplier Procurement Ledger - ${sup.name}`,
      headers,
      rows,
      `Supplier_Ledger_${sup.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xls`,
      { Company: sup.company, Contact: sup.contact, Balance: formatCurrency(sup.balance) }
    );
  };

  const handleExportAllSuppliers = () => {
    const headers = ["Supplier ID", "Supplier Name", "Company", "Contact", "Address", "Outstanding Balance (Rs)"];
    const rows = filteredSuppliers.map((s) => [
      s.id,
      s.name,
      s.company,
      s.contact,
      s.address || "N/A",
      (s.balance || 0).toFixed(2)
    ]);
    exportToExcel(
      "Suppliers Directory & Ledgers Summary",
      headers,
      rows,
      `Suppliers_Directory_${new Date().toISOString().split("T")[0]}.xls`
    );
  };

  const handleExportLedgerPDF = (sup) => {
    if (!sup) return;
    const targetPurchases = purchases.filter((p) => p.supplierId === sup.id);
    const headers = ["PO Number", "Order Date", "Delivery Status", "Total Amount"];
    const rows = targetPurchases.map((po) => [
      po.poNumber || po.id,
      formatDate(po.date),
      po.status || "Received",
      formatCurrency(po.totalAmount || po.total || 0)
    ]);
    exportTableToPDF(
      `Supplier Procurement Ledger - ${sup.name}`,
      headers,
      rows,
      `Supplier_Ledger_${sup.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
      {
        Company: sup.company,
        Contact: sup.contact,
        "Current Balance": formatCurrency(sup.balance),
        "Total Orders": targetPurchases.length
      },
      currentBranch
    );
  };

  const handleExportAllSuppliersPDF = () => {
    const headers = ["Supplier ID", "Supplier Name", "Company", "Contact", "Address", "Outstanding Balance"];
    const rows = filteredSuppliers.map((s) => [
      s.id,
      s.name,
      s.company,
      s.contact,
      s.address || "N/A",
      formatCurrency(s.balance || 0)
    ]);
    exportTableToPDF(
      "Suppliers Directory & Ledgers Summary",
      headers,
      rows,
      `Suppliers_Directory_${new Date().toISOString().split("T")[0]}.pdf`,
      { "Total Suppliers": filteredSuppliers.length },
      currentBranch
    );
  };

  return (
    <div className="space-y-6">
      {/* If drilling down in supplier details */}
      {activeSupplier ? (
        <div className="space-y-6 print-area print-ledger">
          {/* Universal Official Boxy Print Header */}
          <PrintHeader
            title="SUPPLIER ACCOUNT STATEMENT & PROCUREMENT LEDGER"
            subtitle={`Distributor: ${activeSupplier.name} (${activeSupplier.company})`}
            branch={currentBranch}
            user={currentUser}
            metadata={{
              "Supplier Name": activeSupplier.name,
              "Company": activeSupplier.company,
              "Contact": activeSupplier.contact,
              "Balance Due": formatCurrency(activeSupplier.balance)
            }}
          />

          {/* Header breadcrumb (Web only) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedSupplierId(null)}
                className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 transition-colors cursor-pointer shadow-2xs no-print"
              >
                <IoArrowBackOutline className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{activeSupplier.name}</h1>
                <p className="text-sm text-slate-500 font-semibold mt-0.5">Supplier Profile & Procurement Ledger</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 no-print">
              <PrintExportActions
                onDirectPrint={() => window.print()}
                onPdf={() => handleExportLedgerPDF(activeSupplier)}
                onExcel={() => handleExportLedger(activeSupplier)}
                printLabel="Direct Print"
                pdfLabel="PDF"
                excelLabel="Excel Export"
                size="sm"
              />
              <button
                type="button"
                onClick={() => handleEditSupplier(activeSupplier)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-250"
              >
                <IoCreateOutline className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setSupplierToDelete(activeSupplier)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-250 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <IoTrashOutline className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Supplier Info & Ledger Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Supplier Profile</h3>
              <div className="space-y-3.5 text-sm text-slate-700">
                <div>
                  <span className="text-xs font-bold block text-slate-500 uppercase tracking-wider">Company:</span>
                  <span className="text-slate-900 font-bold mt-0.5 block">{activeSupplier.company}</span>
                </div>
                <div>
                  <span className="text-xs font-bold block text-slate-500 uppercase tracking-wider">Contact:</span>
                  <span className="text-slate-900 font-bold mt-0.5 block">{activeSupplier.contact}</span>
                </div>
                <div>
                  <span className="text-xs font-bold block text-slate-500 uppercase tracking-wider">Address:</span>
                  <span className="text-slate-800 font-semibold mt-0.5 block leading-relaxed">{activeSupplier.address}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Outstanding Balance Due</h3>
                <h2 className={`text-3xl font-black mt-3 font-mono tracking-tight ${activeSupplier.balance > 0 ? "text-rose-700" : "text-slate-900"}`}>
                  {formatCurrency(activeSupplier.balance)}
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 font-medium leading-normal bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg w-fit">
                  Outstanding credit statement for procured medicine batches
                </p>
              </div>

              {currentUser.role !== "Pharmacist" && (
                <button
                  type="button"
                  onClick={() => handleOpenPay(activeSupplier)}
                  className="w-full mt-4 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-black shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <IoCardOutline className="w-4.5 h-4.5" />
                  <span>Record Supplier Payment</span>
                </button>
              )}
            </div>
          </div>

          {/* Supplier Purchase Orders ledger */}
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Procurement Invoices History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="py-3.5 px-4">PO Number</th>
                    <th className="py-3.5 px-4">Order Date</th>
                    <th className="py-3.5 px-4">Delivery Status</th>
                    <th className="py-3.5 px-4 text-right">Invoice Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {supplierPurchases.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-10 text-center text-slate-400 font-semibold">
                        No purchase records logged for this supplier.
                      </td>
                    </tr>
                  ) : (
                    supplierPurchases.map((po) => (
                      <tr key={po.poNumber} className="hover:bg-slate-50/60 transition-colors animate-fade-in">
                        <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">{po.poNumber}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDate(po.date)}</td>
                        <td className="py-3.5 px-4">
                          <Badge
                            type={
                              po.status === "Received"
                                ? "success"
                                : po.status === "Partially Received"
                                ? "warning"
                                : "info"
                            }
                          >
                            {po.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono">
                          {formatCurrency(po.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <PrintFooter note="Official Supplier Procurement & Payment Ledger • PharmaCare ERP" />
        </div>
      ) : (
        /* Grid list of Suppliers */
        <div className="space-y-6 print-area">
          {/* Universal Official Boxy Print Header */}
          <PrintHeader
            title="SUPPLIERS DIRECTORY & ACCOUNTS PAYABLE LEDGER"
            subtitle="Registered Medicine Distributors & Credit Balances"
            branch={currentBranch}
            user={currentUser}
            metadata={{
              "Total Suppliers": filteredSuppliers.length,
              "Total Payable": formatCurrency(filteredSuppliers.reduce((acc, s) => acc + (s.balance || 0), 0))
            }}
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Suppliers Directory & Ledgers</h1>
              <p className="text-sm text-slate-500 font-semibold mt-0.5">Manage manufacturing distributors, credit dues, and supplier payments</p>
            <div className="flex flex-wrap items-center gap-2 no-print">
              <PrintExportActions
                onDirectPrint={() => window.print()}
                onPdf={handleExportAllSuppliersPDF}
                onExcel={handleExportAllSuppliers}
                printLabel="Direct Print"
                pdfLabel="PDF"
                excelLabel="Excel Export"
                size="sm"
              />
              {currentUser.role !== "Pharmacist" && (
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setFormData({ name: "", contact: "", company: "", address: "", openingBalance: "0" });
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-[0.98] w-fit"
                >
                  <IoAddOutline className="w-4.5 h-4.5" />
                  <span>Register Supplier</span>
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm no-print">
            <div className="relative max-w-md">
              <IoSearchOutline className="absolute left-3.5 top-3.5 text-slate-400 w-4.5 h-4.5" />
              <input
                type="text"
                placeholder="Search supplier by Name, Company, Contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white rounded-xl text-xs font-bold outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Supplier Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-0 print:shadow-none print:rounded-none">
            <div className="overflow-x-auto print:border-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider bg-slate-100">
                    <th className="py-3.5 px-6">Supplier Info</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Address</th>
                    <th className="py-3.5 px-4 text-right">Balance Due</th>
                    <th className="py-3.5 px-6 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400 font-bold">
                        No suppliers found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors animate-fade-in">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 shadow-2xs">
                              <IoBusinessOutline className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{s.name}</div>
                              <div className="text-xs text-slate-500 font-semibold mt-0.5">{s.company || "General Distributor"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{s.contact || "N/A"}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-semibold truncate max-w-xs">{s.address || "N/A"}</td>
                        <td className={`py-3.5 px-4 text-right font-black text-sm font-mono ${s.balance > 0 ? "text-rose-700" : "text-slate-800"}`}>
                          {formatCurrency(s.balance)}
                        </td>
                        <td className="py-3.5 px-6 text-right no-print">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenPay(s)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-300 transition-all cursor-pointer shadow-2xs"
                              title="Record Payment"
                            >
                              <IoCardOutline className="w-3.5 h-3.5" />
                              <span>Pay</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditSupplier(s)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-250 rounded-lg transition-all cursor-pointer shadow-2xs"
                              title="Edit Supplier Profile"
                            >
                              <IoCreateOutline className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSupplierToDelete(s)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-250 rounded-lg transition-all cursor-pointer shadow-2xs"
                              title={`Delete ${s.name}`}
                            >
                              <IoTrashOutline className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedSupplierId(s.id)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                              title="View Ledger Statement"
                            >
                              <IoChevronForwardOutline className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <PrintFooter note="Official Suppliers Directory Record • PharmaCare ERP" />
        </div>
      )}

      {/* --- PAYMENT MODAL (RENDERED AT ROOT LEVEL SO PAY BUTTON WORKS ANYWHERE) --- */}
      <Modal
        isOpen={showPayModal}
        onClose={() => {
          setShowPayModal(false);
          setPayingSupplier(null);
        }}
        title={`Record Payment to ${currentPayTarget?.name || "Supplier"}`}
      >
        {currentPayTarget && (
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Current Outstanding Balance</span>
                <div className="font-extrabold text-rose-700 text-base mt-0.5 font-mono">
                  {formatCurrency(currentPayTarget.balance)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Company</span>
                <div className="font-bold text-slate-700 mt-0.5">{currentPayTarget.company}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  Payment Amount (Rs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-black outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  Payment Mode
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="Cash in Hand">Cash in Hand</option>
                  <option value="Bank Transfer / Online">Bank Transfer / Online</option>
                  <option value="Cheque Deposit">Cheque Deposit</option>
                  <option value="Main Safe Vault">Main Safe Vault</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  Ref / Cheque #
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-9921 / TR-8812"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Notes / Remarks
              </label>
              <input
                type="text"
                placeholder="e.g. Paid weekly bill clearing dues"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPayModal(false);
                  setPayingSupplier(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-black cursor-pointer shadow-md transition-all active:scale-[0.98]"
              >
                Confirm & Record Payment
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* --- REGISTER / EDIT SUPPLIER MODAL --- */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingSupplier(null);
        }}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : "Register Supplier Profile"}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Contact Person Name *
              </label>
              <input
                ref={nameInputRef}
                type="text"
                required
                placeholder="e.g. John Miller"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyDown={(e) => handleKeyDownNext(e, phoneInputRef)}
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Contact Phone *
              </label>
              <input
                ref={phoneInputRef}
                type="text"
                required
                placeholder="e.g. +92-300-1234567"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                onKeyDown={(e) => handleKeyDownNext(e, companyInputRef)}
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Company Name *
            </label>
            <input
              ref={companyInputRef}
              type="text"
              required
              placeholder="e.g. GSK / Sami Pharma"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              onKeyDown={(e) => handleKeyDownNext(e, addressInputRef)}
              className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Full Office Address
            </label>
            <input
              ref={addressInputRef}
              type="text"
              placeholder="e.g. Plot 45, Industrial Area, Karachi"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitButtonRef.current?.focus();
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setShowAddModal(false);
                setEditingSupplier(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              ref={submitButtonRef}
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-black cursor-pointer shadow-md transition-all active:scale-[0.98]"
            >
              {editingSupplier ? "Update Supplier" : "Register Supplier"}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- SLEEK DELETE CONFIRMATION MODAL --- */}
      <ConfirmModal
        isOpen={Boolean(supplierToDelete)}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={() => {
          if (supplierToDelete) {
            deleteSupplier(supplierToDelete.id);
            if (selectedSupplierId === supplierToDelete.id) {
              setSelectedSupplierId(null);
            }
            setSupplierToDelete(null);
          }
        }}
        title="Delete Supplier Profile"
        message={`Are you sure you want to permanently delete supplier "${supplierToDelete?.name}" (${supplierToDelete?.company || "Distributor"})? This will remove their ledger account from the system.`}
        confirmText="Yes, Delete Supplier"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};
