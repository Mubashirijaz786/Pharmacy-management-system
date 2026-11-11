import React, { useContext, useState, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { formatCurrency, formatDate } from "../utils/helpers";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import { PrintHeader } from "../components/common/PrintHeader";
import { PrintFooter } from "../components/common/PrintFooter";
import { PrintExportActions } from "../components/common/PrintExportActions";
import {
  IoAddOutline,
  IoSearchOutline,
  IoPersonOutline,
  IoCashOutline,
  IoChevronForwardOutline,
  IoArrowBackOutline,
  IoDownloadOutline,
  IoPrintOutline
} from "react-icons/io5";

export const Customers = () => {
  const {
    customers,
    addCustomer,
    collectCustomerPayment,
    sales,
    currentUser,
    currentBranch,
    exportToCSV,
    exportToExcel,
    exportTableToPDF,
    addToast
  } = useContext(AppContext);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null); // Active customer details drilldown
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // Collect Payment Form state
  const [payAmount, setPayAmount] = useState("");

  // Customer Form state
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    creditLimit: "300"
  });

  // Filter Logic
  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contact.includes(searchQuery)
    );
  }, [customers, searchQuery]);

  // Selected customer details
  const activeCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Invoices of selected customer
  const customerSales = useMemo(() => {
    if (!activeCustomer) return [];
    return sales.filter((s) => s.customerId === activeCustomer.id);
  }, [sales, activeCustomer]);

  // Handlers
  const handleAddSubmit = (e) => {
    e.preventDefault();
    addCustomer(formData);
    setFormData({ name: "", contact: "", creditLimit: "300" });
    setShowAddModal(false);
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    if (!activeCustomer || !payAmount) return;
    const amount = parseFloat(payAmount);
    if (amount <= 0) return;
    if (amount > activeCustomer.balance) {
      addToast("Payment amount exceeds outstanding ledger balance!", "warning");
      return;
    }
    collectCustomerPayment(activeCustomer.id, amount);
    setPayAmount("");
    setShowPayModal(false);
  };

  const handleExportCustomerLedger = (cust) => {
    const custInvoices = sales.filter((s) => s.customerId === cust.id);
    const headers = ["Invoice No", "Date", "Payment Method", "Status", "Total Amount (Rs)"];
    const rows = custInvoices.map((s) => [
      s.invoiceNo,
      formatDate(s.date),
      s.paymentMethod,
      s.paymentStatus || (s.paymentMethod === "Credit" ? "Unpaid Due" : "Paid"),
      (s.total || 0).toFixed(2)
    ]);
    exportToExcel(
      `Customer Ledger Statement - ${cust.name}`,
      headers,
      rows,
      `Customer_Ledger_${cust.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xls`,
      { Phone: cust.contact, Balance: formatCurrency(cust.balance), Loyalty: `${cust.loyaltyPoints} Points` }
    );
  };

  const handleExportAllCustomers = () => {
    const headers = ["Account ID", "Customer Name", "Phone", "Loyalty Points", "Credit Limit (Rs)", "Outstanding Balance (Rs)"];
    const rows = filteredCustomers.map((c) => [
      c.id,
      c.name,
      c.contact,
      c.loyaltyPoints,
      (c.creditLimit || 0).toFixed(2),
      (c.balance || 0).toFixed(2)
    ]);
    exportToExcel(
      "Customers Directory & Credit Ledgers",
      headers,
      rows,
      `Customers_Directory_${new Date().toISOString().split("T")[0]}.xls`
    );
  };

  const handleExportCustomerLedgerPDF = (cust) => {
    if (!cust) return;
    const custInvoices = sales.filter((s) => s.customerId === cust.id);
    const headers = ["Invoice No", "Date", "Payment Method", "Status", "Total Amount"];
    const rows = custInvoices.map((s) => [
      s.invoiceNo || s.invoiceNumber || s.id,
      formatDate(s.date),
      s.paymentMethod || "Cash",
      s.paymentStatus || (s.paymentMethod === "Credit" ? "Unpaid Due" : "Paid"),
      formatCurrency(s.total || 0)
    ]);
    exportTableToPDF(
      `Customer Ledger Statement - ${cust.name}`,
      headers,
      rows,
      `Customer_Ledger_${cust.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
      {
        Phone: cust.contact,
        "Current Balance": formatCurrency(cust.balance),
        "Loyalty Points": `${cust.loyaltyPoints} Points`,
        "Total Orders": custInvoices.length
      },
      currentBranch
    );
  };

  const handleExportAllCustomersPDF = () => {
    const headers = ["Account ID", "Customer Name", "Phone", "Loyalty Points", "Credit Limit", "Outstanding Balance"];
    const rows = filteredCustomers.map((c) => [
      c.id,
      c.name,
      c.contact,
      c.loyaltyPoints,
      formatCurrency(c.creditLimit || 0),
      formatCurrency(c.balance || 0)
    ]);
    exportTableToPDF(
      "Customers Directory & Credit Ledgers",
      headers,
      rows,
      `Customers_Directory_${new Date().toISOString().split("T")[0]}.pdf`,
      { "Total Accounts": filteredCustomers.length },
      currentBranch
    );
  };

  return (
    <div className="space-y-6">
      {/* If drilling down in customer details */}
      {activeCustomer ? (
        <div className="space-y-6 print-area print-ledger">
          {/* Universal Official Boxy Print Header */}
          <PrintHeader
            title="CUSTOMER ACCOUNT STATEMENT & SALES LEDGER"
            subtitle={`Customer: ${activeCustomer.name} (Account: ${activeCustomer.id})`}
            branch={currentBranch}
            user={currentUser}
            metadata={{
              "Customer": activeCustomer.name,
              "Phone": activeCustomer.contact,
              "Credit Due": formatCurrency(activeCustomer.balance),
              "Loyalty Balance": `${activeCustomer.loyaltyPoints || 0} pts`
            }}
          />

          {/* Header breadcrumb (Web only) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 transition-colors cursor-pointer shadow-2xs no-print"
              >
                <IoArrowBackOutline className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{activeCustomer.name}</h1>
                <p className="text-sm text-slate-655 font-semibold mt-0.5">Customer Credit Account & Profile Statement</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 no-print">
              <PrintExportActions
                onDirectPrint={() => window.print()}
                onPdf={() => handleExportCustomerLedgerPDF(activeCustomer)}
                onExcel={() => handleExportCustomerLedger(activeCustomer)}
                printLabel="Direct Print"
                pdfLabel="PDF"
                excelLabel="Excel Export"
                size="sm"
              />
            </div>
          </div>

          {/* Customer Info & Credit Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Customer Profile</h3>
              <div className="space-y-3.5 text-sm text-slate-700">
                <div>
                  <span className="text-xs font-bold block text-slate-500 uppercase tracking-wider">Account ID:</span>
                  <span className="text-slate-900 font-extrabold font-mono mt-0.5 block">{activeCustomer.id}</span>
                </div>
                <div>
                  <span className="text-xs font-bold block text-slate-500 uppercase tracking-wider">Contact Number:</span>
                  <span className="text-slate-900 font-bold mt-0.5 block">{activeCustomer.contact}</span>
                </div>
                <div>
                  <span className="text-xs font-bold block text-slate-500 uppercase tracking-wider">Loyalty Balance:</span>
                  <span className="inline-block mt-1 px-3 py-1 bg-emerald-50 border border-emerald-250 text-emerald-800 font-extrabold text-sm rounded-lg shadow-2xs">
                    {activeCustomer.loyaltyPoints} Points
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Outstanding Balance Due</h3>
                <h2 className={`text-3xl font-black mt-3 tracking-tight ${activeCustomer.balance > 0 ? "text-rose-700" : "text-slate-900"}`}>
                  {formatCurrency(activeCustomer.balance)}
                </h2>
                <div className="text-xs text-slate-500 font-semibold mt-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg w-fit">
                  Credit Limit: <span className="font-bold text-slate-800">{formatCurrency(activeCustomer.creditLimit)}</span>
                </div>
              </div>

              {currentUser.role !== "Pharmacist" && activeCustomer.balance > 0 && (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="w-full mt-4 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <IoCashOutline className="w-4.5 h-4.5 text-white" />
                  <span>Collect Outstanding Cash</span>
                </button>
              )}
            </div>
          </div>

          {/* Customer Purchases History */}
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Purchase Invoices History</h3>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">History of invoices processed for this customer</p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                    <th className="py-3.5 px-4">Invoice No</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4 text-right">Invoice Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {customerSales.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-slate-500 font-bold">
                        No purchase invoices found for this customer.
                      </td>
                    </tr>
                  ) : (
                    customerSales.map((sale) => (
                      <tr key={sale.invoiceNo} className="hover:bg-slate-50/60 transition-colors animate-fade-in">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{sale.invoiceNo}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDate(sale.date)}</td>
                        <td className="py-3.5 px-4">
                          <Badge type={sale.paymentMethod === "Credit" ? "warning" : "success"}>
                            {sale.paymentMethod}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">
                          {formatCurrency(sale.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- COLLECT PAYMENT MODAL --- */}
          <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Collect Credit Payment">
            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                  Collection Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={activeCustomer.balance}
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Maximum collection allowed: {formatCurrency(activeCustomer.balance)}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Record Collection
                </button>
              </div>
            </form>
          </Modal>
          <PrintFooter note="Official Customer Credit Account Statement • PharmaCare ERP" />
        </div>
      ) : (
        /* Customers directory view */
        <div className="space-y-6 print-area">
          {/* Universal Official Boxy Print Header */}
          <PrintHeader
            title="CUSTOMERS DIRECTORY & RECEIVABLES LEDGER"
            subtitle="Registered Patient Accounts & Outstanding Credit Balances"
            branch={currentBranch}
            user={currentUser}
            metadata={{
              "Total Customers": filteredCustomers.length,
              "Total Outstanding": formatCurrency(filteredCustomers.reduce((acc, c) => acc + (c.balance || 0), 0))
            }}
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customers Ledger</h1>
              <p className="text-sm text-slate-650 font-semibold mt-0.5">Manage customer accounts, credits, and loyalty logs</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 no-print">
              <PrintExportActions
                onDirectPrint={() => window.print()}
                onPdf={handleExportAllCustomersPDF}
                onExcel={handleExportAllCustomers}
                printLabel="Direct Print"
                pdfLabel="PDF"
                excelLabel="Excel Export"
                size="sm"
              />
              {currentUser.role !== "Pharmacist" && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 cursor-pointer transition-all active:scale-[0.98] w-fit"
                >
                  <IoAddOutline className="w-4.5 h-4.5" />
                  <span>Register Customer</span>
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
                placeholder="Search customers by Name, Phone, Account ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-350 focus:bg-white rounded-xl text-xs font-bold outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Customers Directory Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-0 print:shadow-none print:rounded-none">
            <div className="overflow-x-auto print:border-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                    <th className="py-3.5 px-6">Customer Info</th>
                    <th className="py-3.5 px-4">Contact Phone</th>
                    <th className="py-3.5 px-4 text-center">Loyalty Balance</th>
                    <th className="py-3.5 px-4 text-right">Credit Balance</th>
                    <th className="py-3.5 px-6 text-right no-print">Ledger Statement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-500 font-bold">
                        No customers found.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors animate-fade-in">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-550 flex-shrink-0 shadow-2xs">
                              <IoPersonOutline className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{c.name}</div>
                              <div className="text-xs text-slate-500 font-semibold mt-0.5">ID: {c.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{c.contact}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-lg shadow-2xs">
                            {c.loyaltyPoints} pts
                          </span>
                        </td>
                        <td className={`py-3.5 px-4 text-right font-black text-sm ${c.balance > 0 ? "text-rose-700 bg-rose-50/10" : "text-slate-800"}`}>
                          {formatCurrency(c.balance)}
                        </td>
                        <td className="py-3.5 px-6 text-right no-print">
                          <button
                            onClick={() => setSelectedCustomerId(c.id)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-105 border border-transparent hover:border-slate-250 rounded-xl transition-all cursor-pointer shadow-2xs"
                          >
                            <IoChevronForwardOutline className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <PrintFooter note="Official Customers Directory Record • PharmaCare ERP" />

          {/* --- REGISTER CUSTOMER MODAL --- */}
          <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register Customer">
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alice Johnson"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +1-555-0909"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                    Credit Limit ($)
                  </label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Register Customer
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </div>
  );
};
