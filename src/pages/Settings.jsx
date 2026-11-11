import React, { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import {
  IoSettingsOutline,
  IoLocationOutline,
  IoSaveOutline,
  IoAddOutline,
  IoTrashOutline,
  IoCreateOutline,
  IoMedicalOutline,
  IoCubeOutline,
  IoGridOutline,
  IoCardOutline,
  IoReceiptOutline,
  IoRefreshOutline,
  IoCheckmarkCircleOutline,
  IoPrintOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoSearchOutline,
  IoStorefrontOutline,
  IoDocumentTextOutline
} from "react-icons/io5";

export const Settings = () => {
  const {
    branches,
    addBranch,
    updateBranch,
    deleteBranch,
    taxRate,
    setTaxRate,
    invoiceFormat,
    setInvoiceFormat,
    addToast,
    masterData,
    addMasterItem,
    removeMasterItem,
    resetMasterData,
    resetEntireDatabase
  } = useContext(AppContext);

  // Tax Input State
  const [taxInput, setTaxInput] = useState((taxRate * 100).toString());

  // Confirm Modals State
  const [showResetDbModal, setShowResetDbModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);

  // Branch Modal State
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    isHeadquarters: false
  });

  // Dynamic Master Sections & Search State
  const [activeMasterKey, setActiveMasterKey] = useState("brands");
  const [sectionInputs, setSectionInputs] = useState({});
  const [sectionSearches, setSectionSearches] = useState({});

  const masterSections = [
    { key: "brands", label: "Pharma Brands & Companies", icon: <IoStorefrontOutline className="w-4 h-4" />, placeholder: "e.g. GSK, Abbott, Getz Pharma, Searle..." },
    { key: "categories", label: "Medicine Categories", icon: <IoMedicalOutline className="w-4 h-4" />, placeholder: "e.g. Inhalation Spray, Drops, Syrup..." },
    { key: "subCategories", label: "Sub-Categories", icon: <IoGridOutline className="w-4 h-4" />, placeholder: "e.g. Antihistamine, Antiviral, Analgesic..." },
    { key: "productGroups", label: "Product Groups", icon: <IoCubeOutline className="w-4 h-4" />, placeholder: "e.g. Oncology, Critical Care, Antibacterial..." },
    { key: "uoms", label: "Units of Measure (UOM)", icon: <IoCubeOutline className="w-4 h-4" />, placeholder: "e.g. Vial, Ampoule, Strip, Jar..." },
    { key: "drugTypes", label: "Drug Classifications", icon: <IoSettingsOutline className="w-4 h-4" />, placeholder: "e.g. Restricted / Narcotic, Prescription-Only..." },
    { key: "shelfCoordinates", label: "Shelf & Racks", icon: <IoLocationOutline className="w-4 h-4" />, placeholder: "e.g. Rack C - Shelf 4, Cold Storage 1..." },
    { key: "paymentMethods", label: "Payment Modes", icon: <IoCardOutline className="w-4 h-4" />, placeholder: "e.g. EasyPaisa, JazzCash, Store Credit / Ledger, Card..." },
    { key: "expenseCategories", label: "Expense Types", icon: <IoReceiptOutline className="w-4 h-4" />, placeholder: "e.g. Delivery & Courier, Generator Fuel, Packaging..." }
  ];

  const handleSaveTax = (e) => {
    e.preventDefault();
    const rate = parseFloat(taxInput);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      addToast("Please enter a valid tax percentage between 0 and 100.", "warning");
      return;
    }
    setTaxRate(rate / 100);
    addToast(`Global tax rate updated to ${rate}%`);
  };

  const handleAddMasterItemForSection = (e, key) => {
    e.preventDefault();
    const val = (sectionInputs[key] || "").trim();
    if (!val) return;
    const success = addMasterItem(key, val);
    if (success) {
      setSectionInputs((prev) => ({ ...prev, [key]: "" }));
    }
  };

  // Branch Operations Handlers
  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      name: "",
      code: "",
      address: "",
      phone: "",
      isHeadquarters: false
    });
    setShowBranchModal(true);
  };

  const handleOpenEditBranch = (b) => {
    setEditingBranch(b);
    setBranchForm({
      name: b.name || "",
      code: b.code || "",
      address: b.address || "",
      phone: b.phone || "",
      isHeadquarters: Boolean(b.isHeadquarters)
    });
    setShowBranchModal(true);
  };

  const handleSaveBranch = (e) => {
    e.preventDefault();
    if (!branchForm.name.trim()) {
      addToast("Please provide a valid Branch Name.", "warning");
      return;
    }

    if (editingBranch) {
      updateBranch({
        ...editingBranch,
        name: branchForm.name.trim(),
        code: branchForm.code.trim().toUpperCase() || editingBranch.code,
        address: branchForm.address.trim(),
        phone: branchForm.phone.trim(),
        isHeadquarters: branchForm.isHeadquarters
      });
    } else {
      addBranch({
        name: branchForm.name.trim(),
        code: branchForm.code.trim().toUpperCase(),
        address: branchForm.address.trim(),
        phone: branchForm.phone.trim(),
        isHeadquarters: branchForm.isHeadquarters
      });
    }
    setShowBranchModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight">
            System & Master Settings
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Configure branches, receipt print formats, taxes, and master data dropdowns
          </p>
        </div>

        <button
          onClick={resetMasterData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-xs font-bold transition-colors cursor-pointer"
        >
          <IoRefreshOutline className="w-4 h-4 text-slate-500" />
          <span>Reset Dropdown Defaults</span>
        </button>
      </div>

      {/* Grid Row 1: Print Formats & Tax Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Receipt & Invoice Format */}
        <div className="lg:col-span-2 bg-white p-4 border border-slate-300 rounded-xl shadow-2xs space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Default Receipt & Invoice Format</h3>
            <p className="text-[11px] text-slate-500 font-medium">Select POS print style for sales receipts</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
            {/* Thermal POS Receipt */}
            <div
              onClick={() => setInvoiceFormat("thermal")}
              className={`p-3 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-between ${
                invoiceFormat === "thermal"
                  ? "border-emerald-600 bg-emerald-50/50 shadow-2xs"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-md ${invoiceFormat === "thermal" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                  <IoReceiptOutline className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-xs text-slate-900">Thermal POS Receipt (80mm)</div>
                  <div className="text-[11px] text-slate-500 font-medium">Fast roll receipt for retail counters</div>
                </div>
              </div>
              {invoiceFormat === "thermal" && (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  <IoCheckmarkCircleOutline className="w-3.5 h-3.5" />
                  Active
                </span>
              )}
            </div>

            {/* A4 Full Page Invoice */}
            <div
              onClick={() => setInvoiceFormat("a4")}
              className={`p-3 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-between ${
                invoiceFormat === "a4"
                  ? "border-emerald-600 bg-emerald-50/50 shadow-2xs"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-md ${invoiceFormat === "a4" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                  <IoDocumentTextOutline className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-xs text-slate-900">Full Page Invoice (A4)</div>
                  <div className="text-[11px] text-slate-500 font-medium">Standard letterhead sheet format</div>
                </div>
              </div>
              {invoiceFormat === "a4" && (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  <IoCheckmarkCircleOutline className="w-3.5 h-3.5" />
                  Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tax Configuration */}
        <div className="bg-white p-4 border border-slate-300 rounded-xl shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Tax Configuration</h3>
            <p className="text-[11px] text-slate-500 font-medium">Default sales GST / VAT percentage</p>
          </div>

          <form onSubmit={handleSaveTax} className="space-y-2 pt-0.5">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
              Default GST / VAT (%)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 5"
                value={taxInput}
                onChange={(e) => setTaxInput(e.target.value)}
                className="flex-grow bg-white border border-slate-300 focus:border-slate-800 rounded-md px-3 py-1.5 text-xs font-black text-slate-900 outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold cursor-pointer transition-all shadow-2xs"
              >
                <IoSaveOutline className="w-4 h-4 text-emerald-400" />
                <span>Save</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Grid Row 2: Pharmacy Store Branches */}
      <div className="bg-white p-4 border border-slate-300 rounded-xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Pharmacy Store Locations & Branches</h3>
            <p className="text-[11px] text-slate-500 font-medium">Manage retail counters, hospital pharmacies, and warehouse locations</p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddBranch}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <IoAddOutline className="w-4 h-4" />
            <span>Add New Branch</span>
          </button>
        </div>

        {/* Clean Boxy Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                <th className="py-2 px-3 w-16 text-center">Code</th>
                <th className="py-2 px-3 min-w-[180px]">Branch Name</th>
                <th className="py-2 px-3 min-w-[220px]">Physical Address</th>
                <th className="py-2 px-3 min-w-[140px]">Phone</th>
                <th className="py-2 px-3 text-center w-24">Status</th>
                <th className="py-2 px-3 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">{b.code || "BR"}</td>
                  <td className="py-2 px-3 font-bold text-slate-900">
                    <span className="flex items-center gap-1.5">
                      {b.name}
                      {b.isHeadquarters && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black">
                          HQ
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-600 font-medium">{b.address || "-"}</td>
                  <td className="py-2 px-3 font-mono text-slate-600">{b.phone || "-"}</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      <IoCheckmarkCircleOutline className="w-3 h-3" />
                      Active
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBranch(b)}
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        title="Edit Branch"
                      >
                        <IoCreateOutline className="w-4 h-4" />
                      </button>
                      {!b.isHeadquarters && branches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBranchToDelete(b)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Delete Branch"
                        >
                          <IoTrashOutline className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid Row 3: Dynamic Master Dropdown Manager */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-2xs overflow-hidden p-4 space-y-3">
        <div className="border-b border-slate-200 pb-2">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Master Data & Dropdown Values
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            Select a category to view, add, or remove custom options shown across inventory and billing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 items-start">
          {/* Left Category Selector Pills */}
          <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            {masterSections.map((sec) => {
              const count = (masterData[sec.key] || []).length;
              const isSelected = sec.key === activeMasterKey;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => setActiveMasterKey(sec.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-2xs font-extrabold"
                      : "text-slate-700 hover:bg-slate-200/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={isSelected ? "text-emerald-400" : "text-slate-500"}>{sec.icon}</span>
                    <span>{sec.label}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? "bg-slate-800 text-emerald-400" : "bg-white text-slate-700 border border-slate-200"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Active Category Items Panel */}
          {(() => {
            const activeSec = masterSections.find((s) => s.key === activeMasterKey) || masterSections[0];
            const allItems = masterData[activeSec.key] || [];
            const searchKeyword = (sectionSearches[activeSec.key] || "").toLowerCase();
            const filteredItems = searchKeyword
              ? allItems.filter((it) => it.toLowerCase().includes(searchKeyword))
              : allItems;

            return (
              <div className="md:col-span-2 bg-slate-50/50 border border-slate-200 rounded-lg p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600">{activeSec.icon}</span>
                    <h3 className="text-xs font-black text-slate-900">{activeSec.label}</h3>
                    <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-white text-slate-700 border border-slate-200">
                      {allItems.length} options
                    </span>
                  </div>
                </div>

                {/* Add new item form & search filter */}
                <form
                  onSubmit={(e) => handleAddMasterItemForSection(e, activeSec.key)}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder={activeSec.placeholder}
                    value={sectionInputs[activeSec.key] || ""}
                    onChange={(e) =>
                      setSectionInputs((prev) => ({ ...prev, [activeSec.key]: e.target.value }))
                    }
                    className="flex-grow bg-white border border-slate-300 focus:border-slate-800 rounded-md px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1"
                  >
                    <IoAddOutline className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </form>

                {allItems.length > 6 && (
                  <div className="relative">
                    <IoSearchOutline className="absolute left-2.5 top-2 text-slate-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder={`Search in ${activeSec.label}...`}
                      value={sectionSearches[activeSec.key] || ""}
                      onChange={(e) =>
                        setSectionSearches((prev) => ({ ...prev, [activeSec.key]: e.target.value }))
                      }
                      className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 focus:border-slate-800 rounded-md text-[11px] font-semibold outline-none"
                    />
                  </div>
                )}

                {/* Boxy Chips Grid */}
                <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1 pt-1">
                  {filteredItems.length === 0 ? (
                    <div className="text-slate-400 text-xs italic py-2">
                      {searchKeyword ? "No items match your search filter." : "No items added yet. Type above to add one."}
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-1.5 bg-white border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-800 shadow-2xs"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => removeMasterItem(activeSec.key, item)}
                          title={`Remove "${item}"`}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                        >
                          <IoTrashOutline className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-50/40 border border-rose-300 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
            <IoTrashOutline className="w-4 h-4 text-rose-600" />
            Wipe Testing Data / Reset Entire Database
          </h2>
          <p className="text-[11px] text-rose-700 font-medium mt-0.5">
            Permanently purges mock sales, purchase records, ledger balances, and inventory batches to start fresh.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowResetDbModal(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold shadow-2xs cursor-pointer transition-all whitespace-nowrap flex items-center justify-center gap-1.5 self-start sm:self-auto"
        >
          <IoTrashOutline className="w-4 h-4" />
          <span>Wipe All Data</span>
        </button>
      </div>

      {/* --- ADD / EDIT BRANCH MODAL --- */}
      <Modal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        title={editingBranch ? "Edit Pharmacy Branch" : "Add New Pharmacy Branch"}
        size="md"
      >
        <form onSubmit={handleSaveBranch} className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">Branch Name</label>
              <input
                type="text"
                required
                placeholder="e.g. North City Branch"
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                className="w-full bg-white border border-slate-300 focus:border-slate-800 rounded-md px-3 py-2 text-xs font-bold text-slate-900 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">Code</label>
              <input
                type="text"
                placeholder="e.g. NOR"
                maxLength={4}
                value={branchForm.code}
                onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                className="w-full bg-white border border-slate-300 focus:border-slate-800 rounded-md px-3 py-2 text-xs font-bold text-slate-900 outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">Physical Address</label>
            <input
              type="text"
              placeholder="e.g. Plot 45, Sector B, Commercial Center"
              value={branchForm.address}
              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
              className="w-full bg-white border border-slate-300 focus:border-slate-800 rounded-md px-3 py-2 text-xs font-bold text-slate-900 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">Phone Contact</label>
            <input
              type="text"
              placeholder="e.g. +92-300-1234567"
              value={branchForm.phone}
              onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
              className="w-full bg-white border border-slate-300 focus:border-slate-800 rounded-md px-3 py-2 text-xs font-bold text-slate-900 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isHeadquartersCheck"
              checked={branchForm.isHeadquarters}
              onChange={(e) => setBranchForm({ ...branchForm, isHeadquarters: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
            <label htmlFor="isHeadquartersCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
              Designate as Corporate Headquarters (Central Store)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowBranchModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              {editingBranch ? "Update Branch" : "Create Branch"}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- CONFIRM WIPE DATABASE MODAL --- */}
      <ConfirmModal
        isOpen={showResetDbModal}
        onClose={() => setShowResetDbModal(false)}
        onConfirm={resetEntireDatabase}
        title="Wipe Entire Testing Database"
        message="Are you sure you want to permanently clear all medicines, inventory batches, purchase orders, sales receipts, and supplier ledgers? This action will reset the system database fresh and cannot be undone."
        confirmText="Yes, Wipe Database"
        cancelText="Cancel"
        type="danger"
      />

      {/* --- CONFIRM DELETE BRANCH MODAL --- */}
      <ConfirmModal
        isOpen={Boolean(branchToDelete)}
        onClose={() => setBranchToDelete(null)}
        onConfirm={() => {
          if (branchToDelete) {
            deleteBranch(branchToDelete.id);
            setBranchToDelete(null);
          }
        }}
        title="Delete Pharmacy Branch"
        message={`Are you sure you want to delete branch "${branchToDelete?.name}" (${branchToDelete?.code})?`}
        confirmText="Yes, Delete Branch"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};
