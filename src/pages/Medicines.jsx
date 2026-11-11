import React, { useContext, useState, useMemo, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { formatCurrency, getBarcodeLines } from "../utils/helpers";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import SearchableCombobox, { focusNextInput } from "../components/common/SearchableCombobox";
import { PrintHeader } from "../components/common/PrintHeader";
import { PrintFooter } from "../components/common/PrintFooter";
import { PrintExportActions } from "../components/common/PrintExportActions";
import {
  IoAddOutline,
  IoSearchOutline,
  IoFunnelOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoBarcodeOutline,
  IoPrintOutline,
  IoDownloadOutline,
  IoMedicalOutline,
  IoCheckmarkOutline,
  IoQrCodeOutline,
  IoCalculatorOutline,
  IoSparklesOutline
} from "react-icons/io5";

export const Medicines = () => {
  const {
    medicines,
    currentBranch,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    currentUser,
    suppliers,
    exportToCSV,
    exportToExcel,
    exportTableToPDF,
    masterData,
    addMasterItem,
    openScannerModal,
    pendingScannedBarcode,
    setPendingScannedBarcode
  } = useContext(AppContext);

  // Search, Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortField, setSortField] = useState("name");
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);

  // Automatically trigger Add Medicine modal with pre-filled code upon barcode scan
  useEffect(() => {
    const handleOpenAdd = (e) => {
      const code = e.detail?.barcode;
      if (code) {
        setFormData({
          name: "",
          brand: (masterData?.brands && masterData.brands[0]) || "GSK (GlaxoSmithKline)",
          genericName: "",
          category: (masterData?.categories && masterData.categories[0]) || "Tablet",
          subCategory: (masterData?.subCategories && masterData.subCategories[0]) || "Pain Relief",
          productGroup: (masterData?.productGroups && masterData.productGroups[0]) || "Analgesic",
          strength: "",
          barcode: String(code).trim(),
          costPrice: "",
          sellingPrice: "",
          shelf: (masterData?.shelfCoordinates && masterData.shelfCoordinates[0]) || "Rack A - Shelf 1",
          drugType: (masterData?.drugTypes && masterData.drugTypes[0]) || "OTC",
          reorderLevel: "20",
          conversionFactor: "10",
          supplierId: "",
          supplierName: ""
        });
        setShowAddModal(true);
      }
    };

    window.addEventListener("pharmacy_open_add_medicine_modal", handleOpenAdd);
    return () => {
      window.removeEventListener("pharmacy_open_add_medicine_modal", handleOpenAdd);
    };
  }, [masterData]);

  useEffect(() => {
    if (pendingScannedBarcode) {
      setFormData((prev) => ({
        ...prev,
        barcode: String(pendingScannedBarcode).trim()
      }));
      setShowAddModal(true);
      setPendingScannedBarcode("");
    }
  }, [pendingScannedBarcode, setPendingScannedBarcode]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [activeMedicine, setActiveMedicine] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    medicineId: null,
    medicineName: ""
  });

  // Sleek In-App Quick Add Option Modal (No browser prompt)
  const [quickAddModal, setQuickAddModal] = useState({
    isOpen: false,
    type: "",
    title: "",
    placeholder: "",
    value: "",
    targetField: ""
  });

  const openQuickAdd = (type, title, placeholder, targetField) => {
    setQuickAddModal({
      isOpen: true,
      type,
      title,
      placeholder,
      value: "",
      targetField
    });
  };

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    if (!quickAddModal.value.trim()) return;
    const trimmed = quickAddModal.value.trim();
    const success = addMasterItem(quickAddModal.type, trimmed);
    if (success !== false) {
      setFormData((prev) => ({ ...prev, [quickAddModal.targetField]: trimmed }));
      setQuickAddModal((prev) => ({ ...prev, isOpen: false, value: "" }));
    }
  };

  // Dynamic Master Options from AppContext
  const brands = masterData?.brands || [
    "GSK (GlaxoSmithKline)", "Abbott Laboratories", "Getz Pharma", "The Searle Company", 
    "Sami Pharmaceuticals", "Hilton Pharma", "Ferozsons Laboratories", "Sanofi-Aventis", 
    "Pfizer Pakistan", "Novartis", "Bosch Pharmaceuticals", "High-Q Pharmaceuticals", 
    "CCL Pharmaceuticals", "PharmEvo", "Bayer Pakistan", "Martin Dow"
  ];
  const categories = masterData?.categories || ["Tablet", "Capsule", "Syrup", "Injection", "Inhaler", "Ointment"];
  const drugTypes = masterData?.drugTypes || ["OTC", "Prescription-Only", "Narcotics / Restricted"];
  const subCategories = masterData?.subCategories || ["General", "Antibiotic", "Antihypertensive", "Analgesic", "Sedative"];
  const productGroups = masterData?.productGroups || ["General", "Antibacterial", "Cardiac Drugs", "Pain Killers"];
  const shelfCoordinates = masterData?.shelfCoordinates || ["Shelf A-1", "Shelf A-2", "Shelf B-1", "Shelf B-2", "Shelf C-1", "Cold Storage 1"];
  const uoms = masterData?.uoms || ["Tablet", "Capsule", "Bottle", "Strip", "Box", "Pack", "Vial", "Ampoule", "Tube"];

  // Dynamic generic names list from already registered products
  const existingGenerics = useMemo(() => {
    const set = new Set();
    medicines.forEach((m) => {
      if (m.genericName && m.genericName.trim()) set.add(m.genericName.trim());
    });
    return Array.from(set);
  }, [medicines]);

  // Helper: check if product is sold in strips/tablets
  const isTabletOrStrip = (uom, category) => {
    const u = String(uom || "").toLowerCase();
    const c = String(category || "").toLowerCase();
    return u.includes("tablet") || u.includes("strip") || u.includes("capsule") || c.includes("tablet") || c.includes("capsule");
  };

  // Helper: auto-map Unit of Measure (UOM) based on Category
  const getAutoUomForCategory = (cat) => {
    const c = String(cat || "").toLowerCase().trim();
    if (c.includes("tablet")) return "Tablet";
    if (c.includes("capsule")) return "Capsule";
    if (c.includes("syrup") || c.includes("suspension") || c.includes("liquid") || c.includes("drop") || c.includes("elixir") || c.includes("infusion")) return "Bottle";
    if (c.includes("injection") || c.includes("vial")) return "Vial";
    if (c.includes("ampoule")) return "Ampoule";
    if (c.includes("cream") || c.includes("ointment") || c.includes("gel")) return "Tube";
    if (c.includes("inhal") || c.includes("spray")) return "Pack";
    if (c.includes("sachet") || c.includes("powder")) return "Sachet";
    if (c.includes("strip")) return "Strip";
    return "";
  };

  // Form Fields State (Clean & simple, all optional except Medicine Name)
  const [formData, setFormData] = useState({
    name: "",
    genericName: "",
    brand: "",
    category: "Tablet",
    uom: "Tablet",
    subCategory: "",
    productGroup: "",
    shelf: "",
    strength: "",
    costPrice: "",
    sellingPrice: "",
    barcode: "",
    drugType: "OTC",
    reorderLevel: "20",
    conversionFactor: "10",
    supplierId: "",
    supplierName: ""
  });

  // Fetch branch stock for a medicine
  const getBranchStock = (med) => {
    if (!med.batches || !Array.isArray(med.batches) || med.batches.length === 0) {
      return Number(med.totalStock) || 0;
    }
    return med.batches
      .filter((b) => !currentBranch?.id || b.branchId === currentBranch.id)
      .reduce((acc, curr) => acc + (Number(curr.qty ?? curr.quantity) || 0), 0);
  };

  // Filter & Sort Logic
  const filteredMeds = useMemo(() => {
    return medicines
      .filter((m) => {
        const matchesQuery =
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.barcode.includes(searchQuery);

        const matchesCategory = categoryFilter ? m.category === categoryFilter : true;
        const matchesType = typeFilter ? m.drugType === typeFilter : true;

        return matchesQuery && matchesCategory && matchesType;
      })
      .sort((a, b) => {
        if (sortField === "name") return a.name.localeCompare(b.name);
        if (sortField === "price-asc") return a.sellingPrice - b.sellingPrice;
        if (sortField === "price-desc") return b.sellingPrice - a.sellingPrice;
        return 0;
      });
  }, [medicines, searchQuery, categoryFilter, typeFilter, sortField]);

  // Form actions
  const handleOpenAdd = () => {
    setFormData({
      name: "",
      genericName: "",
      brand: "",
      category: categories[0] || "Tablet",
      uom: uoms[0] || "Tablet",
      subCategory: "",
      productGroup: "",
      shelf: "",
      strength: "",
      costPrice: "",
      sellingPrice: "",
      barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      drugType: "OTC",
      reorderLevel: "20",
      conversionFactor: "10",
      supplierId: "",
      supplierName: ""
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (med) => {
    setActiveMedicine(med);
    const hasStrip = isTabletOrStrip(med.uom, med.category);
    const cf = hasStrip ? Math.max(1, parseInt(med.conversionFactor) || 10) : 1;

    const unitSell = med.unitSellingPrice != null && med.unitSellingPrice > 0
      ? med.unitSellingPrice
      : (cf > 0 ? (med.sellingPrice / cf) : med.sellingPrice);

    const unitCost = med.unitCostPrice != null && med.unitCostPrice > 0
      ? med.unitCostPrice
      : (cf > 0 ? (med.costPrice / cf) : med.costPrice);

    setFormData({
      name: med.name || "",
      genericName: med.genericName || "",
      brand: med.brand || "",
      category: med.category || "Tablet",
      uom: med.uom || "Tablet",
      subCategory: med.subCategory || "",
      productGroup: med.productGroup || "",
      shelf: med.shelf || "",
      strength: med.strength || "",
      costPrice: unitCost > 0 ? Number(unitCost.toFixed(2)).toString() : "",
      sellingPrice: unitSell > 0 ? Number(unitSell.toFixed(2)).toString() : "",
      barcode: med.barcode || "",
      drugType: med.drugType || "OTC",
      reorderLevel: (med.reorderLevel || 20).toString(),
      conversionFactor: (med.conversionFactor || 10).toString(),
      supplierId: med.supplierId || "",
      supplierName: med.supplierName || ""
    });
    setShowEditModal(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const hasStrip = isTabletOrStrip(formData.uom, formData.category);
    const cf = Math.max(1, parseInt(formData.conversionFactor) || (hasStrip ? 10 : 1));

    const unitSell = parseFloat(formData.sellingPrice) || 0;
    const unitCost = parseFloat(formData.costPrice) || 0;

    const packSell = unitSell * cf;
    const packCost = unitCost * cf;

    const payload = {
      ...formData,
      name: formData.name.trim(),
      sellingPrice: packSell,
      costPrice: packCost,
      unitSellingPrice: unitSell,
      unitCostPrice: unitCost,
      conversionFactor: cf,
      reorderLevel: parseInt(formData.reorderLevel) || 20,
      barcode: formData.barcode ? formData.barcode.trim() : `890${Math.floor(1000000000 + Math.random() * 9000000000)}`
    };

    addMedicine(payload);
    setShowAddModal(false);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const hasStrip = isTabletOrStrip(formData.uom, formData.category);
    const cf = Math.max(1, parseInt(formData.conversionFactor) || (hasStrip ? 10 : 1));

    const unitSell = parseFloat(formData.sellingPrice) || 0;
    const unitCost = parseFloat(formData.costPrice) || 0;

    const packSell = unitSell * cf;
    const packCost = unitCost * cf;

    updateMedicine({
      ...activeMedicine,
      ...formData,
      name: formData.name.trim(),
      sellingPrice: packSell,
      costPrice: packCost,
      unitSellingPrice: unitSell,
      unitCostPrice: unitCost,
      conversionFactor: cf,
      reorderLevel: parseInt(formData.reorderLevel) || activeMedicine.reorderLevel || 20,
      barcode: formData.barcode ? formData.barcode.trim() : activeMedicine.barcode
    });
    setShowEditModal(false);
    setActiveMedicine(null);
  };

  const handleDelete = (med) => {
    setDeleteConfirmModal({
      isOpen: true,
      medicineId: med.id,
      medicineName: med.name
    });
  };

  const handleExportExcel = () => {
    const headers = [
      "Medicine Name", "Brand", "Generic Name", "Strength", "Category", 
      "Classification", "Barcode", "Cost Price", "Selling Price", "Current Stock"
    ];
    const rows = filteredMeds.map((med) => [
      med.name,
      med.brand,
      med.genericName,
      med.strength,
      med.category,
      med.drugType,
      med.barcode,
      med.costPrice.toFixed(2),
      med.sellingPrice.toFixed(2),
      getBranchStock(med)
    ]);
    exportToExcel(
      "Master Medicines & Formulations Catalog",
      headers,
      rows,
      `Medicines_Catalog_${new Date().toISOString().split("T")[0]}.xls`,
      { "Total Registered Products": filteredMeds.length }
    );
  };

  const handleExportPDF = () => {
    const headers = ["Product Name", "Generic", "Category", "Classification", "Pack Size", "Cost Price", "Sale Price", "Current Stock"];
    const rows = filteredMeds.map((m) => [
      m.name || "N/A",
      m.genericName || "-",
      m.category || "-",
      m.medicineType || m.type || "-",
      m.packSize || 1,
      formatCurrency(m.costPrice || 0),
      formatCurrency(m.sellingPrice || 0),
      `${m.stock || 0} Units`
    ]);
    exportTableToPDF(
      "Medicines Catalog & Stock Ledger",
      headers,
      rows,
      `Medicines_Catalog_${new Date().toISOString().split("T")[0]}.pdf`,
      {
        "Total Registered Products": filteredMeds.length,
        "Category Filter": categoryFilter || "All",
        "Type Filter": typeFilter || "All"
      },
      currentBranch
    );
  };

  const handleBarcodePdf = () => {
    if (!activeMedicine) return;
    const headers = ["Product Name", "Barcode", "Generic", "Category", "Selling Price"];
    const rows = [[
      activeMedicine.name,
      activeMedicine.barcode || "-",
      activeMedicine.genericName || "-",
      activeMedicine.category || "-",
      formatCurrency(activeMedicine.sellingPrice || 0)
    ]];
    exportTableToPDF(
      `Barcode Label - ${activeMedicine.name}`,
      headers,
      rows,
      `Barcode_${activeMedicine.barcode || activeMedicine.name}.pdf`,
      { "Barcode": activeMedicine.barcode, "Selling Price": formatCurrency(activeMedicine.sellingPrice || 0) },
      currentBranch
    );
  };

  const handleBarcodeExcel = () => {
    if (!activeMedicine) return;
    const headers = ["Product Name", "Barcode", "Generic", "Category", "Selling Price"];
    const rows = [[
      activeMedicine.name,
      activeMedicine.barcode || "-",
      activeMedicine.genericName || "-",
      activeMedicine.category || "-",
      (activeMedicine.sellingPrice || 0).toFixed(2)
    ]];
    exportToExcel(
      `Barcode Label - ${activeMedicine.name}`,
      headers,
      rows,
      `Barcode_${activeMedicine.barcode || activeMedicine.name}.xls`
    );
  };

  const handlePrintList = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print-area">
      {/* Universal Official Boxy Print Header */}
      <PrintHeader
        title="MEDICINES CATALOG & STOCK LEDGER"
        subtitle="Master Products Directory & Pricing Schedule"
        branch={currentBranch}
        user={currentUser}
        metadata={{
          "Total Items": filteredMeds.length,
          "Category": categoryFilter || "All Categories",
          "Classification": typeFilter || "All Types"
        }}
      />

      {/* Page Header (Web only) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
            Medicines Catalog
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage pharmacy products, classifications, formulations, and stock levels
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <PrintExportActions
            onDirectPrint={handlePrintList}
            onPdf={handleExportPDF}
            onExcel={handleExportExcel}
            printLabel="Direct Print"
            pdfLabel="PDF"
            excelLabel="Excel Export"
            size="sm"
          />
          <button
            type="button"
            onClick={openScannerModal}
            title="Scan Medicine Box Barcode or QR Code"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-200"
          >
            <IoQrCodeOutline className="w-4 h-4 text-emerald-600" />
            <span>Scan QR</span>
          </button>
          {currentUser.role !== "Pharmacist" && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <IoAddOutline className="w-4.5 h-4.5" />
              <span>Add New Medicine</span>
            </button>
          )}
        </div>
      </div>
 
      {/* Filter and Search Bar Card */}
      <div className="bg-white p-4 border border-slate-200/80 rounded-2xl shadow-2xs space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-grow max-w-md">
            <IoSearchOutline className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by Name, Generic name, Brand or Barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl text-xs font-medium outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 font-bold">
              <IoFunnelOutline className="w-3.5 h-3.5 text-slate-400" />
              <span>Filters</span>
            </div>
            
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-200 hover:bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-colors cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Drug Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 hover:bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-colors cursor-pointer"
            >
              <option value="">All Classifications</option>
              {drugTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Sorting Filter */}
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="bg-white border border-slate-200 hover:bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-colors cursor-pointer"
            >
              <option value="name">Sort by Name</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Medicines Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden print:border-0 print:shadow-none print:rounded-none">
        <div className="overflow-x-auto print:border-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                <th className="py-3 px-5">ID / Product</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Category & Group</th>
                <th className="py-3 px-4">UOM & Shelf</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4 text-right font-mono">Cost Price</th>
                <th className="py-3 px-4 text-right font-mono">Selling Price</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-5 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredMeds.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-semibold">
                    No medicines found in catalog. Click "+ Add New Medicine" above to create one.
                  </td>
                </tr>
              ) : (
                filteredMeds.map((med) => {
                  const stock = getBranchStock(med);
                  return (
                    <tr key={med.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3 px-5">
                        <div>
                          <div className="font-bold text-slate-900">{med.name}</div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Gen: {med.genericName} &bull; {med.strength}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">{med.brand}</td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-semibold">{med.category}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{med.productGroup || "General Group"}</div>
                        {med.supplierName && (
                          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Supplier: {med.supplierName}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-semibold">{med.uom || "Tablet"}</div>
                        <div className="text-[10px] text-indigo-600 font-mono font-bold mt-0.5">Loc: {med.shelf || "Shelf A-1"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            med.drugType === "Narcotics / Restricted" || med.drugType === "Restricted"
                              ? "danger"
                              : med.drugType === "Prescription-Only"
                              ? "warning"
                              : "success"
                          }
                        >
                          {med.drugType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {formatCurrency(med.costPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(med.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono ${
                            stock <= 0
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : stock <= (med.reorderLevel || 10)
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {stock} Units
                          </span>
                          {med.conversionFactor > 1 && (
                            <span className="text-[10px] text-slate-500 font-extrabold font-mono mt-0.5">
                              {Math.floor(stock / med.conversionFactor)} Pk
                              {stock % med.conversionFactor > 0 && ` + ${stock % med.conversionFactor} Tab`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right no-print">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setActiveMedicine(med); setShowBarcodeModal(true); }}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Print Barcode"
                          >
                            <IoBarcodeOutline className="w-4 h-4" />
                          </button>
                          {currentUser.role !== "Pharmacist" && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(med)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Product"
                              >
                                <IoPencilOutline className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(med)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Product"
                              >
                                <IoTrashOutline className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Print Footer */}
      <PrintFooter note="Official Medicines Catalog & Stock Ledger Record • PharmaCare ERP" />

      {/* --- ADD MEDICINE MODAL --- */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register New Medicine" size="lg">
        {(() => {
          const isTablet = isTabletOrStrip(formData.uom, formData.category);
          const cf = isTablet ? Math.max(1, parseInt(formData.conversionFactor) || 10) : 1;
          const unitPrice = parseFloat(formData.sellingPrice) || 0;
          const packPrice = unitPrice * cf;

          return (
            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              {/* Barcode Row */}
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-300 rounded-md">
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Barcode:</span>
                <input
                  type="text"
                  placeholder="Barcode string..."
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(e.currentTarget); } }}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono text-slate-800 outline-none focus:border-slate-600"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={openScannerModal}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  Scan from Box
                </button>
              </div>

              {/* Row 1: Medicine Name & Brand / Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Medicine Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Panadol Extra"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(e.currentTarget); } }}
                    className="w-full bg-white border border-slate-300 focus:border-slate-600 rounded-md px-3 py-2 text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <SearchableCombobox
                    label="Brand / Company"
                    value={formData.brand}
                    onChange={(val) => setFormData((prev) => ({ ...prev, brand: val }))}
                    options={brands}
                    onAddNew={() => openQuickAdd("brands", "Add Pharma Brand / Company", "e.g. GSK, Abbott, Getz Pharma", "brand")}
                    placeholder="Select or type brand..."
                  />
                </div>
              </div>

              {/* Row 2: Generic / Formula & Strength */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableCombobox
                    label="Generic / Formula"
                    value={formData.genericName}
                    onChange={(val) => setFormData((prev) => ({ ...prev, genericName: val }))}
                    options={existingGenerics}
                    placeholder="e.g. Paracetamol + Caffeine..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg / 65mg"
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(e.currentTarget); } }}
                    className="w-full bg-white border border-slate-300 focus:border-slate-600 rounded-md px-3 py-2 text-xs font-medium outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Category & Unit of Measure (UOM) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableCombobox
                    label="Category"
                    value={formData.category}
                    onChange={(val) => {
                      const autoUom = getAutoUomForCategory(val);
                      setFormData((prev) => ({
                        ...prev,
                        category: val,
                        ...(autoUom ? { uom: autoUom } : {})
                      }));
                    }}
                    options={categories}
                    onAddNew={() => openQuickAdd("categories", "Add Medicine Category", "e.g. Tablet, Syrup, Injection", "category")}
                    placeholder="Select category..."
                  />
                </div>
                <div>
                  <SearchableCombobox
                    label="Unit of Measure (UOM)"
                    value={formData.uom}
                    onChange={(val) => setFormData((prev) => ({ ...prev, uom: val }))}
                    options={uoms}
                    onAddNew={() => openQuickAdd("uoms", "Add Unit of Measure", "e.g. Strip, Bottle, Box", "uom")}
                    placeholder="Select UOM..."
                  />
                </div>
              </div>

              {/* Row 4: Sub Category & Product Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableCombobox
                    label="Sub Category"
                    value={formData.subCategory}
                    onChange={(val) => setFormData((prev) => ({ ...prev, subCategory: val }))}
                    options={subCategories}
                    onAddNew={() => openQuickAdd("subCategories", "Add Sub-Category", "e.g. Pain Relief, Antibiotic", "subCategory")}
                    placeholder="Select sub category..."
                  />
                </div>
                <div>
                  <SearchableCombobox
                    label="Product Group"
                    value={formData.productGroup}
                    onChange={(val) => setFormData((prev) => ({ ...prev, productGroup: val }))}
                    options={productGroups}
                    onAddNew={() => openQuickAdd("productGroups", "Add Product Group", "e.g. General, Critical Care", "productGroup")}
                    placeholder="Select product group..."
                  />
                </div>
              </div>

              {/* Row 5: Shelf Coordinates & Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableCombobox
                    label="Shelf Coordinates"
                    value={formData.shelf}
                    onChange={(val) => setFormData((prev) => ({ ...prev, shelf: val }))}
                    options={shelfCoordinates}
                    onAddNew={() => openQuickAdd("shelfCoordinates", "Add Storage Shelf", "e.g. Rack A - Shelf 1", "shelf")}
                    placeholder="Select shelf location..."
                  />
                </div>
                <div>
                  <SearchableCombobox
                    label="Classification"
                    value={formData.drugType}
                    onChange={(val) => setFormData((prev) => ({ ...prev, drugType: val }))}
                    options={drugTypes}
                    placeholder="Select classification..."
                  />
                </div>
              </div>

              {/* Row 6: Boxy Pricing (Per Unit / Tablet) */}
              <div className="p-3 border border-slate-300 rounded-md bg-slate-50/60">
                <div className={`grid grid-cols-1 ${isTablet ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Cost Price (Rs.) {isTablet ? "(Per Tablet)" : "(Per Unit)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(e.currentTarget); } }}
                      className="w-full bg-white border border-slate-300 focus:border-slate-600 rounded-md px-3 py-2 text-xs font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Selling Price (Rs.) {isTablet ? "(Per Tablet)" : "(Per Unit)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(e.currentTarget); } }}
                      className="w-full bg-white border border-slate-300 focus:border-slate-600 rounded-md px-3 py-2 text-xs font-medium outline-none"
                    />
                  </div>

                  {isTablet && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Pack Size (Tablets per Strip)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="10"
                        value={formData.conversionFactor}
                        onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(e.currentTarget); } }}
                        className="w-full bg-white border border-slate-300 focus:border-slate-600 rounded-md px-3 py-2 text-xs font-medium outline-none"
                      />
                    </div>
                  )}
                </div>

                {isTablet && (
                  <div className="mt-2 text-xs text-slate-600 font-medium">
                    Pack / Strip Price:{" "}
                    <span className="font-semibold text-slate-900">Rs. {packPrice.toFixed(2)}</span>
                    {" "}({cf} tablets × Rs. {unitPrice.toFixed(2)})
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  Create Product
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* --- EDIT MEDICINE MODAL --- */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setActiveMedicine(null); }} title="Edit Product Details" size="lg">
        {(() => {
          const isTablet = isTabletOrStrip(formData.uom, formData.category);
          const cf = isTablet ? Math.max(1, parseInt(formData.conversionFactor) || 10) : 1;
          const unitPrice = parseFloat(formData.sellingPrice) || 0;
          const packPrice = unitPrice * cf;

          return (
            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              {/* Barcode Row */}
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-300 rounded-md">
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Barcode:</span>
                <input
                  type="text"
                  placeholder="Barcode string..."
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(e.currentTarget); } }}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono text-slate-800 outline-none focus:border-slate-600"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={openScannerModal}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  Scan from Box
                </button>
              </div>

              {/* Row 1: Medicine Name & Brand / Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Medicine Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Panadol Extra"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(e.currentTarget); } }}
                    className="w-full bg-white border border-slate-300 focus:border-slate-600 rounded-md px-3 py-2 text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <SearchableCombobox
                    label="Brand / Company"
                    value={formData.brand}
                    onChange={(val) => setFormData((prev) => ({ ...prev, brand: val }))}
                    options={brands}
                    onAddNew={() => openQuickAdd("brands", "Add Pharma Brand / Company", "e.g. GSK, Abbott, Getz Pharma", "brand")}
                    placeholder="Select or type brand..."
                  />
                </div>
              </div>

              {/* Row 2: Generic / Formula & Strength */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableCombobox
                    label="Generic / Formula"
                    value={formData.genericName}
                    onChange={(val) => setFormData((prev) => ({ ...prev, genericName: val }))}
                    options={existingGenerics}
                    placeholder="e.g. Paracetamol + Caffeine..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg / 65mg"
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(e.currentTarget); } }}
                    className="w-full bg-white border border-slate-300 focus:border-slate-600 rounded-md px-3 py-2 text-xs font-medium outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Category & Unit of Measure (UOM) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableCombobox
                    label="Category"
                    value={formData.category}
                    onChange={(val) => {
                      const autoUom = getAutoUomForCategory(val);
                      setFormData((prev) => ({
                        ...prev,
                        category: val,
                        ...(autoUom ? { uom: autoUom } : {})
                      }));
                    }}
                    options={categories}
                    onAddNew={() => openQuickAdd("categories", "Add Medicine Category", "e.g. Tablet, Syrup, Injection", "category")}
                    placeholder="Select category..."
                  />
                </div>
                <div>
                  <SearchableCombobox
                    label="Unit of Measure (UOM)"
                    value={formData.uom}
                    onChange={(val) => setFormData((prev) => ({ ...prev, uom: val }))}
                    options={uoms}
                    onAddNew={() => openQuickAdd("uoms", "Add Unit of Measure", "e.g. Strip, Bottle, Box", "uom")}
                    placeholder="Select UOM..."
                  />
                </div>
              </div>

              {/* Row 4: Sub Category & Product Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableCombobox
                    label="Sub Category"
                    value={formData.subCategory}
                    onChange={(val) => setFormData((prev) => ({ ...prev, subCategory: val }))}
                    options={subCategories}
                    onAddNew={() => openQuickAdd("subCategories", "Add Sub-Category", "e.g. Pain Relief, Antibiotic", "subCategory")}
                    placeholder="Select sub category..."
                  />
                </div>
                <div>
                  <SearchableCombobox
                    label="Product Group"
                    value={formData.productGroup}
                    onChange={(val) => setFormData((prev) => ({ ...prev, productGroup: val }))}
                    options={productGroups}
                    onAddNew={() => openQuickAdd("productGroups", "Add Product Group", "e.g. General, Critical Care", "productGroup")}
                    placeholder="Select product group..."
                  />
                </div>
              </div>

              {/* Row 5: Shelf Coordinates & Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableCombobox
                    label="Shelf Coordinates"
                    value={formData.shelf}
                    onChange={(val) => setFormData((prev) => ({ ...prev, shelf: val }))}
                    options={shelfCoordinates}
                    onAddNew={() => openQuickAdd("shelfCoordinates", "Add Storage Shelf", "e.g. Rack A - Shelf 1", "shelf")}
                    placeholder="Select shelf location..."
                  />
                </div>
                <div>
                  <SearchableCombobox
                    label="Classification"
                    value={formData.drugType}
                    onChange={(val) => setFormData((prev) => ({ ...prev, drugType: val }))}
                    options={drugTypes}
                    placeholder="Select classification..."
                  />
                </div>
              </div>

              {/* Row 6: Boxy Pricing (Per Unit / Tablet) */}
              <div className="p-3 border border-slate-300 rounded-md bg-slate-50/60">
                <div className={`grid grid-cols-1 ${isTablet ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Cost Price (Rs.) {isTablet ? "(Per Tablet)" : "(Per Unit)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(e.currentTarget); } }}
                      className="w-full bg-white border border-slate-300 focus:border-slate-600 rounded-md px-3 py-2 text-xs font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Selling Price (Rs.) {isTablet ? "(Per Tablet)" : "(Per Unit)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(e.currentTarget); } }}
                      className="w-full bg-white border border-slate-300 focus:border-slate-600 rounded-md px-3 py-2 text-xs font-medium outline-none"
                    />
                  </div>

                  {isTablet && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Pack Size (Tablets per Strip)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="10"
                        value={formData.conversionFactor}
                        onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNextInput(e.currentTarget); } }}
                        className="w-full bg-white border border-slate-300 focus:border-slate-600 rounded-md px-3 py-2 text-xs font-medium outline-none"
                      />
                    </div>
                  )}
                </div>

                {isTablet && (
                  <div className="mt-2 text-xs text-slate-600 font-medium">
                    Pack / Strip Price:{" "}
                    <span className="font-semibold text-slate-900">Rs. {packPrice.toFixed(2)}</span>
                    {" "}({cf} tablets × Rs. {unitPrice.toFixed(2)})
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setActiveMedicine(null); }}
                  className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* --- QUICK ADD DROPDOWN OPTION MODAL (Custom, Modern & Sleek) --- */}
      <Modal
        isOpen={quickAddModal.isOpen}
        onClose={() => setQuickAddModal((prev) => ({ ...prev, isOpen: false }))}
        title={quickAddModal.title || "Add New Option"}
        size="sm"
      >
        <form onSubmit={handleQuickAddSubmit} className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-700 text-xs font-bold">
              <IoMedicalOutline className="w-4 h-4 text-emerald-600" />
              <span>Enter name to add to dropdown:</span>
            </div>
            <input
              type="text"
              autoFocus
              required
              placeholder={quickAddModal.placeholder}
              value={quickAddModal.value}
              onChange={(e) => setQuickAddModal((prev) => ({ ...prev, value: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition-all"
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setQuickAddModal((prev) => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <IoCheckmarkOutline className="w-4 h-4" />
              <span>Add & Select</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* --- BARCODE PREVIEW MODAL --- */}
      <Modal isOpen={showBarcodeModal} onClose={() => { setShowBarcodeModal(false); setActiveMedicine(null); }} title="Generate Barcode Label" size="sm">
        {activeMedicine && (
          <div className="space-y-6 text-center">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-3 font-mono">
              <h4 className="text-xs font-bold text-slate-800">{activeMedicine.name}</h4>
              <p className="text-[9px] text-slate-500 leading-none">{activeMedicine.brand} &bull; {activeMedicine.strength}</p>
              
              {/* Visual Simulated Barcode Lines */}
              <div className="flex h-14 items-center justify-center gap-[1.5px] bg-white px-6 py-2 border border-slate-200 rounded-md">
                {getBarcodeLines(activeMedicine.barcode).map((width, idx) => (
                  <span
                    key={idx}
                    className="inline-block bg-slate-900 h-full"
                    style={{ width: `${width}px` }}
                  ></span>
                ))}
              </div>
              
              <span className="text-[10px] font-bold text-slate-700 tracking-widest">{activeMedicine.barcode}</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase">Price: {formatCurrency(activeMedicine.sellingPrice)}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => { setShowBarcodeModal(false); setActiveMedicine(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold cursor-pointer border border-slate-300"
              >
                Close
              </button>
              <PrintExportActions
                onDirectPrint={() => window.print()}
                onPdf={handleBarcodePdf}
                onExcel={handleBarcodeExcel}
                printLabel="Direct Print"
                pdfLabel="PDF"
                excelLabel="Excel Export"
                size="sm"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* --- DELETE CONFIRMATION DIALOG MODAL --- */}
      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, medicineId: null, medicineName: "" })}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Are you sure you want to permanently delete <strong className="text-slate-900 font-bold">"{deleteConfirmModal.medicineName}"</strong> from the pharmacy catalog? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmModal({ isOpen: false, medicineId: null, medicineName: "" })}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteConfirmModal.medicineId) {
                  deleteMedicine(deleteConfirmModal.medicineId);
                  setDeleteConfirmModal({ isOpen: false, medicineId: null, medicineName: "" });
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <IoTrashOutline className="w-4 h-4" />
              <span>Delete Product</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
