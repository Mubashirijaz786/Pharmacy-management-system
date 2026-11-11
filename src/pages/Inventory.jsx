import React, { useContext, useState, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { formatDate, formatCurrency } from "../utils/helpers";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import { PrintHeader } from "../components/common/PrintHeader";
import { PrintFooter } from "../components/common/PrintFooter";
import { PrintExportActions } from "../components/common/PrintExportActions";
import {
  IoSwapHorizontalOutline,
  IoBuildOutline,
  IoWarningOutline,
  IoSearchOutline,
  IoChevronDownOutline,
  IoChevronForwardOutline,
  IoLayersOutline,
  IoLocationOutline,
  IoPricetagOutline
} from "react-icons/io5";

export const Inventory = () => {
  const {
    medicines,
    currentBranch,
    adjustStock,
    transferStock,
    currentUser,
    exportToCSV,
    exportToExcel,
    exportTableToPDF,
    addToast
  } = useContext(AppContext);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMeds, setExpandedMeds] = useState({});
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Adjust Form state
  const [adjustMedId, setAdjustMedId] = useState("");
  const [adjustBatchNum, setAdjustBatchNum] = useState("");
  const [newBatchNumber, setNewBatchNumber] = useState("");
  const [adjustType, setAdjustType] = useState("Add"); // Add or Deduct
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("Manual Correction");

  // Transfer Form state
  const [transMedId, setTransMedId] = useState("");
  const [transBatchNum, setTransBatchNum] = useState("");
  const [transToBranchId, setTransToBranchId] = useState("");
  const [transQty, setTransQty] = useState("");

  // Group inventory by Medicine for current branch
  const groupedInventory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return (medicines || [])
      .map((med) => {
        const branchBatches = (med.batches || []).filter(
          (b) => !b.branchId || b.branchId === currentBranch.id
        );

        const totalUnits = branchBatches.reduce(
          (acc, b) => acc + Number(b.qty ?? b.quantity ?? 0),
          0
        );

        const activeBatches = branchBatches.filter(
          (b) => Number(b.qty ?? b.quantity ?? 0) > 0
        );

        // Find nearest expiry
        const activeDates = activeBatches
          .filter((b) => b.expiryDate)
          .map((b) => new Date(b.expiryDate));
        const nearestExpiry =
          activeDates.length > 0
            ? new Date(Math.min(...activeDates)).toISOString().split("T")[0]
            : null;

        return {
          ...med,
          branchBatches,
          totalUnits,
          activeBatchesCount: activeBatches.length,
          nearestExpiry,
          conversionFactor: med.conversionFactor || 10
        };
      })
      .filter((med) => {
        if (!q) return true;
        const matchesMed =
          med.name.toLowerCase().includes(q) ||
          (med.genericName && med.genericName.toLowerCase().includes(q)) ||
          (med.brand && med.brand.toLowerCase().includes(q)) ||
          (med.category && med.category.toLowerCase().includes(q));

        const matchesBatch = med.branchBatches.some((b) =>
          (b.batchNumber || "").toLowerCase().includes(q)
        );

        return matchesMed || matchesBatch;
      });
  }, [medicines, currentBranch, searchQuery]);

  // Toggle accordion expand
  const toggleExpand = (medId) => {
    setExpandedMeds((prev) => ({
      ...prev,
      [medId]: !prev[medId]
    }));
  };

  const expandAll = () => {
    const all = {};
    groupedInventory.forEach((m) => {
      all[m.id] = true;
    });
    setExpandedMeds(all);
  };

  const collapseAll = () => {
    setExpandedMeds({});
  };

  // Dynamic status evaluation
  const getBatchExpiryStatus = (expiryDate, qty) => {
    if (qty === 0) return { label: "Depleted", type: "default" };
    const today = new Date();
    const exp = new Date(expiryDate);
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

    if (diff <= 0) return { label: "Expired", type: "danger" };
    if (diff <= 90) return { label: `Expiring (${diff}d)`, type: "warning" };
    return { label: "Active", type: "success" };
  };

  // Find batches for selected medicine in adjustment form
  const adjustFormBatches = useMemo(() => {
    if (!adjustMedId) return [];
    const med = medicines.find((m) => m.id === adjustMedId);
    return med ? med.batches.filter((b) => !b.branchId || b.branchId === currentBranch.id) : [];
  }, [adjustMedId, medicines, currentBranch]);

  // Find batches for selected medicine in transfer form
  const transferFormBatches = useMemo(() => {
    if (!transMedId) return [];
    const med = medicines.find((m) => m.id === transMedId);
    return med ? med.batches.filter((b) => !b.branchId || b.branchId === currentBranch.id) : [];
  }, [transMedId, medicines, currentBranch]);

  const maxTransferQty = useMemo(() => {
    if (!transMedId || !transBatchNum) return 0;
    const batch = transferFormBatches.find((b) => b.batchNumber === transBatchNum);
    return batch ? (batch.qty ?? batch.quantity ?? 0) : 0;
  }, [transMedId, transBatchNum, transferFormBatches]);

  // Quick Open Adjust for specific batch
  const handleQuickAdjustBatch = (medId, batchNum) => {
    setAdjustMedId(medId);
    setAdjustBatchNum(batchNum);
    setAdjustType("Add");
    setAdjustQty("");
    setAdjustReason("Stock Audit Adjustment");
    setShowAdjustModal(true);
  };

  // Submits
  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    const finalBatch = adjustBatchNum === "NEW-BATCH" ? newBatchNumber.trim() : adjustBatchNum;
    if (!adjustMedId || !finalBatch || !adjustQty) return;
    const delta = adjustType === "Add" ? parseInt(adjustQty) : -parseInt(adjustQty);
    adjustStock(adjustMedId, finalBatch, delta, adjustReason);

    // reset
    setAdjustMedId("");
    setAdjustBatchNum("");
    setNewBatchNumber("");
    setAdjustQty("");
    setShowAdjustModal(false);
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transMedId || !transBatchNum || !transToBranchId || !transQty) return;
    const qty = parseInt(transQty);
    if (qty > maxTransferQty) {
      addToast("Cannot transfer more stock than available!", "warning");
      return;
    }
    transferStock(transMedId, transBatchNum, currentBranch.id, transToBranchId, qty);

    setTransMedId("");
    setTransBatchNum("");
    setTransToBranchId("");
    setTransQty("");
    setShowTransferModal(false);
  };

  const handleExportExcel = () => {
    const headers = [
      "Medicine Name",
      "Brand",
      "Generic",
      "Category",
      "Batch Number",
      "Expiry Date",
      "Cost Price (Rs.)",
      "Sale Price (Rs.)",
      "Rack/Shelf",
      "Batch Qty (Units)"
    ];
    const rows = [];
    groupedInventory.forEach((med) => {
      med.branchBatches.forEach((b) => {
        rows.push([
          med.name,
          med.brand,
          med.genericName,
          med.category,
          b.batchNumber,
          formatDate(b.expiryDate),
          b.costPrice ?? med.costPrice ?? 0,
          b.sellingPrice ?? med.sellingPrice ?? 0,
          `${b.rack || "Rack A"} / ${b.shelf || "Shelf 1"}`,
          Number(b.qty ?? b.quantity ?? 0)
        ]);
      });
    });
    exportToExcel(
      `Inventory & Batches Report - ${currentBranch.name}`,
      headers,
      rows,
      `Inventory_Batches_Report_${currentBranch.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xls`,
      { Branch: currentBranch.name, "Total Unique Medicines": groupedInventory.length }
    );
  };

  const handleExportPDF = () => {
    const headers = [
      "Medicine",
      "Category",
      "Batch #",
      "Expiry",
      "Cost Price",
      "Sale Price",
      "Location",
      "Qty"
    ];
    const rows = [];
    groupedInventory.forEach((med) => {
      med.branchBatches.forEach((b) => {
        rows.push([
          med.name,
          med.category,
          b.batchNumber,
          formatDate(b.expiryDate),
          formatCurrency(b.costPrice ?? med.costPrice ?? 0),
          formatCurrency(b.sellingPrice ?? med.sellingPrice ?? 0),
          `${b.rack || "Rack A"} / ${b.shelf || "Shelf 1"}`,
          `${Number(b.qty ?? b.quantity ?? 0)} Units`
        ]);
      });
    });
    exportTableToPDF(
      `Inventory & Batches Report - ${currentBranch.name}`,
      headers,
      rows,
      `Inventory_Report_${currentBranch.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
      {
        Branch: currentBranch.name,
        "Total Unique Medicines": groupedInventory.length,
        "Total Batches Logged": rows.length
      },
      currentBranch
    );
  };

  return (
    <div className="space-y-6 print-area">
      {/* Universal Official Boxy Print Header */}
      <PrintHeader
        title="INVENTORY STOCK VALUATION & BATCHES LEDGER"
        subtitle={`Branch Warehouse: ${currentBranch.name}`}
        branch={currentBranch}
        user={currentUser}
        metadata={{
          "Total Items": groupedInventory.length,
          "Branch": currentBranch.name
        }}
      />

      {/* Header (Web only) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-sm text-slate-500 font-semibold mt-0.5">
            Grouped medicine catalog with nested batch tracking at {currentBranch.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          <PrintExportActions
            onDirectPrint={() => window.print()}
            onPdf={handleExportPDF}
            onExcel={handleExportExcel}
            printLabel="Direct Print"
            pdfLabel="PDF"
            excelLabel="Excel Export"
            size="sm"
          />
          {currentUser.role !== "Pharmacist" && (
            <>
              <button
                onClick={() => {
                  setAdjustMedId("");
                  setAdjustBatchNum("");
                  setShowAdjustModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-800 cursor-pointer shadow-2xs transition-all active:scale-[0.98]"
              >
                <IoBuildOutline className="w-4 h-4 text-indigo-600" />
                <span>Stock Adjustment</span>
              </button>
              <button
                onClick={() => setShowTransferModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-black cursor-pointer shadow-md transition-all active:scale-[0.98]"
              >
                <IoSwapHorizontalOutline className="w-4 h-4" />
                <span>Inter-Branch Transfer</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expiry overview alerts banner */}
      {groupedInventory.some((m) =>
        m.branchBatches.some((b) => {
          const status = getBatchExpiryStatus(b.expiryDate, Number(b.qty ?? b.quantity ?? 0));
          return status.label === "Expired" || status.label.startsWith("Expiring");
        })
      ) && (
        <div className="p-4 bg-amber-50 border border-amber-250 rounded-2xl flex items-start gap-3 shadow-2xs">
          <IoWarningOutline className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">Critical Stock Alert</h4>
            <p className="text-xs text-amber-900 font-semibold mt-1 leading-normal">
              Some medicine batches have expired or are expiring within 90 days. Expand medicine rows to inspect batch details.
            </p>
          </div>
        </div>
      )}

      {/* Search and Controls Bar */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <IoSearchOutline className="absolute left-3.5 top-3.5 text-slate-400 w-4.5 h-4.5" />
          <input
            type="text"
            placeholder="Search by Medicine, Generic, Brand, or Batch #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white rounded-xl text-xs font-bold outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Expand All Batches
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Main Grouped Medicine Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-0 print:shadow-none print:rounded-none">
        <div className="overflow-x-auto print:border-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider bg-slate-100">
                <th className="py-3.5 px-6 w-12"></th>
                <th className="py-3.5 px-4">Medicine Info</th>
                <th className="py-3.5 px-4">Brand</th>
                <th className="py-3.5 px-4 text-center">Active Batches</th>
                <th className="py-3.5 px-4 text-center">Nearest Expiry</th>
                <th className="py-3.5 px-4 text-center">Total Available Stock</th>
                <th className="py-3.5 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {groupedInventory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">
                    No medicine inventory records found matching your search.
                  </td>
                </tr>
              ) : (
                groupedInventory.map((med) => {
                  const isExpanded = !!expandedMeds[med.id];
                  const hasStock = med.totalUnits > 0;
                  const isLowStock = hasStock && med.totalUnits <= (med.reorderLevel || 20);

                  return (
                    <React.Fragment key={med.id}>
                      {/* Top-Level Medicine Row */}
                      <tr
                        onClick={() => toggleExpand(med.id)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer select-none ${
                          isExpanded ? "bg-slate-50/70 border-b-0" : ""
                        }`}
                      >
                        <td className="py-3.5 px-6 text-center">
                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                          >
                            {isExpanded ? (
                              <IoChevronDownOutline className="w-4 h-4 text-slate-800" />
                            ) : (
                              <IoChevronForwardOutline className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                              <span>{med.name}</span>
                              <span className="text-[11px] font-semibold text-slate-400">({med.category})</span>
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                              Gen: {med.genericName || "N/A"}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{med.brand}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-extrabold text-slate-700 font-mono">
                            <IoLayersOutline className="w-3.5 h-3.5 text-slate-500" />
                            {med.branchBatches.length} {med.branchBatches.length === 1 ? "Batch" : "Batches"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-600">
                          {med.nearestExpiry ? (
                            <span className="font-semibold text-slate-800">{formatDate(med.nearestExpiry)}</span>
                          ) : (
                            <span className="text-slate-400 italic">No Active Batches</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center justify-center bg-slate-50 border border-slate-300 px-3.5 py-1 rounded-xl shadow-2xs">
                            <span className="text-xs font-black text-slate-900 font-mono">
                              {med.totalUnits} Units
                            </span>
                            {med.conversionFactor > 1 && (
                              <span className="text-[10px] text-slate-500 font-extrabold font-mono mt-0.5">
                                {Math.floor(med.totalUnits / med.conversionFactor)} Pk
                                {med.totalUnits % med.conversionFactor > 0 && ` + ${med.totalUnits % med.conversionFactor} Tab`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <Badge type={!hasStock ? "danger" : isLowStock ? "warning" : "success"}>
                            {!hasStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                          </Badge>
                        </td>
                      </tr>

                      {/* Nested Batches Accordion Details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan="7" className="p-0 border-b border-slate-200">
                            <div className="p-4 pl-14 pr-6 bg-slate-100/40 border-y border-slate-200/80 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <IoLayersOutline className="w-4 h-4 text-slate-500" />
                                  Individual Batch Inventory for {med.name}
                                </span>
                                <span className="text-xs text-slate-500 font-semibold">
                                  Pack Size: 1 Pk = {med.conversionFactor} Units
                                </span>
                              </div>

                              {med.branchBatches.length === 0 ? (
                                <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs font-semibold text-slate-400">
                                  No specific batches registered yet for this medicine.
                                </div>
                              ) : (
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                                        <th className="py-2.5 px-4">Batch Number</th>
                                        <th className="py-2.5 px-4">Expiry Date</th>
                                        <th className="py-2.5 px-4 text-right">Cost Price (Rs.)</th>
                                        <th className="py-2.5 px-4 text-right">Sale Price (Rs.)</th>
                                        <th className="py-2.5 px-4 text-center">Rack / Shelf</th>
                                        <th className="py-2.5 px-4 text-center">Batch Stock</th>
                                        <th className="py-2.5 px-4 text-center">Batch Status</th>
                                        <th className="py-2.5 px-4 text-right">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {med.branchBatches.map((b, bIdx) => {
                                        const bQty = Number(b.qty ?? b.quantity ?? 0);
                                        const bStatus = getBatchExpiryStatus(b.expiryDate, bQty);
                                        const bCost = b.costPrice ?? med.costPrice ?? 0;
                                        const bSale = b.sellingPrice ?? med.sellingPrice ?? 0;

                                        return (
                                          <tr key={`${b.batchNumber}-${bIdx}`} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-2.5 px-4 font-mono font-black text-slate-900">
                                              {b.batchNumber}
                                            </td>
                                            <td className="py-2.5 px-4 font-semibold text-slate-700">
                                              {formatDate(b.expiryDate)}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700">
                                              {formatCurrency(bCost)}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-800">
                                              {formatCurrency(bSale)}
                                            </td>
                                            <td className="py-2.5 px-4 text-center text-slate-600 font-medium">
                                              {b.rack || "Rack A"} / {b.shelf || "Shelf 1"}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                              <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-900">
                                                <span>{bQty} Units</span>
                                                {med.conversionFactor > 1 && bQty > 0 && (
                                                  <span className="text-[10px] text-slate-500 font-medium">
                                                    ({Math.floor(bQty / med.conversionFactor)} Pk
                                                    {bQty % med.conversionFactor > 0 && ` + ${bQty % med.conversionFactor} Tab`})
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                              <Badge type={bStatus.type}>{bStatus.label}</Badge>
                                            </td>
                                            <td className="py-2.5 px-4 text-right">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleQuickAdjustBatch(med.id, b.batchNumber);
                                                }}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                              >
                                                <IoBuildOutline className="w-3 h-3 text-slate-500" />
                                                <span>Adjust</span>
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Print Footer */}
      <PrintFooter note="Official Pharmacy Stock Valuation & Batches Audit Ledger • PharmaCare ERP" />

      {/* --- STOCK ADJUSTMENT MODAL --- */}
      <Modal isOpen={showAdjustModal} onClose={() => setShowAdjustModal(false)} title="Perform Inventory Stock Adjustment">
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Select Medicine</label>
            <select
              required
              value={adjustMedId}
              onChange={(e) => {
                setAdjustMedId(e.target.value);
                setAdjustBatchNum("");
              }}
              className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="">-- Choose Medicine --</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.brand})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Batch Number</label>
              {adjustMedId ? (
                <select
                  required
                  value={adjustBatchNum}
                  onChange={(e) => setAdjustBatchNum(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="">-- Choose Batch --</option>
                  {adjustFormBatches.map((b) => (
                    <option key={b.batchNumber} value={b.batchNumber}>
                      {b.batchNumber} (Current Qty: {b.qty ?? b.quantity ?? 0})
                    </option>
                  ))}
                  <option value="NEW-BATCH">+ Register New Batch</option>
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  placeholder="Select medicine first"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none cursor-not-allowed"
                />
              )}
            </div>

            {adjustBatchNum === "NEW-BATCH" ? (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Enter New Batch Num</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BATCH-A"
                  value={newBatchNumber}
                  onChange={(e) => setNewBatchNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Adjustment Type</label>
              <div className="flex gap-2">
                {["Add", "Deduct"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAdjustType(t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      adjustType === t
                        ? t === "Add"
                          ? "bg-emerald-600 text-white"
                          : "bg-rose-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t === "Add" ? "+ Increase Stock" : "- Reduce Stock"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Quantity (Units)</label>
              <input
                type="number"
                min="1"
                required
                placeholder="10"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-black font-mono outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Reason / Notes</label>
            <input
              type="text"
              required
              placeholder="e.g. Expired discard, physical audit count"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-semibold outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAdjustModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-black cursor-pointer shadow-md transition-all active:scale-[0.98]"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </Modal>

      {/* --- INTER-BRANCH TRANSFER MODAL --- */}
      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Inter-Branch Stock Transfer">
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Medicine to Transfer</label>
            <select
              required
              value={transMedId}
              onChange={(e) => {
                setTransMedId(e.target.value);
                setTransBatchNum("");
              }}
              className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="">-- Choose Medicine --</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.brand})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Source Batch Number</label>
              {transMedId ? (
                <select
                  required
                  value={transBatchNum}
                  onChange={(e) => setTransBatchNum(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="">-- Choose Source Batch --</option>
                  {transferFormBatches.map((b) => (
                    <option key={b.batchNumber} value={b.batchNumber}>
                      {b.batchNumber} (Available: {b.qty ?? b.quantity ?? 0})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  placeholder="Select medicine first"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none cursor-not-allowed"
                />
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Transfer To Warehouse/Branch</label>
              <select
                required
                value={transToBranchId}
                onChange={(e) => setTransToBranchId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="">-- Target Branch --</option>
                {/* Dynamically fallback branches if branches array has only 1 */}
                <option value="branch-uptown">Uptown Branch</option>
                <option value="branch-central">Central Warehouse</option>
                <option value="branch-east">East Coast Clinic</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
              Quantity to Transfer (Units) - Max: {maxTransferQty}
            </label>
            <input
              type="number"
              min="1"
              max={maxTransferQty}
              required
              placeholder="Units count"
              value={transQty}
              onChange={(e) => setTransQty(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-black font-mono outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-black cursor-pointer shadow-md transition-all active:scale-[0.98]"
            >
              Dispatch Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
