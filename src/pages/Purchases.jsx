import React, { useContext, useState, useMemo, useRef, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { formatCurrency, formatDate } from "../utils/helpers";
import api from "../services/api";
import { Badge } from "../components/common/Badge";
import { Modal } from "../components/common/Modal";
import {
  IoAddOutline,
  IoTrashOutline,
  IoCheckmarkCircleOutline,
  IoReceiptOutline,
  IoCalendarOutline,
  IoDocumentTextOutline,
  IoPrintOutline,
  IoCubeOutline,
  IoTimeOutline,
  IoHourglassOutline,
  IoEyeOutline,
  IoSearchOutline,
  IoCloseCircleOutline,
  IoChevronDownOutline,
  IoChevronForwardOutline,
  IoPricetagOutline,
} from "react-icons/io5";
import { PrintExportActions } from "../components/common/PrintExportActions";

export const Purchases = () => {
  const {
    purchases,
    setPurchases,
    receivePurchaseItems,
    suppliers,
    medicines,
    currentBranch,
    currentUser,
    setMedicines,
    setSuppliers,
    paySupplier,
    logAudit,
    addToast,
    exportToExcel,
    exportTableToPDF,
    saveDocumentAsPDF
  } = useContext(AppContext);

  // Tabs: "details" (create invoice), "list" (history) or "return"
  const [activeTab, setActiveTab] = useState("details");

  // Order Placement Mode: "pending" (Recommended) vs "direct_received"
  const [orderPlacementMode, setOrderPlacementMode] = useState("pending");

  // Filter in history list: "all", "pending", "partially_received", "received", "returned"
  const [listFilter, setListFilter] = useState("all");
  const [listSearch, setListSearch] = useState("");
  const [expandedPOs, setExpandedPOs] = useState({});

  const toggleExpandPO = (poNumber) => {
    setExpandedPOs((prev) => ({
      ...prev,
      [poNumber]: !prev[poNumber]
    }));
  };

  const expandAllPOs = () => {
    const all = {};
    purchases.forEach((p) => {
      all[p.poNumber] = true;
    });
    setExpandedPOs(all);
  };

  const collapseAllPOs = () => {
    setExpandedPOs({});
  };

  // Modal States
  const [selectedPOForReceiving, setSelectedPOForReceiving] = useState(null);
  const [receivingItemsState, setReceivingItemsState] = useState([]);
  const [selectedPOForVoucher, setSelectedPOForVoucher] = useState(null);
  const [showSupplierPayModal, setShowSupplierPayModal] = useState(false);
  const [supPayAmount, setSupPayAmount] = useState("");
  const [supPayDate, setSupPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [supPayMethod, setSupPayMethod] = useState("Cash in Hand");
  const [supPayRef, setSupPayRef] = useState("");
  const [supPayNotes, setSupPayNotes] = useState("");

  // --- PURCHASE RETURN STATE ---
  const [returnSupplierId, setReturnSupplierId] = useState("");
  const [returnMedId, setReturnMedId] = useState("");
  const [returnQty, setReturnQty] = useState("");
  const [returnPrice, setReturnPrice] = useState("");
  const [returnRemarks, setReturnRemarks] = useState("Stock Return to Vendor");

  // --- STREAMLINED PURCHASE INVOICE STATE ---
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [supplierHighlightIdx, setSupplierHighlightIdx] = useState(-1);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [billNo, setBillNo] = useState("");
  const [mop, setMop] = useState("Cash");
  const [invoiceRemarks, setInvoiceRemarks] = useState("");

  // Product Selection & Quantity
  const [selectedMedId, setSelectedMedId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [productHighlightIdx, setProductHighlightIdx] = useState(-1);
  const [qtyPacks, setQtyPacks] = useState("1");
  const [customCostPrice, setCustomCostPrice] = useState("");

  // Cart
  const [cart, setCart] = useState([]);

  // Refs for rapid keyboard traversal & dropdown closing
  const supplierInputRef = useRef(null);
  const productInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const saveInvoiceBtnRef = useRef(null);
  const supplierDropdownRef = useRef(null);
  const productDropdownRef = useRef(null);
  const [productDropdownUp, setProductDropdownUp] = useState(false);

  // Auto-detect whether dropdown should open upward or downward based on viewport space
  useEffect(() => {
    if (isProductOpen && productInputRef.current) {
      const rect = productInputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 250 && rect.top > 250) {
        setProductDropdownUp(true);
      } else {
        setProductDropdownUp(false);
      }
    }
  }, [isProductOpen, productSearch]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target)) {
        setIsSupplierOpen(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target)) {
        setIsProductOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut F1 (focus Product) & F2 (focus Supplier)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (activeTab !== "details") return;
      if (e.key === "F1") {
        e.preventDefault();
        productInputRef.current?.focus();
        setIsProductOpen(true);
      } else if (e.key === "F2") {
        e.preventDefault();
        supplierInputRef.current?.focus();
        setIsSupplierOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activeTab]);

  // Derived Objects
  const activeSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  const selectedMed = useMemo(() => {
    return medicines.find((m) => m.id === selectedMedId) || null;
  }, [medicines, selectedMedId]);

  const getMedFactor = (m) => {
    if (!m) return 1;
    const isTablet =
      String(m.uom || "").toLowerCase().includes("tablet") ||
      String(m.category || "").toLowerCase().includes("tablet") ||
      String(m.category || "").toLowerCase().includes("capsule");
    const cf = parseFloat(m.conversionFactor);
    if (!isNaN(cf) && cf > 1) return cf;
    if (cf === 1 && !isTablet) return 1;
    return isTablet ? 10 : (cf || 1);
  };

  const currentMedStock = useMemo(() => {
    if (!selectedMed) return 0;
    return (selectedMed.batches || [])
      .filter((b) => b.branchId === currentBranch.id)
      .reduce((acc, curr) => acc + (curr.qty || curr.quantity || 0), 0);
  }, [selectedMed, currentBranch]);

  // Search Filters
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.company && s.company.toLowerCase().includes(q)) ||
        (s.contact && s.contact.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

  const filteredMedicines = useMemo(() => {
    if (!productSearch.trim()) return medicines.slice(0, 40);
    const q = productSearch.toLowerCase();
    return medicines
      .filter(
        (m) =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.genericName && m.genericName.toLowerCase().includes(q)) ||
          (m.brand && m.brand.toLowerCase().includes(q)) ||
          (m.barcode && m.barcode.toLowerCase().includes(q))
      )
      .slice(0, 40);
  }, [medicines, productSearch]);

  // --- KEYBOARD SELECTION FLOW ---
  const selectSupplier = (supplier) => {
    setSelectedSupplierId(supplier.id);
    setSupplierSearch(supplier.name);
    setIsSupplierOpen(false);
    setSupplierHighlightIdx(-1);
    // Move focus down to Product input
    setTimeout(() => {
      productInputRef.current?.focus();
      setIsProductOpen(true);
    }, 30);
  };

  const handleSupplierKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsSupplierOpen(true);
      setSupplierHighlightIdx((prev) =>
        prev < filteredSuppliers.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsSupplierOpen(true);
      setSupplierHighlightIdx((prev) =>
        prev > 0 ? prev - 1 : filteredSuppliers.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isSupplierOpen && supplierHighlightIdx >= 0 && filteredSuppliers[supplierHighlightIdx]) {
        selectSupplier(filteredSuppliers[supplierHighlightIdx]);
      } else if (filteredSuppliers.length > 0) {
        selectSupplier(filteredSuppliers[0]);
      } else {
        setIsSupplierOpen(false);
        productInputRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      setIsSupplierOpen(false);
    }
  };

  const selectProduct = (med) => {
    setSelectedMedId(med.id);
    setProductSearch(med.name);
    setCustomCostPrice(med.costPrice ? String(med.costPrice) : "");
    setIsProductOpen(false);
    setProductHighlightIdx(-1);
    // Focus down to Quantity input on that same line
    setTimeout(() => {
      qtyInputRef.current?.focus();
      try {
        qtyInputRef.current?.select();
      } catch (err) {}
    }, 30);
  };

  const handleProductKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsProductOpen(true);
      setProductHighlightIdx((prev) =>
        prev < filteredMedicines.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsProductOpen(true);
      setProductHighlightIdx((prev) =>
        prev > 0 ? prev - 1 : filteredMedicines.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isProductOpen && productHighlightIdx >= 0 && filteredMedicines[productHighlightIdx]) {
        selectProduct(filteredMedicines[productHighlightIdx]);
      } else if (filteredMedicines.length > 0 && productSearch.trim()) {
        selectProduct(filteredMedicines[0]);
      } else if (!productSearch.trim() && cart.length > 0) {
        saveInvoiceBtnRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      setIsProductOpen(false);
    }
  };

  const handleQtyKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
  };

  // --- ADD ITEM TO CART & RETURN FOCUS TO PRODUCT ON NEXT LINE ---
  const handleAddItem = () => {
    if (!selectedMedId) {
      if (cart.length > 0) {
        saveInvoiceBtnRef.current?.focus();
      } else {
        addToast("Please select a medicine first.", "warning");
        productInputRef.current?.focus();
      }
      return;
    }

    const med = medicines.find((m) => m.id === selectedMedId);
    if (!med) return;

    const qtyVal = parseFloat(qtyPacks) || 1;
    if (qtyVal <= 0) {
      addToast("Please enter a valid order quantity.", "warning");
      qtyInputRef.current?.focus();
      return;
    }

    const costVal = parseFloat(med.costPrice) || 0;
    const cf = getMedFactor(med);
    const uom = med.uom || "Unit";
    const totalUnits = qtyVal * cf;
    const lineTotal = qtyVal * costVal;

    const newItem = {
      medicineId: med.id,
      name: med.name,
      code: med.id,
      packing: med.packing || (cf > 1 ? "Pack" : "Unit"),
      conversionFactor: cf,
      uom: uom,
      purchasePrice: costVal,
      salePrice1: med.sellingPrice || 0,
      qtyPacks: qtyVal,
      totalUnits: totalUnits,
      totalCost: lineTotal
    };

    setCart((prev) => [...prev, newItem]);

    // Reset item entry fields
    setSelectedMedId("");
    setProductSearch("");
    setQtyPacks("1");
    addToast(`Added "${med.name}" (${qtyVal} ${uom}s/packs) to invoice.`, "success");

    // Immediately focus back to Product input on the next line!
    setTimeout(() => {
      productInputRef.current?.focus();
      setIsProductOpen(true);
    }, 40);
  };

  const handleRemoveItem = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // --- TOTALS ---
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalCost, 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return cartSubtotal;
  }, [cartSubtotal]);

  // --- GOODS RECEIVING MODAL HANDLERS (FOR LIST TAB) ---
  const handleOpenReceivingModal = (po) => {
    setSelectedPOForReceiving(po);
    const initialReceivingList = (po.items || []).map((it) => {
      const remaining = Math.max(0, (it.qtyOrdered || 0) - (it.qtyReceived || 0));
      return {
        medicineId: it.medicineId,
        name: it.name,
        qtyOrdered: it.qtyOrdered || 0,
        alreadyReceived: it.qtyReceived || 0,
        remainingQty: remaining,
        qtyReceiving: remaining.toString(),
        batchNumber: `BAT-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
        expiryDate: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        rack: "Rack A",
        shelf: "Shelf A-1",
        costPrice: it.costPrice || 0,
        sellingPrice: it.salePrice1 || (it.costPrice ? it.costPrice * 1.3 : 0)
      };
    });
    setReceivingItemsState(initialReceivingList);
  };

  const handleConfirmReceiving = () => {
    if (!selectedPOForReceiving) return;
    
    const hasAnyPositive = receivingItemsState.some((it) => Number(it.qtyReceiving) > 0);
    if (!hasAnyPositive) {
      addToast("Please enter at least 1 unit to receive.", "warning");
      return;
    }

    for (const it of receivingItemsState) {
      const num = Number(it.qtyReceiving) || 0;
      if (num > it.remainingQty) {
        addToast(`Cannot receive ${num} units for ${it.name}. Only ${it.remainingQty} units are remaining!`, "warning");
        return;
      }
    }

    const success = receivePurchaseItems(
      selectedPOForReceiving.poNumber,
      receivingItemsState,
      currentBranch.id
    );

    if (success) {
      setSelectedPOForReceiving(null);
      setReceivingItemsState([]);
    }
  };

  // --- SAVE PURCHASE INVOICE HANDLER (ALWAYS DIRECT RESTOCK) ---
  const handleSaveInvoice = () => {
    if (!selectedSupplierId) {
      addToast("Please select a Supplier first.", "warning");
      supplierInputRef.current?.focus();
      return;
    }
    if (cart.length === 0) {
      addToast("Please add at least one medicine to the purchase invoice.", "warning");
      productInputRef.current?.focus();
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    const poNum = `PO-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const invoiceTotal = grandTotal;

    // 1. Direct Restock: Re-stock medicines immediately into currentBranch batches
    const updatedMedicines = medicines.map((med) => {
      const cartItem = cart.find((item) => item.medicineId === med.id);
      if (cartItem) {
        const batchNum = `BAT-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
        const cPrice = parseFloat(cartItem.purchasePrice) || (med.costPrice || 0);
        const sPrice = parseFloat(cartItem.salePrice1) || (cPrice * 1.3) || (med.sellingPrice || 0);

        const newBatch = {
          batchNumber: batchNum,
          expiryDate: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          qty: cartItem.totalUnits,
          quantity: cartItem.totalUnits,
          costPrice: cPrice,
          sellingPrice: sPrice,
          branchId: currentBranch.id,
          rack: "Rack A",
          shelf: med.shelf || "Shelf A-1"
        };

        const newBatches = [...(med.batches || []), newBatch];
        const newStock = newBatches
          .filter((b) => !b.branchId || b.branchId === currentBranch.id)
          .reduce((acc, b) => acc + Number(b.qty ?? b.quantity ?? 0), 0);

        return {
          ...med,
          stock: newStock,
          costPrice: cPrice,
          sellingPrice: sPrice,
          batches: newBatches
        };
      }
      return med;
    });

    setMedicines(updatedMedicines);
    localStorage.setItem("pharmacy_medicines", JSON.stringify(updatedMedicines));
    updatedMedicines.forEach((med) => {
      const cartItem = cart.find((item) => item.medicineId === med.id);
      if (cartItem) {
        api.put(`/medicines/${med.id}`, med).catch(() => {});
      }
    });

    // 2. Adjust Supplier Ledger Balance if on credit
    if (mop === "Credit") {
      const updatedSuppliers = suppliers.map((s) => {
        if (s.id === selectedSupplierId) {
          return { ...s, balance: (s.balance || 0) + invoiceTotal };
        }
        return s;
      });
      setSuppliers(updatedSuppliers);
      localStorage.setItem("pharmacy_suppliers", JSON.stringify(updatedSuppliers));
    }

    // 3. Create purchase order entry with status "Received"
    const newPurchase = {
      poNumber: poNum,
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || "Generic Supplier",
      supplierContact: supplier?.contact || "N/A",
      supplierAddress: supplier?.address || "N/A",
      date: invoiceDate,
      mop,
      billNo: billNo || poNum,
      remarks: invoiceRemarks,
      branch: currentBranch.name,
      cashier: currentUser ? currentUser.name : "Admin",
      items: cart.map((item) => ({
        medicineId: item.medicineId,
        name: item.name,
        uom: item.uom,
        conversionFactor: item.conversionFactor,
        qtyOrdered: item.qtyPacks,
        qtyReceived: item.qtyPacks,
        lastReceivedBatch: `BAT-${Date.now().toString().slice(-4)}`,
        costPrice: parseFloat(item.purchasePrice) || 0,
        salePrice1: parseFloat(item.salePrice1) || 0,
        total: item.totalCost
      })),
      status: "Received",
      subTotal: invoiceTotal,
      discount: 0,
      freightExpense: 0,
      total: invoiceTotal
    };

    const updatedPurchases = [newPurchase, ...purchases];
    setPurchases(updatedPurchases);
    localStorage.setItem("pharmacy_purchases", JSON.stringify(updatedPurchases));

    logAudit(
      "PURCHASE_INVOICE",
      `Saved Purchase Invoice ${poNum} for ${newPurchase.supplierName}. Restocked ${cart.length} items. Total: Rs. ${invoiceTotal.toFixed(2)}`
    );

    addToast(`Purchase Invoice ${poNum} saved & stock directly restocked!`, "success");

    // Clear cart and reset form
    setCart([]);
    setSelectedSupplierId("");
    setSupplierSearch("");
    setBillNo("");
    setInvoiceRemarks("");
    setTimeout(() => {
      supplierInputRef.current?.focus();
    }, 50);
  };

  const handleProcessReturn = (e) => {
    e.preventDefault();
    if (!returnSupplierId || !returnMedId || !returnQty || !returnPrice) {
      addToast("Please fill all return fields.", "warning");
      return;
    }
    const qty = parseInt(returnQty);
    const price = parseFloat(returnPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      addToast("Invalid quantity or price specified for return.", "warning");
      return;
    }

    const med = medicines.find(m => m.id === returnMedId);
    const sup = suppliers.find(s => s.id === returnSupplierId);
    if (!med || !sup) return;

    // Deduct stock
    const currentStock = med.stock || 0;
    if (currentStock < qty) {
      addToast(`Insufficient stock! Current stock is ${currentStock} units, cannot return ${qty} units.`, "warning");
      return;
    }

    const updatedMeds = medicines.map(m => {
      if (m.id === med.id) {
        let remainingToReturn = qty;
        const updatedBatches = (m.batches || []).map(b => {
          if (remainingToReturn <= 0) return b;
          const deduct = Math.min(b.quantity, remainingToReturn);
          remainingToReturn -= deduct;
          return {
            ...b,
            quantity: b.quantity - deduct
          };
        }).filter(b => b.quantity > 0);

        return {
          ...m,
          stock: m.stock - qty,
          batches: updatedBatches
        };
      }
      return m;
    });

    const returnTotal = qty * price;
    const updatedSups = suppliers.map(s => {
      if (s.id === sup.id) {
        return {
          ...s,
          balance: Math.max(0, s.balance - returnTotal)
        };
      }
      return s;
    });

    const returnPO = {
      poNumber: `PR-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split("T")[0],
      supplierId: sup.id,
      supplierName: sup.name,
      items: [{
        medicineId: med.id,
        name: med.name,
        qty: -qty,
        price: price,
        total: -returnTotal
      }],
      subTotal: -returnTotal,
      tax: 0,
      total: -returnTotal,
      status: "Returned",
      paymentStatus: "Adjusted",
      branch: currentBranch.name,
      cashier: currentUser.name
    };

    setMedicines(updatedMeds);
    setSuppliers(updatedSups);
    setPurchases([returnPO, ...purchases]);

    localStorage.setItem("pharmacy_medicines", JSON.stringify(updatedMeds));
    localStorage.setItem("pharmacy_suppliers", JSON.stringify(updatedSups));
    localStorage.setItem("pharmacy_purchases", JSON.stringify([returnPO, ...purchases]));

    logAudit("PURCHASE_RETURN", `Purchase Return ${returnPO.poNumber} executed. Deducted ${qty} units of ${med.name} for Rs. ${returnTotal.toFixed(2)}.`);
    addToast(`Purchase Return ${returnPO.poNumber} successfully processed. Stock and vendor balance updated.`, "success");

    setReturnMedId("");
    setReturnQty("");
    setReturnPrice("");
    setReturnRemarks("Stock Return to Vendor");
  };

  const handleVoucherPdf = () => {
    if (!selectedPOForVoucher) return;
    const supName = suppliers.find((s) => s.id === selectedPOForVoucher.supplierId)?.name || selectedPOForVoucher.supplierName || "Supplier";
    const headers = ["#", "Medicine Name", "Batch #", "Expiry", "Pack Size", "Quantity", "Cost / Unit", "Tax %", "Disc %", "Total"];
    const rows = (selectedPOForVoucher.items || []).map((it, idx) => [
      idx + 1,
      it.medicineName || "N/A",
      it.batchNumber || "-",
      it.expiryDate || "-",
      it.packSize || 1,
      it.orderedQuantity || it.quantity || 0,
      formatCurrency(it.costPerPack || it.unitCost || 0),
      `${it.taxRate || 0}%`,
      `${it.discount || 0}%`,
      formatCurrency(it.total || 0)
    ]);
    exportTableToPDF(
      `Purchase Order Voucher #${selectedPOForVoucher.id}`,
      headers,
      rows,
      `PO_${selectedPOForVoucher.id}.pdf`,
      {
        "Supplier": supName,
        "Order Date": formatDate(selectedPOForVoucher.date),
        "Invoice Total": formatCurrency(selectedPOForVoucher.total || 0)
      },
      currentBranch
    );
  };

  const handleVoucherExcel = () => {
    if (!selectedPOForVoucher) return;
    const supName = suppliers.find((s) => s.id === selectedPOForVoucher.supplierId)?.name || selectedPOForVoucher.supplierName || "Supplier";
    const headers = ["#", "Medicine Name", "Batch #", "Expiry", "Pack Size", "Quantity", "Cost / Unit", "Tax %", "Disc %", "Total"];
    const rows = (selectedPOForVoucher.items || []).map((it, idx) => [
      idx + 1,
      it.medicineName || "N/A",
      it.batchNumber || "-",
      it.expiryDate || "-",
      it.packSize || 1,
      it.orderedQuantity || it.quantity || 0,
      (it.costPerPack || it.unitCost || 0).toFixed(2),
      `${it.taxRate || 0}%`,
      `${it.discount || 0}%`,
      (it.total || 0).toFixed(2)
    ]);
    exportToExcel(
      `Purchase Order Voucher #${selectedPOForVoucher.id}`,
      headers,
      rows,
      `PO_${selectedPOForVoucher.id}.xls`,
      {
        "Supplier": supName,
        "Order Date": formatDate(selectedPOForVoucher.date),
        "Grand Total": formatCurrency(selectedPOForVoucher.total || 0)
      }
    );
  };

  const handleExportListPDF = () => {
    const headers = ["PO #", "Supplier", "Date", "Items Count", "Order Total"];
    const rows = filteredPurchases.map((po) => [
      po.id || "N/A",
      suppliers.find((s) => s.id === po.supplierId)?.name || po.supplierName || "Supplier",
      formatDate(po.date),
      (po.items || []).length,
      formatCurrency(po.total || 0)
    ]);
    exportTableToPDF(
      "Purchase Orders Registry",
      headers,
      rows,
      `Purchases_Registry_${new Date().toISOString().split("T")[0]}.pdf`,
      {
        "Total Orders": filteredPurchases.length,
        "Grand Total": formatCurrency(filteredPurchases.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0))
      },
      currentBranch
    );
  };

  const handleExportListExcel = () => {
    const headers = ["PO #", "Supplier", "Date", "Items Count", "Order Total"];
    const rows = filteredPurchases.map((po) => [
      po.id || "N/A",
      suppliers.find((s) => s.id === po.supplierId)?.name || po.supplierName || "Supplier",
      formatDate(po.date),
      (po.items || []).length,
      (po.total || 0).toFixed(2)
    ]);
    exportToExcel(
      "Purchase Orders Registry",
      headers,
      rows,
      `Purchases_Registry_${new Date().toISOString().split("T")[0]}.xls`,
      {
        "Total Orders": filteredPurchases.length,
        "Grand Total": formatCurrency(filteredPurchases.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0))
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Bar - Boxy & High Visibility */}
      <div className="bg-white border-2 border-slate-300 rounded-md p-2 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded border border-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2 rounded text-xs font-black transition-all cursor-pointer ${
              activeTab === "details"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-700 hover:bg-slate-200"
            }`}
          >
            + New Purchase Invoice
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 rounded text-xs font-black transition-all cursor-pointer ${
              activeTab === "list"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-700 hover:bg-slate-200"
            }`}
          >
            Purchase Orders List ({purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("return")}
            className={`px-4 py-2 rounded text-xs font-black transition-all cursor-pointer ${
              activeTab === "return"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-700 hover:bg-slate-200"
            }`}
          >
            Purchase Return
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
            <span>Active Warehouse: <strong className="text-slate-900 font-black">{currentBranch.name}</strong></span>
          </div>
        </div>
      </div>

      {activeTab === "details" && (
        /* --- STREAMLINED PURCHASE INVOICE ENTRY SCREEN --- */
        <div className="space-y-4">
          {/* 1. Supplier Selection Header - Sharp Boxy */}
          <div className="bg-white p-4 border-2 border-slate-300 rounded-md shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-200 pb-2 mb-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Supplier & Invoice
              </span>
              <span className="text-[11px] font-bold text-slate-600">
                Shortcuts: <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-400 rounded text-[10px] font-mono font-bold">F2</kbd> Supplier &bull; <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-400 rounded text-[10px] font-mono font-bold">F1</kbd> Product &bull; <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-400 rounded text-[10px] font-mono font-bold">Enter</kbd> Next Line / Add
              </span>
            </div>

            <div className="relative max-w-xl" ref={supplierDropdownRef}>
              <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider block mb-1.5">
                Select Supplier Account (F2) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  ref={supplierInputRef}
                  id="purchase-supplier-input"
                  type="text"
                  value={supplierSearch}
                  placeholder="Type or select supplier name..."
                  onFocus={() => setIsSupplierOpen(true)}
                  onChange={(e) => {
                    setSupplierSearch(e.target.value);
                    setIsSupplierOpen(true);
                    setSupplierHighlightIdx(-1);
                    if (!e.target.value) setSelectedSupplierId("");
                  }}
                  onKeyDown={handleSupplierKeyDown}
                  autoComplete="off"
                  className="w-full bg-white border-2 border-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded px-3.5 py-2 text-xs font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <IoSearchOutline className="w-4 h-4" />
                </div>
              </div>

              {/* Supplier Dropdown */}
              {isSupplierOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-slate-400 rounded shadow-2xl max-h-56 overflow-y-auto py-1 text-xs">
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((s, idx) => {
                      const isSelected = s.id === selectedSupplierId;
                      const isHighlighted = idx === supplierHighlightIdx;
                      return (
                        <div
                          key={s.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectSupplier(s);
                          }}
                          onMouseEnter={() => setSupplierHighlightIdx(idx)}
                          className={`px-3.5 py-2 flex items-center justify-between cursor-pointer border-b border-slate-100 last:border-b-0 ${
                            isHighlighted
                              ? "bg-slate-200 text-slate-900 font-black"
                              : isSelected
                              ? "bg-slate-100 text-slate-900 font-bold"
                              : "text-slate-800 hover:bg-slate-100"
                          }`}
                        >
                          <div>
                            <div className="font-black text-slate-900">{s.name}</div>
                            <div className="text-[10px] text-slate-500 font-semibold">{s.company} &bull; {s.contact || "No phone"}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 text-slate-500 text-center font-semibold">No supplier found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Direct Ledger Table with Active Entry Row - Visible Boxy Grid */}
          <div className="bg-white border-2 border-slate-400 rounded-md shadow-xs overflow-visible">
            <div className="overflow-x-auto overflow-y-visible min-h-[220px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-black uppercase text-[11px] tracking-wider border-b-2 border-slate-400 divide-x divide-slate-300">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[260px]">Medicine Description</th>
                    <th className="py-2.5 px-3 min-w-[130px] text-center">Packing / Factor</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px]">Cost Price</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px]">Retail Price</th>
                    <th className="py-2.5 px-3 text-center min-w-[110px]">Quantity</th>
                    <th className="py-2.5 px-3 text-center min-w-[110px]">Total Units</th>
                    <th className="py-2.5 px-3 text-right min-w-[120px]">Total</th>
                    <th className="py-2.5 px-3 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {/* Confirmed Cart Rows */}
                  {cart.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 divide-x divide-slate-200 transition-colors">
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{item.name}</td>
                      <td className="py-2 px-3 text-center text-slate-700 font-bold">
                        {item.conversionFactor} {item.uom} / Pack
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.purchasePrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                        {formatCurrency(item.salePrice1)}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-black text-slate-900 bg-slate-50">
                        {item.qtyPacks}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                        {item.totalUnits} {item.uom}s
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-slate-900 bg-slate-50/50">
                        {formatCurrency(item.totalCost)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                          title="Remove item"
                        >
                          <IoTrashOutline className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Active Entry Row - Distinct Boxy Row */}
                  <tr className="bg-emerald-50/70 border-t-2 border-b-2 border-emerald-600 divide-x divide-emerald-200 relative z-30">
                    <td className="py-2 px-3 text-center font-mono font-black text-emerald-800 bg-emerald-100/50">
                      {cart.length + 1}
                    </td>

                    {/* Medicine Search Combobox */}
                    <td className="py-2 px-3">
                      <div className="relative" ref={productDropdownRef}>
                        <input
                          ref={productInputRef}
                          id="purchase-product-input"
                          type="text"
                          value={productSearch}
                          placeholder="Search medicine (F1)..."
                          onFocus={() => setIsProductOpen(true)}
                          onChange={(e) => {
                            setProductSearch(e.target.value);
                            setIsProductOpen(true);
                            setProductHighlightIdx(-1);
                            if (!e.target.value) {
                              setSelectedMedId("");
                            }
                          }}
                          onKeyDown={handleProductKeyDown}
                          autoComplete="off"
                          className="w-full bg-white border-2 border-slate-400 focus:border-emerald-700 rounded px-3 py-1.5 text-xs font-bold text-slate-900 outline-none shadow-2xs"
                        />

                        {/* Product Dropdown */}
                        {isProductOpen && (
                          <div
                            className={`absolute z-50 left-0 min-w-[340px] max-w-md bg-white border-2 border-slate-400 rounded shadow-2xl max-h-60 overflow-y-auto py-1 text-xs ${
                              productDropdownUp ? "bottom-full mb-1" : "top-full mt-1"
                            }`}
                          >
                            {filteredMedicines.length > 0 ? (
                              filteredMedicines.map((m, idx) => {
                                const isSelected = m.id === selectedMedId;
                                const isHighlighted = idx === productHighlightIdx;
                                return (
                                  <div
                                    key={m.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selectProduct(m);
                                    }}
                                    onMouseEnter={() => setProductHighlightIdx(idx)}
                                    className={`px-3 py-2 flex items-center justify-between cursor-pointer border-b border-slate-100 last:border-b-0 ${
                                      isHighlighted
                                        ? "bg-slate-200 text-slate-900 font-bold"
                                        : isSelected
                                        ? "bg-emerald-50 text-slate-900 font-bold"
                                        : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <div className="space-y-0.5">
                                      <div className="font-bold text-slate-900">{m.name}</div>
                                      <div className="text-[10px] text-slate-500 font-semibold">
                                        Factor: {getMedFactor(m)} {m.uom || "Unit"} &bull; Stock: {m.stock || 0}
                                      </div>
                                    </div>
                                    <div className="text-right space-y-0.5">
                                      <div className="font-mono font-black text-emerald-800 text-xs">
                                        Cost: {formatCurrency(m.costPrice || 0)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-3 text-slate-500 font-semibold text-center">No medicine found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Packing / Factor (Auto) */}
                    <td className="py-2 px-3 text-center text-slate-800 font-bold">
                      {selectedMed ? `${getMedFactor(selectedMed)} ${selectedMed.uom || "Unit"} / Pack` : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Cost Price (Auto from medicine) */}
                    <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                      {selectedMed ? formatCurrency(selectedMed.costPrice || 0) : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Retail Price (Auto) */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                      {selectedMed ? formatCurrency(selectedMed.sellingPrice || 0) : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Order Qty (Input with Enter to add) */}
                    <td className="py-2 px-3 text-center">
                      <input
                        ref={qtyInputRef}
                        id="purchase-qty-input"
                        type="number"
                        min="1"
                        value={qtyPacks}
                        onChange={(e) => setQtyPacks(e.target.value)}
                        onKeyDown={handleQtyKeyDown}
                        className="w-20 bg-white border-2 border-slate-400 focus:border-emerald-700 rounded px-2 py-1 text-xs font-mono font-black text-center text-slate-900 outline-none shadow-2xs"
                      />
                    </td>

                    {/* Total Units (Auto calculated) */}
                    <td className="py-2 px-3 text-center font-mono font-black text-slate-800">
                      {selectedMed ? `${(parseFloat(qtyPacks) || 1) * getMedFactor(selectedMed)} ${selectedMed.uom || "Unit"}s` : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Line Total (Auto calculated) */}
                    <td className="py-2 px-3 text-right font-mono font-black text-emerald-900 bg-emerald-100/40">
                      {selectedMed ? formatCurrency((parseFloat(qtyPacks) || 1) * (parseFloat(selectedMed.costPrice) || 0)) : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Add / Action Button */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-black text-xs shadow-2xs cursor-pointer transition-all flex items-center justify-center gap-1"
                        title="Add item (Enter)"
                      >
                        <IoAddOutline className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table Footer with Summary & Actions - Solid Boxy Bar */}
            <div className="bg-slate-100 p-3.5 border-t-2 border-slate-400 rounded-b-md flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white border-2 border-slate-300 rounded px-3 py-1.5 text-center min-w-[90px]">
                  <span className="text-slate-500 font-extrabold uppercase text-[10px] block">Total Items</span>
                  <span className="text-base font-black font-mono text-slate-900">{cart.length}</span>
                </div>
                <div className="bg-white border-2 border-slate-300 rounded px-3 py-1.5 text-center min-w-[90px]">
                  <span className="text-slate-500 font-extrabold uppercase text-[10px] block">Total Packs</span>
                  <span className="text-base font-black font-mono text-slate-900">
                    {cart.reduce((acc, it) => acc + (parseFloat(it.qtyPacks) || 0), 0)}
                  </span>
                </div>
                <div className="bg-white border-2 border-slate-300 rounded px-3 py-1.5 text-center min-w-[90px]">
                  <span className="text-slate-500 font-extrabold uppercase text-[10px] block">Total Units</span>
                  <span className="text-base font-black font-mono text-slate-900">
                    {cart.reduce((acc, it) => acc + (parseFloat(it.totalUnits) || 0), 0)}
                  </span>
                </div>
                <div className="bg-emerald-50 border-2 border-emerald-500 rounded px-4 py-1.5 text-center min-w-[160px]">
                  <span className="text-emerald-800 font-black uppercase text-[10px] block">Net Invoice Total</span>
                  <span className="text-lg font-black font-mono text-emerald-900">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="px-4 py-2 border-2 border-slate-300 hover:bg-slate-200 rounded text-xs font-bold text-slate-800 cursor-pointer transition-all"
                  >
                    Clear Invoice
                  </button>
                )}
                <button
                  ref={saveInvoiceBtnRef}
                  type="button"
                  onClick={handleSaveInvoice}
                  disabled={cart.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98]"
                >
                  <IoCheckmarkCircleOutline className="w-4 h-4" />
                  <span>Save & Restock Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "list" && (
        /* --- PURCHASE ORDERS & INVOICES HISTORY LIST --- */
        <div className="space-y-4 animate-fade-in">
          {/* List Search and Expand Controls - Sharp Boxy */}
          <div className="bg-white p-3 border-2 border-slate-300 rounded-md shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-grow w-full md:max-w-md">
              <IoSearchOutline className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search PO #, supplier, medicine, or notes..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border-2 border-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded text-xs font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={expandAllPOs}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 rounded transition-colors cursor-pointer"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAllPOs}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 rounded transition-colors cursor-pointer"
              >
                Collapse
              </button>
              <div className="h-6 w-px bg-slate-300 mx-1 hidden sm:block"></div>
              <PrintExportActions
                onDirectPrint={() => window.print()}
                onPdf={handleExportListPDF}
                onExcel={handleExportListExcel}
                printLabel="Direct Print"
                pdfLabel="PDF"
                excelLabel="Excel Export"
                size="sm"
              />
            </div>
          </div>

          {/* Purchase Orders Table - Sharp Boxy Grid */}
          <div className="bg-white border-2 border-slate-400 rounded-md shadow-xs overflow-hidden print:border-0 print:shadow-none print:rounded-none">
            <div className="overflow-x-auto print:border-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-400 text-[11px] font-black text-slate-900 uppercase tracking-wider bg-slate-200 divide-x divide-slate-300">
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                    <th className="py-2.5 px-4 min-w-[130px]">PO Number</th>
                    <th className="py-2.5 px-4 min-w-[160px]">Supplier</th>
                    <th className="py-2.5 px-4 min-w-[110px]">Date</th>
                    <th className="py-2.5 px-4">Procured Items & Purchase Rates</th>
                    <th className="py-2.5 px-4 text-right min-w-[120px]">Order Total</th>
                    <th className="py-2.5 px-4 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 divide-x divide-slate-200">
                  {purchases
                    .filter((po) => {
                      if (!listSearch.trim()) return true;
                      const q = listSearch.toLowerCase();
                      const matchesItem = (po.items || []).some(
                        (it) => it.name && it.name.toLowerCase().includes(q)
                      );
                      return (
                        po.poNumber.toLowerCase().includes(q) ||
                        po.supplierName.toLowerCase().includes(q) ||
                        matchesItem ||
                        (po.remarks && po.remarks.toLowerCase().includes(q))
                      );
                    })
                    .map((po) => {
                      const isExpanded = !!expandedPOs[po.poNumber];

                      return (
                        <React.Fragment key={po.poNumber}>
                          <tr
                            onClick={() => toggleExpandPO(po.poNumber)}
                            className={`hover:bg-slate-50 transition-colors cursor-pointer select-none ${
                              isExpanded ? "bg-slate-50/70" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                              >
                                {isExpanded ? (
                                  <IoChevronDownOutline className="w-4 h-4 text-slate-800" />
                                ) : (
                                  <IoChevronForwardOutline className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="font-extrabold text-slate-900 font-mono text-xs block">{po.poNumber}</span>
                              <div className="text-[10px] text-slate-500 font-medium">{(po.items || []).length} items listed</div>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-900 text-xs">{po.supplierName}</div>
                              {po.supplierContact && po.supplierContact !== "N/A" ? (
                                <div className="text-[10px] text-slate-500 font-medium">{po.supplierContact}</div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic">Distributor</div>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 font-semibold text-xs whitespace-nowrap">
                              {formatDate(po.date)}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex flex-wrap gap-1.5">
                                {(po.items || []).map((it, itIdx) => (
                                  <div
                                    key={itIdx}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-md text-xs"
                                  >
                                    <span className="font-bold text-slate-900">{it.name}</span>
                                    <span className="text-slate-500 font-normal">({it.qtyOrdered} {it.uom || "Pk"})</span>
                                    <span className="font-extrabold text-emerald-700 font-mono">
                                      @ {formatCurrency(it.costPrice)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-right font-black text-slate-900 text-xs font-mono">
                              {formatCurrency(po.total)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <div
                                className="flex items-center justify-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedPOForVoucher(po)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-bold transition-all border border-slate-300 cursor-pointer flex items-center gap-1.5"
                                  title="Print PO Voucher"
                                >
                                  <IoPrintOutline className="w-3.5 h-3.5 text-slate-600" />
                                  <span>PO Invoice</span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Accordion Detailed Itemized Breakdown */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70">
                              <td colSpan="7" className="p-0 border-b border-slate-200">
                                <div className="p-3.5 pl-10 pr-4 bg-slate-100/60 border-y border-slate-200 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                      <IoLayersOutline className="w-4 h-4 text-slate-600" />
                                      Detailed Medicines & Purchase Rates in PO #{po.poNumber}
                                    </span>
                                    <span className="text-xs text-slate-600 font-semibold">
                                      Supplier: <strong className="text-slate-900">{po.supplierName}</strong>
                                    </span>
                                  </div>

                                  <div className="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-2xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                                          <th className="py-2 px-3 w-10 text-center">#</th>
                                          <th className="py-2 px-3">Medicine Item</th>
                                          <th className="py-2 px-3 text-center">Unit / Pack</th>
                                          <th className="py-2 px-3 text-right">Purchase Rate (Cost)</th>
                                          <th className="py-2 px-3 text-right">Retail Sale Price</th>
                                          <th className="py-2 px-3 text-center">Quantity</th>
                                          <th className="py-2 px-3 text-right">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {(po.items || []).map((it, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50/70">
                                            <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                                            <td className="py-2 px-3 font-bold text-slate-900">{it.name}</td>
                                            <td className="py-2 px-3 text-center text-slate-600 font-medium">{it.uom || "Pack"}</td>
                                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">
                                              {formatCurrency(it.costPrice)}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700">
                                              {formatCurrency(it.salePrice1 || (it.costPrice ? it.costPrice * 1.3 : 0))}
                                            </td>
                                            <td className="py-2 px-3 text-center font-black text-slate-900 font-mono">{it.qtyOrdered}</td>
                                            <td className="py-2 px-3 text-right font-black text-slate-900 font-mono">
                                              {formatCurrency(it.total ?? (it.qtyOrdered * it.costPrice))}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  {purchases.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-10 text-center text-slate-400 font-semibold">
                        No purchase orders loaded in system ledger.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "return" && (
        /* --- PURCHASE RETURN SYSTEM --- */
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="bg-white p-5 border border-slate-300 rounded-xl shadow-2xs space-y-4">
            <div className="border-b border-slate-200 pb-2.5">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Return Stock to Supplier / Vendor
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Record stock returns and directly adjust vendor balance
              </p>
            </div>
            <form onSubmit={handleProcessReturn} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                    Select Vendor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={returnSupplierId}
                    onChange={(e) => setReturnSupplierId(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-slate-800 rounded-md px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="">Select Supplier Account</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Ledger Balance: Rs. {s.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                    Select Medicine <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={returnMedId}
                    onChange={(e) => {
                      setReturnMedId(e.target.value);
                      const med = medicines.find((m) => m.id === e.target.value);
                      if (med) {
                        setReturnPrice(med.costPrice.toString());
                      }
                    }}
                    className="w-full bg-white border border-slate-300 focus:border-slate-800 rounded-md px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="">Select Medicine</option>
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Current Stock: {m.stock || 0} units)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                    Return Quantity (Units) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50"
                    value={returnQty}
                    onChange={(e) => setReturnQty(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-slate-800 rounded-md px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                    Return Unit Cost (Rs.) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={returnPrice}
                    onChange={(e) => setReturnPrice(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-slate-800 rounded-md px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                    Adjustable Total Refund
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formatCurrency((parseInt(returnQty) || 0) * (parseFloat(returnPrice) || 0))}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-md px-3 py-2 text-xs font-black text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Return Remarks / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Expired stock return / Near expiry adjustment"
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-slate-800 rounded-md px-3 py-2 text-xs font-medium text-slate-800 outline-none"
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                >
                  Process Purchase Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- GOODS RECEIVING MODAL (GRN / STOCKED-IN) --- */}
      <Modal
        isOpen={Boolean(selectedPOForReceiving)}
        onClose={() => setSelectedPOForReceiving(null)}
        title={`Receive Goods: ${selectedPOForReceiving?.poNumber}`}
        size="xl"
      >
        {selectedPOForReceiving && (
          <div className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase">Supplier:</span>
                <span className="ml-1.5 font-extrabold text-slate-900">{selectedPOForReceiving.supplierName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase">Order Date:</span>
                <span className="ml-1.5 font-bold text-slate-800">{formatDate(selectedPOForReceiving.date)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase">Receiving Branch:</span>
                <span className="ml-1.5 font-bold text-emerald-700">{currentBranch.name}</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[380px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0 z-10">
                    <th className="py-2.5 px-3">Medicine Item</th>
                    <th className="py-2.5 px-3 text-center">Ordered</th>
                    <th className="py-2.5 px-3 text-center">Received</th>
                    <th className="py-2.5 px-3 text-center">Remaining</th>
                    <th className="py-2.5 px-3">Receiving Now</th>
                    <th className="py-2.5 px-3">Batch Number</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3">Shelf</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {receivingItemsState.map((item, idx) => (
                    <tr key={item.medicineId} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{item.qtyOrdered}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500 font-semibold">{item.alreadyReceived}</td>
                      <td className="py-2.5 px-3 text-center font-black text-amber-700 bg-amber-50/50">
                        {item.remainingQty}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="0"
                          max={item.remainingQty}
                          disabled={item.remainingQty === 0}
                          value={item.qtyReceiving}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReceivingItemsState((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, qtyReceiving: val } : it))
                            );
                          }}
                          className="w-20 bg-white border border-slate-300 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs font-black text-center outline-none shadow-2xs"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          disabled={item.remainingQty === 0}
                          value={item.batchNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReceivingItemsState((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, batchNumber: val } : it))
                            );
                          }}
                          className="w-28 bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-mono outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="date"
                          disabled={item.remainingQty === 0}
                          value={item.expiryDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReceivingItemsState((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, expiryDate: val } : it))
                            );
                          }}
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          disabled={item.remainingQty === 0}
                          value={item.shelf}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReceivingItemsState((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, shelf: val } : it))
                            );
                          }}
                          className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPOForReceiving(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReceiving}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                <IoCubeOutline className="w-4 h-4" />
                <span>Confirm & Update Stock</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- PURCHASE ORDER PRINTABLE VOUCHER / INVOICE MODAL --- */}
      <Modal
        isOpen={Boolean(selectedPOForVoucher)}
        onClose={() => setSelectedPOForVoucher(null)}
        title="Purchase Order Voucher"
        size="xl"
      >
        {selectedPOForVoucher && (
          <div className="space-y-6">
            {/* Printable Document Box */}
            <div className="print-po bg-white p-8 rounded-2xl border border-slate-200 text-slate-800 space-y-6 shadow-sm">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-5 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-md bg-emerald-600"></span>
                    <h2 className="text-xl font-extrabold text-slate-900 font-heading">PharmaCare ERP</h2>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Corporate Pharmacy & Hospital Distribution System
                  </p>
                  <p className="text-xs text-slate-600 font-bold mt-0.5">
                    Branch: {selectedPOForVoucher.branch || currentBranch.name} &bull; Warehouse Unit
                  </p>
                </div>

                <div className="text-right sm:text-right">
                  <div className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Purchase Order Voucher</div>
                  <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                    {selectedPOForVoucher.poNumber}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    Date: {formatDate(selectedPOForVoucher.date)}
                  </div>
                  <div className="inline-block mt-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      selectedPOForVoucher.status === "Received"
                        ? "bg-emerald-100 text-emerald-800"
                        : selectedPOForVoucher.status === "Partially Received"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      Status: {selectedPOForVoucher.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vendor & Delivery Meta */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Supplier / Vendor</div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">{selectedPOForVoucher.supplierName}</div>
                  <div className="text-slate-500 mt-0.5">{selectedPOForVoucher.supplierContact || "Contact: N/A"}</div>
                  <div className="text-slate-500">{selectedPOForVoucher.supplierAddress || "Address: Main Supply Hub"}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Payment & Terms</div>
                  <div className="font-bold text-slate-800 mt-0.5">Mode: {selectedPOForVoucher.mop || "Cash"}</div>
                  <div className="text-slate-500 mt-0.5">Due Date: {formatDate(selectedPOForVoucher.dueDate || selectedPOForVoucher.date)}</div>
                  <div className="text-slate-500">Prepared By: {selectedPOForVoucher.cashier || "System Admin"}</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3 text-center">Pack / UOM</th>
                      <th className="py-2.5 px-3 text-center">Qty Ordered</th>
                      <th className="py-2.5 px-3 text-center">Qty Received</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(selectedPOForVoucher.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{item.uom || "Pack"}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">{item.qtyOrdered}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{item.qtyReceived ?? item.qtyOrdered}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(item.costPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          {formatCurrency(item.total ?? (item.qtyOrdered * item.costPrice))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Breakdown */}
              <div className="flex justify-end">
                <div className="w-full sm:w-72 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(selectedPOForVoucher.subTotal || selectedPOForVoucher.total)}</span>
                  </div>
                  {selectedPOForVoucher.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(selectedPOForVoucher.discount)}</span>
                    </div>
                  )}
                  {selectedPOForVoucher.freightExpense > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Freight & Handling:</span>
                      <span>{formatCurrency(selectedPOForVoucher.freightExpense)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-300 pt-2 mt-2">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(selectedPOForVoucher.total)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures & Approval */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-500 font-semibold">
                <div>
                  <div className="border-b border-slate-300 pb-8"></div>
                  <div className="mt-1.5 uppercase font-bold text-slate-700">Prepared By</div>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-8"></div>
                  <div className="mt-1.5 uppercase font-bold text-slate-700">Supplier Acknowledgment</div>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-8"></div>
                  <div className="mt-1.5 uppercase font-bold text-slate-700">Warehouse Receiving In-Charge</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => setSelectedPOForVoucher(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold cursor-pointer border border-slate-300"
              >
                Close
              </button>
              <PrintExportActions
                onDirectPrint={() => window.print()}
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

      {/* --- QUICK SUPPLIER PAYMENT MODAL --- */}
      <Modal
        isOpen={showSupplierPayModal}
        onClose={() => setShowSupplierPayModal(false)}
        title={`Record Payment to ${activeSupplier?.name || "Supplier"}`}
      >
        {activeSupplier && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const amount = parseFloat(supPayAmount);
              if (amount <= 0) {
                addToast("Please enter a valid payment amount.", "warning");
                return;
              }
              paySupplier(activeSupplier.id, amount, {
                date: supPayDate,
                paymentMethod: supPayMethod,
                reference: supPayRef,
                notes: supPayNotes
              });
              setSupPayAmount("");
              setShowSupplierPayModal(false);
            }}
            className="space-y-4"
          >
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Current Outstanding Balance</span>
                <div className="font-extrabold text-rose-700 text-base mt-0.5 font-mono">
                  {formatCurrency(activeSupplier.balance)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Company</span>
                <div className="font-bold text-slate-700 mt-0.5">{activeSupplier.company}</div>
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
                  value={supPayAmount}
                  onChange={(e) => setSupPayAmount(e.target.value)}
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
                  value={supPayDate}
                  onChange={(e) => setSupPayDate(e.target.value)}
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
                  value={supPayMethod}
                  onChange={(e) => setSupPayMethod(e.target.value)}
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
                  value={supPayRef}
                  onChange={(e) => setSupPayRef(e.target.value)}
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
                placeholder="e.g. Paid weekly invoice dues"
                value={supPayNotes}
                onChange={(e) => setSupPayNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSupplierPayModal(false)}
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
    </div>
  );
};
