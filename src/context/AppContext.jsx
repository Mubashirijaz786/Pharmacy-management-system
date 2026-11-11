import React, { createContext, useState, useEffect, useCallback } from "react";
import { syncService } from "../services/syncService";
import api from "../services/api";
import { exportToCSV, exportToExcel, printDocumentContent, exportTableToPDF, saveDocumentAsPDF } from "../utils/exportUtils";
import { formatCurrency } from "../utils/helpers";
import { soundEffects } from "../utils/audioAlert";



// Tombstone helpers to prevent undeleted database records from resurrecting on refresh
const getDeletedIds = (key) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch {
    return new Set();
  }
};

const addDeletedId = (key, id) => {
  if (!id) return;
  try {
    const set = getDeletedIds(key);
    set.add(String(id));
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
};

const DEFAULT_BRANCHES = [
  { id: "BR001", code: "DWT", name: "Downtown Branch", address: "102 Main Street, City Center", phone: "+92 300 1234567", isHeadquarters: true },
  { id: "BR002", code: "WST", name: "Westside Clinic Branch", address: "405 Medical Park Drive", phone: "+92 300 7654321" },
  { id: "BR003", code: "EST", name: "Eastside Retail Branch", address: "789 Commercial Plaza", phone: "+92 300 9876543" }
];

const DEFAULT_USERS = [
  { id: "USR001", name: "System Admin", username: "admin", role: "Admin", branchId: "BR001" },
  { id: "USR002", name: "Cashier User", username: "cashier", role: "Cashier", branchId: "BR001" },
  { id: "USR003", name: "Pharmacist User", username: "pharmacist", role: "Pharmacist", branchId: "BR001" },
  { id: "USR004", name: "Manager User", username: "manager", role: "Manager", branchId: "BR001" }
];

const DEFAULT_MASTER_DATA = {
  brands: [
    "GSK (GlaxoSmithKline)", "Abbott Laboratories", "Getz Pharma", "The Searle Company", 
    "Sami Pharmaceuticals", "Hilton Pharma", "Ferozsons Laboratories", "Sanofi-Aventis", 
    "Pfizer Pakistan", "Novartis", "Bosch Pharmaceuticals", "High-Q Pharmaceuticals", 
    "CCL Pharmaceuticals", "PharmEvo", "Bayer Pakistan", "Martin Dow", 
    "Wilshire Laboratories", "Atco Laboratories", "Barrett Hodgson", "Macter International", 
    "OBS Pakistan", "Helix Pharma", "Genix Pharma", "Horizon Pharmaceuticals", 
    "Zafa Pharmaceuticals", "Remington Pharmaceuticals", "Benson Pharmaceuticals", "Medisearch LifeSciences"
  ],
  categories: [
    "Tablet", "Capsule", "Syrup", "Injection", "Inhaler", "Ointment", "Drops", 
    "Suspension", "Cream", "Lotion", "Powder", "Sachet", "Suppository", "Infusion", "Spray", "Gel"
  ],
  subCategories: [
    "General", "Antibiotic", "Antihypertensive", "Analgesic", "Sedative", "Antidiabetic", 
    "Antacid", "Antiallergic", "Vitamin/Mineral", "Antipyretic", "Anti-inflammatory", 
    "Antifungal", "Antiviral", "Cardiovascular", "Gastrointestinal", "Respiratory", "Dermatological"
  ],
  productGroups: [
    "General", "Antibacterial", "Cardiac Drugs", "Pain Killers", "Controlled Psychotropic", 
    "Insulins", "Gastrointestinal", "Antihistamines", "Supplements", "Pediatric", "Nutraceuticals", "Vaccines"
  ],
  drugTypes: ["OTC", "Prescription-Only", "Narcotics / Restricted", "General Medical Item"],
  uoms: ["Tablet", "Capsule", "Bottle", "Strip", "Box", "Pack", "Vial", "Ampoule", "Tube", "Sachet", "Jar", "Pfs (Pre-filled Syringe)"],
  shelfCoordinates: [
    "Shelf A-1", "Shelf A-2", "Shelf B-1", "Shelf B-2", "Shelf C-1", "Shelf C-2", 
    "Shelf C-3", "Shelf D-1", "Shelf D-2", "Shelf F-1", "Shelf G-4", "Cold Storage 1", "Cold Storage 2", "Counter Drawer 1", "Controlled Locker A"
  ],
  paymentMethods: ["Cash", "Card", "Bank Transfer", "EasyPaisa", "JazzCash", "Store Credit / Ledger"],
  expenseCategories: [
    "Utilities (Electricity/Water)", "Store Rent", "Staff Salaries", "Packaging & Bags", 
    "Software & Maintenance", "Transportation & Courier", "Tea & Refreshments", "Marketing & Promotion", "Miscellaneous"
  ]
};

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // --- CORE STATE INITIALIZATION (All start EMPTY []) ---
  const [branches, setBranches] = useState(() => {
    const saved = localStorage.getItem("pharmacy_branches");
    return saved ? JSON.parse(saved) : DEFAULT_BRANCHES;
  });

  const [currentBranch, setCurrentBranch] = useState(() => {
    const saved = localStorage.getItem("pharmacy_currentBranch");
    return saved ? JSON.parse(saved) : DEFAULT_BRANCHES[0];
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("pharmacy_currentUser");
    return saved ? JSON.parse(saved) : DEFAULT_USERS[0];
  });

  const [medicines, setMedicines] = useState(() => {
    const saved = localStorage.getItem("pharmacy_medicines");
    const list = saved ? JSON.parse(saved) : [];
    return list.map((m) => {
      const isTablet = String(m.uom || "").toLowerCase().includes("tablet") || String(m.category || "").toLowerCase().includes("tablet");
      const cf = parseInt(m.conversionFactor) || (isTablet ? 10 : 1);
      return { ...m, conversionFactor: cf };
    });
  });

  const [suppliers, setSuppliers] = useState(() => {
    const saved = localStorage.getItem("pharmacy_suppliers");
    return saved ? JSON.parse(saved) : [];
  });

  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem("pharmacy_customers");
    return saved ? JSON.parse(saved) : [];
  });

  const [prescriptions, setPrescriptions] = useState(() => {
    const saved = localStorage.getItem("pharmacy_prescriptions");
    return saved ? JSON.parse(saved) : [];
  });

  const [sales, setSales] = useState(() => {
    const saved = localStorage.getItem("pharmacy_sales");
    return saved ? JSON.parse(saved) : [];
  });

  const [purchases, setPurchases] = useState(() => {
    const saved = localStorage.getItem("pharmacy_purchases");
    return saved ? JSON.parse(saved) : [];
  });

  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem("pharmacy_employees");
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem("pharmacy_expenses");
    return saved ? JSON.parse(saved) : [];
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem("pharmacy_audit_logs");
    return saved ? JSON.parse(saved) : [];
  });

  const [heldInvoices, setHeldInvoices] = useState(() => {
    const saved = localStorage.getItem("pharmacy_held_invoices");
    return saved ? JSON.parse(saved) : [];
  });

  const [offlineQueue, setOfflineQueue] = useState(() => {
    const saved = localStorage.getItem("pharmacy_offline_queue");
    return saved ? JSON.parse(saved) : [];
  });

  const [salesReturns, setSalesReturns] = useState(() => {
    const saved = localStorage.getItem("pharmacy_sales_returns");
    return saved ? JSON.parse(saved) : [];
  });
  const [toasts, setToasts] = useState([]);
  const [taxRate, setTaxRate] = useState(0.05);

  const [registerStatus, setRegisterStatus] = useState("Closed");
  const [registerSession, setRegisterSession] = useState({ openingFloat: 0, cashSales: 0, cashDrops: 0, openingTime: "" });

  // --- INVOICE FORMAT PREFERENCE (Thermal vs Full-Page A4) ---
  const [invoiceFormat, setInvoiceFormatState] = useState(() => {
    return localStorage.getItem("pharmacy_invoice_format") || "thermal";
  });

  const setInvoiceFormat = (format) => {
    setInvoiceFormatState(format);
    localStorage.setItem("pharmacy_invoice_format", format);
    addToast(`Default invoice format set to: ${format === "a4" ? "Full Page (A4)" : "Thermal (80mm)"}`, "info");
  };

  // --- BRANCH CRUD OPERATIONS ---
  const addBranch = (branchData) => {
    const newBranch = {
      id: `BR${Date.now().toString().slice(-4)}`,
      code: branchData.code ? branchData.code.toUpperCase() : `B${branches.length + 1}`,
      name: branchData.name || "New Branch",
      address: branchData.address || "Main Street, City",
      phone: branchData.phone || "+92-000-0000000",
      isHeadquarters: Boolean(branchData.isHeadquarters),
      ...branchData
    };
    
    let updatedBranches = branches;
    if (newBranch.isHeadquarters) {
      updatedBranches = updatedBranches.map((b) => ({ ...b, isHeadquarters: false }));
    }
    updatedBranches = [...updatedBranches, newBranch];
    
    setBranches(updatedBranches);
    logAudit("BRANCH_ADD", `Added new pharmacy branch: ${newBranch.name} (${newBranch.code})`);
    addToast(`Branch "${newBranch.name}" created successfully!`);
    
    api.post("/branches", newBranch).catch(() => {});
    return newBranch;
  };

  const updateBranch = (updatedBranch) => {
    const updatedList = branches.map((b) => {
      if (b.id === updatedBranch.id) {
        return { ...b, ...updatedBranch };
      }
      if (updatedBranch.isHeadquarters && b.id !== updatedBranch.id) {
        return { ...b, isHeadquarters: false };
      }
      return b;
    });
    setBranches(updatedList);
    if (currentBranch.id === updatedBranch.id) {
      setCurrentBranch({ ...currentBranch, ...updatedBranch });
    }
    logAudit("BRANCH_EDIT", `Updated branch details for ${updatedBranch.name}`);
    addToast(`Branch "${updatedBranch.name}" updated successfully!`);
    api.put(`/branches/${updatedBranch.id}`, updatedBranch).catch(() => {});
  };

  const deleteBranch = (branchId) => {
    const target = branches.find((b) => b.id === branchId);
    if (!target) return;
    if (branches.length <= 1) {
      addToast("Cannot delete the only remaining branch!", "warning");
      return;
    }
    if (target.isHeadquarters) {
      addToast("Cannot delete the Headquarters branch. Designate another branch as HQ first.", "warning");
      return;
    }
    const filtered = branches.filter((b) => b.id !== branchId);
    setBranches(filtered);
    if (currentBranch.id === branchId) {
      setCurrentBranch(filtered[0]);
    }
    logAudit("BRANCH_DELETE", `Deleted branch: ${target.name}`);
    addToast(`Branch "${target.name}" removed`, "warning");
    api.delete(`/branches/${branchId}`).catch(() => {});
  };

  // --- DYNAMIC MASTER DROPDOWN DATA ---
  const [masterData, setMasterData] = useState(() => {
    const saved = localStorage.getItem("pharmacy_master_data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_MASTER_DATA,
          ...parsed,
          brands: parsed.brands && parsed.brands.length > 0 ? parsed.brands : DEFAULT_MASTER_DATA.brands
        };
      } catch {}
    }
    return DEFAULT_MASTER_DATA;
  });

  const addMasterItem = (type, item) => {
    if (!item || !item.trim()) return false;
    const trimmed = item.trim();
    if ((masterData[type] || []).some((x) => x.toLowerCase() === trimmed.toLowerCase())) {
      addToast(`"${trimmed}" already exists in ${type}!`, "warning");
      return false;
    }
    setMasterData((prev) => {
      const updated = {
        ...prev,
        [type]: [...(prev[type] || []), trimmed]
      };
      localStorage.setItem("pharmacy_master_data", JSON.stringify(updated));
      return updated;
    });
    logAudit("MASTER_DATA_ADD", `Added new master configuration ${type}: ${trimmed}`);
    addToast(`Added "${trimmed}" to ${type}`);
    return true;
  };

  const removeMasterItem = (type, item) => {
    setMasterData((prev) => {
      const updated = {
        ...prev,
        [type]: (prev[type] || []).filter((x) => x !== item)
      };
      localStorage.setItem("pharmacy_master_data", JSON.stringify(updated));
      return updated;
    });
    logAudit("MASTER_DATA_REMOVE", `Removed ${item} from ${type}`);
    addToast(`Removed "${item}" from ${type}`, "info");
  };

  const resetMasterData = () => {
    setMasterData(DEFAULT_MASTER_DATA);
    localStorage.setItem("pharmacy_master_data", JSON.stringify(DEFAULT_MASTER_DATA));
    addToast("Master dropdown options restored to defaults!", "success");
  };

  // Sync state & Real-time Live API Fetch
  const [syncState, setSyncState] = useState(() => syncService.getStatus());
  const [isOffline, setIsOffline] = useState(false);

  const refreshFromAPI = async () => {
    try {
      const [medsRes, branchRes, custRes, supRes, salesRes, rxRes] = await Promise.allSettled([
        api.get("/medicines"),
        api.get("/branches"),
        api.get("/customers"),
        api.get("/suppliers"),
        api.get("/sales"),
        api.get("/prescriptions")
      ]);

      if (branchRes.status === "fulfilled" && Array.isArray(branchRes.value.data) && branchRes.value.data.length > 0) {
        setBranches(branchRes.value.data);
      }

      // --- MEDICINES SMART MERGE ---
      if (medsRes.status === "fulfilled" && Array.isArray(medsRes.value.data)) {
        const deletedMedIds = getDeletedIds("pharmacy_deleted_medicine_ids");
        const cloudMeds = medsRes.value.data.filter((m) => !deletedMedIds.has(String(m.id)));

        let localMeds = [];
        try {
          const saved = localStorage.getItem("pharmacy_medicines");
          if (saved) localMeds = JSON.parse(saved);
        } catch {
          localMeds = [];
        }

        // 1. For medicines in cloud, smart-merge batches with local counterpart to preserve purchases & stock
        const mergedCloudMeds = cloudMeds.map((cm) => {
          const lm = localMeds.find(
            (l) =>
              String(l.id) === String(cm.id) ||
              (l.name && cm.name && l.name.trim().toLowerCase() === cm.name.trim().toLowerCase())
          );

          const localBatches = (lm?.batches || []).map((b) => ({
            ...b,
            qty: Number(b.qty ?? b.quantity ?? 0),
            quantity: Number(b.qty ?? b.quantity ?? 0)
          }));

          const cloudBatches = (cm.batches || []).map((b) => ({
            ...b,
            qty: Number(b.qty ?? b.quantity ?? 0),
            quantity: Number(b.qty ?? b.quantity ?? 0)
          }));

          // Merge batches: Combine local batches & cloud batches by batchNumber + branchId
          const batchMap = new Map();
          localBatches.forEach((b) => {
            const key = `${b.batchNumber}_${b.branchId || "ALL"}`;
            batchMap.set(key, b);
          });
          cloudBatches.forEach((b) => {
            const key = `${b.batchNumber}_${b.branchId || "ALL"}`;
            const existing = batchMap.get(key);
            if (!existing || Number(b.qty ?? b.quantity ?? 0) > Number(existing.qty ?? existing.quantity ?? 0)) {
              batchMap.set(key, b);
            }
          });

          const finalBatches = Array.from(batchMap.values());
          const totalStock = finalBatches.reduce((acc, b) => acc + Number(b.qty ?? b.quantity ?? 0), 0);

          const isTablet = String(cm.uom || lm?.uom || "").toLowerCase().includes("tablet") || String(cm.category || lm?.category || "").toLowerCase().includes("tablet");
          const resolvedCf = Number(cm.conversionFactor || lm?.conversionFactor || (isTablet ? 10 : 1));

          return {
            ...cm,
            barcode: cm.barcode || lm?.barcode || "",
            costPrice: Number(cm.costPrice || lm?.costPrice || 0),
            sellingPrice: Number(cm.sellingPrice || lm?.sellingPrice || 0),
            conversionFactor: resolvedCf,
            batches: finalBatches,
            stock: totalStock,
            totalStock
          };
        });

        const cloudIdSet = new Set(cloudMeds.map((m) => String(m.id)));
        const cloudNameSet = new Set(cloudMeds.map((m) => (m.name || "").trim().toLowerCase()));

        const localOnlyMeds = localMeds.filter(
          (lm) =>
            !deletedMedIds.has(String(lm.id)) &&
            !cloudIdSet.has(String(lm.id)) &&
            !cloudNameSet.has((lm.name || "").trim().toLowerCase())
        );

        // Auto-push any local-only medicines to cloud backend
        if (localOnlyMeds.length > 0) {
          localOnlyMeds.forEach((lm) => {
            api.post("/medicines", lm).catch(() => {
              syncService.enqueue("MEDICINE", lm.id, "INSERT", lm);
            });
          });
        }

        const mergedMeds = [...mergedCloudMeds, ...localOnlyMeds];
        setMedicines(mergedMeds);
        localStorage.setItem("pharmacy_medicines", JSON.stringify(mergedMeds));
      }

      // --- CUSTOMERS SMART MERGE ---
      if (custRes.status === "fulfilled" && Array.isArray(custRes.value.data)) {
        const deletedCustIds = getDeletedIds("pharmacy_deleted_customer_ids");
        const cloudCusts = custRes.value.data.filter(
          (c) => !deletedCustIds.has(String(c.id)) && !deletedCustIds.has(String(c.name))
        );

        let localCusts = [];
        try {
          const saved = localStorage.getItem("pharmacy_customers");
          if (saved) localCusts = JSON.parse(saved);
        } catch {}

        const cloudCustIdSet = new Set(cloudCusts.map((c) => String(c.id)));
        const localOnlyCusts = localCusts.filter(
          (lc) => !deletedCustIds.has(String(lc.id)) && !cloudCustIdSet.has(String(lc.id))
        );

        if (localOnlyCusts.length > 0) {
          localOnlyCusts.forEach((lc) => {
            api.post("/customers", lc).catch(() => {
              syncService.enqueue("CUSTOMER", lc.id, "INSERT", lc);
            });
          });
        }

        const mergedCusts = [...cloudCusts, ...localOnlyCusts];
        setCustomers(mergedCusts);
        localStorage.setItem("pharmacy_customers", JSON.stringify(mergedCusts));
      }

      // --- SUPPLIERS SMART MERGE ---
      if (supRes.status === "fulfilled" && Array.isArray(supRes.value.data)) {
        const deletedSupIds = getDeletedIds("pharmacy_deleted_supplier_ids");
        const cloudSuppliers = supRes.value.data.filter(
          (s) => !deletedSupIds.has(String(s.id)) && !deletedSupIds.has(String(s.name))
        );

        let localSups = [];
        try {
          const saved = localStorage.getItem("pharmacy_suppliers");
          if (saved) localSups = JSON.parse(saved);
        } catch {}

        const cloudSupIdSet = new Set(cloudSuppliers.map((s) => String(s.id)));
        const localOnlySups = localSups.filter(
          (ls) => !deletedSupIds.has(String(ls.id)) && !cloudSupIdSet.has(String(ls.id))
        );

        if (localOnlySups.length > 0) {
          localOnlySups.forEach((ls) => {
            api.post("/suppliers", ls).catch(() => {
              syncService.enqueue("SUPPLIER", ls.id, "INSERT", ls);
            });
          });
        }

        const mergedSuppliers = [...cloudSuppliers, ...localOnlySups];
        setSuppliers(mergedSuppliers);
        localStorage.setItem("pharmacy_suppliers", JSON.stringify(mergedSuppliers));
      }

      // --- SALES SMART MERGE ---
      if (salesRes.status === "fulfilled" && Array.isArray(salesRes.value.data)) {
        const deletedSaleIds = getDeletedIds("pharmacy_deleted_sale_ids");
        const normalizedSales = salesRes.value.data
          .map((s) => {
            const rawItems = s.items || [];
            const normalizedItems = rawItems.map((it) => {
              const medId = it.medicineId || it.id || (it.medicine ? it.medicine.id : "");
              const name = it.name || (it.medicine ? it.medicine.name : "") || "Medicine Item";
              const qty = Number(it.qty ?? it.quantity ?? 1);
              const price = Number(it.price ?? it.unitPrice ?? it.sellingPrice ?? (it.medicine ? it.medicine.sellingPrice : 0) ?? 0);
              const returnedQty = Number(it.returnedQty || 0);
              const total = Number(it.total ?? (qty * price));
              return {
                ...it,
                medicineId: medId,
                id: medId,
                name,
                qty,
                quantity: qty,
                price,
                unitPrice: price,
                sellingPrice: price,
                returnedQty,
                total,
                saleType: it.saleType || "Pack",
                conversionFactor: Number(it.conversionFactor || (it.medicine ? it.medicine.conversionFactor : 10) || 10)
              };
            });

            return {
              ...s,
              invoiceNo: s.invoiceNo || s.invoiceNumber || s.id || `INV-${Date.now()}`,
              invoiceNumber: s.invoiceNo || s.invoiceNumber || s.id || `INV-${Date.now()}`,
              date: s.date || s.createdAt || new Date().toISOString(),
              total: Number(s.total ?? s.totalAmount ?? s.paidAmount ?? 0),
              subtotal: Number(s.subtotal ?? s.subTotal ?? s.totalAmount ?? 0),
              isReturn: Boolean(s.isReturn || s.type === "RETURN" || (s.invoiceNumber && s.invoiceNumber.startsWith("RET-")) || (s.invoiceNo && s.invoiceNo.startsWith("RET-"))),
              customerName: s.customerName || (s.customer ? s.customer.name : "Walk-in Customer"),
              customerContact: s.customerContact || (s.customer ? s.customer.phone : "N/A"),
              cashier: s.cashier || (s.user ? s.user.name : "Cashier"),
              items: normalizedItems
            };
          })
          .filter((s) => !deletedSaleIds.has(String(s.invoiceNo)) && !deletedSaleIds.has(String(s.id)));

        let localSales = [];
        try {
          const saved = localStorage.getItem("pharmacy_sales");
          if (saved) localSales = JSON.parse(saved);
        } catch {}

        const cloudInvoiceSet = new Set(normalizedSales.map((s) => String(s.invoiceNo || s.id)));
        const localOnlySales = localSales.filter(
          (ls) => !deletedSaleIds.has(String(ls.invoiceNo || ls.id)) && !cloudInvoiceSet.has(String(ls.invoiceNo || ls.id))
        );

        const mergedSales = [...normalizedSales, ...localOnlySales];
        setSales(mergedSales);
        localStorage.setItem("pharmacy_sales", JSON.stringify(mergedSales));
      }

      if (rxRes.status === "fulfilled" && Array.isArray(rxRes.value.data)) {
        setPrescriptions(rxRes.value.data);
      }
    } catch (err) {
      console.warn("[AppContext] Live API sync notice:", err.message);
    }
  };

  useEffect(() => {
    refreshFromAPI();

    const unsubscribe = syncService.subscribe((state) => {
      setSyncState(state);
      setIsOffline(!state.isOnline);
    });
    syncService.startAutoSync(25000);

    const handleSyncComplete = () => {
      refreshFromAPI();
    };
    window.addEventListener("pharmacy_sync_completed", handleSyncComplete);

    return () => {
      unsubscribe();
      syncService.stopAutoSync();
      window.removeEventListener("pharmacy_sync_completed", handleSyncComplete);
    };
  }, []);

  // Sync to Local Storage
  useEffect(() => {
    localStorage.setItem("pharmacy_branches", JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem("pharmacy_currentBranch", JSON.stringify(currentBranch));
  }, [currentBranch]);

  useEffect(() => {
    localStorage.setItem("pharmacy_currentUser", JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("pharmacy_medicines", JSON.stringify(medicines));
  }, [medicines]);

  useEffect(() => {
    localStorage.setItem("pharmacy_suppliers", JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem("pharmacy_customers", JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem("pharmacy_prescriptions", JSON.stringify(prescriptions));
  }, [prescriptions]);

  useEffect(() => {
    localStorage.setItem("pharmacy_sales", JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem("pharmacy_purchases", JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem("pharmacy_employees", JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem("pharmacy_expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("pharmacy_audit_logs", JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem("pharmacy_held_invoices", JSON.stringify(heldInvoices));
  }, [heldInvoices]);

  useEffect(() => {
    localStorage.setItem("pharmacy_offline_queue", JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  // --- TOAST NOTIFICATIONS ---
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- BARCODE & QR CODE SCANNING ENGINE ---
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [pendingScannedBarcode, setPendingScannedBarcode] = useState("");

  const openScannerModal = () => setIsScannerModalOpen(true);
  const closeScannerModal = () => setIsScannerModalOpen(false);

  const handleGlobalScan = useCallback((scannedCode) => {
    if (!scannedCode) return;
    const cleanCode = String(scannedCode).trim();
    if (!cleanCode) return;

    // Check existing medicines by barcode, id, or substring
    const matched = medicines.find((m) => {
      const b = (m.barcode || "").trim().toLowerCase();
      const id = (m.id || "").trim().toLowerCase();
      const target = cleanCode.toLowerCase();
      return b === target || id === target || (b && b.length >= 4 && target.includes(b));
    });

    if (matched) {
      soundEffects.playScanSuccess();
      addToast(`Scanned: "${matched.name}" (${matched.barcode || matched.id})`, "success");
      logAudit("BARCODE_SCAN_MATCH", `Scanned known product: ${matched.name} (${cleanCode})`);
      window.dispatchEvent(new CustomEvent("pharmacy_pos_add_scanned", { detail: matched }));
    } else {
      soundEffects.playNewBarcodeChime();
      setPendingScannedBarcode(cleanCode);
      addToast(`New Barcode/QR detected ("${cleanCode}"). Opening Add Medicine to link permanently!`, "info");
      logAudit("BARCODE_SCAN_NEW", `Detected unregistered code: ${cleanCode}`);
      window.dispatchEvent(new CustomEvent("pharmacy_open_add_medicine_modal", { detail: { barcode: cleanCode } }));
    }
  }, [medicines]);

  // --- SECURITY AUDIT LOGGER ---
  const logAudit = (action, details) => {
    const newLog = {
      id: `LOG${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser ? currentUser.name : "System / Guest",
      action,
      details
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // --- ROLE SWITCH ---
  const changeRole = (roleName) => {
    const user = DEFAULT_USERS.find((u) => u.role === roleName);
    if (user) {
      setCurrentUser(user);
      logAudit("ROLE_SWITCH", `Switched active simulation to ${roleName}`);
      addToast(`Switched view to ${roleName} role`, "info");
    }
  };

  const triggerManualSync = async () => {
    addToast("Initiating Cloud Synchronization...", "info");
    const result = await syncService.syncNow();
    if (result.success) {
      addToast("System synchronized with Cloud Database! 🟢", "success");
      logAudit("CLOUD_SYNC", "Manual synchronization completed successfully.");
      await refreshFromAPI();
    } else {
      addToast(`Sync paused: ${result.reason || result.error || "Operating in Offline Mode"} 🔴`, "warning");
    }
    return result;
  };

  const toggleOffline = (status) => {
    setIsOffline(status);
    syncService.handleNetworkChange(!status);
    logAudit("OFFLINE_TOGGLE", `System network status manually set to ${status ? "Offline" : "Online"}`);
    addToast(`Network Mode: ${status ? "OFFLINE (Local Store)" : "ONLINE (Auto-Syncing)"}`);
  };

  // --- MEDICINE CATALOG OPERATIONS ---
  const addMedicine = (medData) => {
    const isTablet = String(medData.uom || "").toLowerCase().includes("tablet") || String(medData.category || "").toLowerCase().includes("tablet");
    const cf = parseInt(medData.conversionFactor) || (isTablet ? 10 : 1);
    const newMed = {
      id: `MED${Date.now().toString().slice(-4)}`,
      batches: medData.batches || [],
      isRecalled: false,
      alternatives: medData.alternatives || [],
      manufacturer: medData.manufacturer || "Generic Pharma",
      ...medData,
      conversionFactor: cf,
      costPrice: parseFloat(medData.costPrice) || 0,
      sellingPrice: parseFloat(medData.sellingPrice) || 0,
      reorderLevel: parseInt(medData.reorderLevel) || 0
    };
    setMedicines((prev) => [newMed, ...prev]);
    logAudit("MEDICINE_ADD", `Added medicine ${newMed.name}`);
    addToast(`Medicine "${newMed.name}" added successfully`);

    // Live API Sync
    api.post("/medicines", newMed).catch((err) => {
      syncService.enqueue("MEDICINE", newMed.id, "INSERT", newMed);
    });

    return newMed;
  };

  const updateMedicine = (updatedMed) => {
    const newPrice = parseFloat(updatedMed.sellingPrice);
    let fullUpdatedMed = updatedMed;

    setMedicines((prev) => {
      const updated = prev.map((m) => {
        if (m.id === updatedMed.id) {
          logAudit("MEDICINE_EDIT", `Modified attributes for ${updatedMed.name}`);
          // Also update active batches sellingPrice so POS and inventory batches use the new selling price!
          const updatedBatches = (m.batches || []).map((b) => ({
            ...b,
            sellingPrice: !isNaN(newPrice) && newPrice > 0 ? newPrice : b.sellingPrice
          }));
          fullUpdatedMed = {
            ...m,
            ...updatedMed,
            sellingPrice: !isNaN(newPrice) && newPrice > 0 ? newPrice : (updatedMed.sellingPrice || m.sellingPrice),
            batches: updatedBatches
          };
          return fullUpdatedMed;
        }
        return m;
      });
      localStorage.setItem("pharmacy_medicines", JSON.stringify(updated));
      return updated;
    });

    addToast(`Medicine "${updatedMed.name}" updated successfully`);
    api.put(`/medicines/${updatedMed.id}`, fullUpdatedMed).catch(() => {});
  };

  const deleteMedicine = (id) => {
    addDeletedId("pharmacy_deleted_medicine_ids", id);
    const med = medicines.find((m) => m.id === id);
    setMedicines((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      localStorage.setItem("pharmacy_medicines", JSON.stringify(updated));
      return updated;
    });
    logAudit("MEDICINE_DELETE", `Removed medicine ${med?.name || id} from database`);
    addToast(`Medicine "${med?.name || id}" removed from catalog`, "warning");
    api.delete(`/medicines/${id}`).catch(() => {
      syncService.enqueue("MEDICINE", id, "DELETE", { id });
    });
  };

  // --- STOCK ADJUSTMENT ---
  const adjustStock = (medicineId, batchNumber, deltaQty, reason) => {
    setMedicines((prev) =>
      prev.map((med) => {
        if (med.id !== medicineId) return med;

        let batchExists = false;
        const updatedBatches = (med.batches || []).map((batch) => {
          if (batch.batchNumber === batchNumber && batch.branchId === currentBranch.id) {
            batchExists = true;
            const currentQty = Number(batch.qty || batch.quantity) || 0;
            return { ...batch, qty: Math.max(0, currentQty + deltaQty), quantity: Math.max(0, currentQty + deltaQty) };
          }
          return batch;
        });

        if (!batchExists && deltaQty > 0) {
          updatedBatches.push({
            batchNumber,
            qty: deltaQty,
            quantity: deltaQty,
            branchId: currentBranch.id,
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            rack: "Rack A",
            shelf: "Shelf 1"
          });
        }

        logAudit("STOCK_ADJUSTMENT", `Adjusted stock for ${med.name} (Batch ${batchNumber}) by ${deltaQty} units. Reason: ${reason}`);
        const updatedMed = { ...med, batches: updatedBatches };
        api.put(`/medicines/${med.id}`, updatedMed).catch(() => {});
        return updatedMed;
      })
    );

    addToast(`Stock adjusted for ${deltaQty > 0 ? "addition" : "loss"} (${reason})`);
  };

  // --- SUPPLIER OPERATIONS ---
  const addSupplier = (supData) => {
    const openingBal = parseFloat(supData.openingBalance || supData.balance) || 0.00;
    const newSup = {
      id: `SUP${Date.now().toString().slice(-4)}`,
      balance: openingBal,
      openingBalance: openingBal,
      ...supData
    };
    setSuppliers((prev) => {
      const updated = [newSup, ...prev];
      localStorage.setItem("pharmacy_suppliers", JSON.stringify(updated));
      return updated;
    });
    logAudit("SUPPLIER_ADD", `Registered supplier ${newSup.name} (Opening Balance: Rs. ${openingBal.toFixed(2)})`);
    addToast(`Supplier "${newSup.name}" registered with balance Rs. ${openingBal.toFixed(2)}`);

    api.post("/suppliers", newSup).catch(() => {
      syncService.enqueue("SUPPLIER", newSup.id, "INSERT", newSup);
    });
    return newSup;
  };

  const updateSupplier = (updatedSup) => {
    setSuppliers((prev) => {
      const updated = prev.map((s) => (s.id === updatedSup.id ? updatedSup : s));
      localStorage.setItem("pharmacy_suppliers", JSON.stringify(updated));
      return updated;
    });
    addToast(`Supplier "${updatedSup.name}" updated`);
  };

  const deleteSupplier = (supplierId) => {
    let deletedName = "Supplier";
    addDeletedId("pharmacy_deleted_supplier_ids", supplierId);
    setSuppliers((prev) => {
      const sup = prev.find((s) => s.id === supplierId);
      if (sup) {
        deletedName = sup.name;
        addDeletedId("pharmacy_deleted_supplier_ids", sup.name);
      }
      const updated = prev.filter((s) => s.id !== supplierId);
      localStorage.setItem("pharmacy_suppliers", JSON.stringify(updated));
      return updated;
    });
    logAudit("SUPPLIER_DELETE", `Deleted supplier ${deletedName} (ID: ${supplierId})`);
    addToast(`Supplier "${deletedName}" deleted permanently!`, "info");
    api.delete(`/suppliers/${supplierId}`).catch(() => {
      syncService.enqueue("SUPPLIER", supplierId, "DELETE", { id: supplierId });
    });
  };

  const paySupplier = (supplierId, amount, details = {}) => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return;

    let targetSupplierName = "Supplier";
    let targetNewBal = 0;

    setSuppliers((prev) => {
      const updated = prev.map((s) => {
        if (s.id === supplierId) {
          targetSupplierName = s.name;
          const newBal = (s.balance || 0) - numAmount;
          targetNewBal = newBal;
          return {
            ...s,
            balance: newBal
          };
        }
        return s;
      });
      localStorage.setItem("pharmacy_suppliers", JSON.stringify(updated));
      return updated;
    });

    // Also record an expense / ledger audit entry
    const newExpense = {
      id: `EXP-SUP-${Date.now().toString().slice(-6)}`,
      category: "Supplier Payment",
      amount: numAmount,
      date: details.date || new Date().toISOString(),
      recipient: targetSupplierName,
      paymentMethod: details.paymentMethod || "Cash in Hand",
      reference: details.reference || `Payment to ${targetSupplierName}`,
      notes: details.notes || `Supplier Ledger payment. Remaining balance: Rs. ${targetNewBal.toFixed(2)}`,
      recordedBy: currentUser ? currentUser.name : "Admin"
    };

    setExpenses((prev) => {
      const updated = [newExpense, ...prev];
      localStorage.setItem("pharmacy_expenses", JSON.stringify(updated));
      return updated;
    });

    logAudit("SUPPLIER_PAYMENT", `Paid supplier ${targetSupplierName}: Rs. ${numAmount.toFixed(2)} via ${details.paymentMethod || "Cash"}. New Balance: Rs. ${targetNewBal.toFixed(2)}`);
    addToast(`Payment of Rs. ${numAmount.toFixed(2)} recorded for "${targetSupplierName}". Remaining balance: Rs. ${targetNewBal.toFixed(2)}`, "success");
  };

  // --- CUSTOMER OPERATIONS ---
  const addCustomer = (custData) => {
    const newCust = {
      id: `CUST${Date.now().toString().slice(-4)}`,
      balance: 0.00,
      loyaltyPoints: 0,
      creditLimit: parseFloat(custData.creditLimit) || 300.00,
      ...custData
    };
    setCustomers((prev) => [newCust, ...prev]);
    logAudit("CUSTOMER_ADD", `Registered customer account ${newCust.name}`);
    addToast(`Customer "${newCust.name}" registered`);

    api.post("/customers", newCust).catch(() => {
      syncService.enqueue("CUSTOMER", newCust.id, "INSERT", newCust);
    });

    return newCust;
  };

  const updateCustomer = (updatedCust) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updatedCust.id ? updatedCust : c))
    );
    addToast(`Customer "${updatedCust.name}" updated`);
  };

  const collectCustomerPayment = (customerId, amount) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const newBal = Math.max(0, c.balance - amount);
          logAudit("CUSTOMER_CREDIT_RECOVERY", `Collected receivables from customer ${c.name}: Rs. ${amount.toFixed(2)}`);
          return { ...c, balance: newBal };
        }
        return c;
      })
    );
  };

  const deleteCustomer = (customerId) => {
    addDeletedId("pharmacy_deleted_customer_ids", customerId);
    let deletedName = "Customer";
    setCustomers((prev) => {
      const cust = prev.find((c) => c.id === customerId);
      if (cust) {
        deletedName = cust.name;
        addDeletedId("pharmacy_deleted_customer_ids", cust.name);
      }
      const updated = prev.filter((c) => c.id !== customerId);
      localStorage.setItem("pharmacy_customers", JSON.stringify(updated));
      return updated;
    });
    logAudit("CUSTOMER_DELETE", `Deleted customer ${deletedName} (ID: ${customerId})`);
    addToast(`Customer "${deletedName}" deleted permanently!`, "info");
    api.delete(`/customers/${customerId}`).catch(() => {
      syncService.enqueue("CUSTOMER", customerId, "DELETE", { id: customerId });
    });
  };

  // --- POS CHECKOUT ---
  const checkoutPOS = (cart, customerId, paymentMethod, discountFlat = 0, discountPercent = 0, rxId = null, amountPaid = null, editInvoiceNo = null) => {
    let subtotal = cart.reduce((acc, item) => acc + item.sellingPrice * item.quantity, 0);
    let discount = parseFloat(discountFlat) || 0;
    if (discountPercent > 0) {
      discount += (subtotal - discount) * (parseFloat(discountPercent) / 100);
    }
    discount = Math.min(subtotal, discount);
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * taxRate;
    const total = taxableAmount + tax;

    let customerName = "Walk-in Customer";
    let customerContact = "N/A";
    const paidVal = amountPaid !== null ? parseFloat(amountPaid) : total;
    const unpaidCredit = Math.max(0, total - paidVal);

    if (customerId) {
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        customerName = customer.name;
        customerContact = customer.phone || "N/A";
      }
    }

    const newInvoice = {
      invoiceNo: editInvoiceNo || `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      customerName,
      customerContact,
      customerId: customerId || null,
      amountPaid: paidVal,
      change: amountPaid !== null ? Math.max(0, parseFloat(amountPaid) - total) : 0,
      items: cart.map((item) => ({
        medicineId: item.id || item.medicineId,
        name: item.name,
        qty: Number(item.quantity || item.qty || 1),
        saleType: item.saleType || "Pack",
        conversionFactor: Number(item.conversionFactor || 10),
        price: item.sellingPrice,
        discount: 0,
        tax: item.sellingPrice * (item.quantity || item.qty || 1) * taxRate,
        total: item.sellingPrice * (item.quantity || item.qty || 1) * (1 + taxRate)
      })),
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      cashier: currentUser ? currentUser.name : "System",
      branch: currentBranch.name
    };

    setSales((prev) => {
      const updated = [newInvoice, ...prev];
      localStorage.setItem("pharmacy_sales", JSON.stringify(updated));
      return updated;
    });

    // Deduct stock from batches (Batch-specific and FIFO deduction)
    setMedicines((prevMeds) => {
      const updated = prevMeds.map((med) => {
        const cartItem = cart.find((item) => item.id === med.id || item.medicineId === med.id);
        if (!cartItem) return med;

        let neededUnits = Number(cartItem.quantity || cartItem.qty || 1);
        if (cartItem.saleType === "Pack" && (med.conversionFactor || 10) > 1) {
          neededUnits *= (med.conversionFactor || 10);
        }

        const existingBatches = [...(med.batches || [])];

        // 1. If a specific batch was selected on the cart item, deduct from that batch first
        if (cartItem.batchNumber) {
          const specificIdx = existingBatches.findIndex(
            (b) => b.batchNumber === cartItem.batchNumber && (!b.branchId || b.branchId === currentBranch.id)
          );
          if (specificIdx >= 0) {
            const b = existingBatches[specificIdx];
            const currentQty = Number(b.qty ?? b.quantity ?? 0);
            const deduct = Math.min(currentQty, neededUnits);
            existingBatches[specificIdx] = {
              ...b,
              qty: Math.max(0, currentQty - deduct),
              quantity: Math.max(0, currentQty - deduct)
            };
            neededUnits -= deduct;
          }
        }

        // 2. FIFO deduction for any remaining needed units
        if (neededUnits > 0) {
          const activeIndices = existingBatches
            .map((b, idx) => ({ b, idx }))
            .filter(({ b }) => (!b.branchId || b.branchId === currentBranch.id) && Number(b.qty ?? b.quantity ?? 0) > 0)
            .sort((a, b) => new Date(a.b.expiryDate || "9999-12-31") - new Date(b.b.expiryDate || "9999-12-31"));

          for (const { idx } of activeIndices) {
            if (neededUnits <= 0) break;
            const b = existingBatches[idx];
            const currentQty = Number(b.qty ?? b.quantity ?? 0);
            const deduct = Math.min(currentQty, neededUnits);
            existingBatches[idx] = {
              ...b,
              qty: Math.max(0, currentQty - deduct),
              quantity: Math.max(0, currentQty - deduct)
            };
            neededUnits -= deduct;
          }
        }

        const newTotalStock = existingBatches
          .filter((b) => !b.branchId || b.branchId === currentBranch.id)
          .reduce((acc, b) => acc + Number(b.qty ?? b.quantity ?? 0), 0);

        return {
          ...med,
          stock: newTotalStock,
          batches: existingBatches
        };
      });

      localStorage.setItem("pharmacy_medicines", JSON.stringify(updated));
      return updated;
    });

    logAudit("POS_CHECKOUT", `Completed sale checkout ${newInvoice.invoiceNo}. Grand Total: Rs. ${total.toFixed(2)}`);
    addToast(`POS invoice ${newInvoice.invoiceNo} checked out!`);

    // Auto sync to cloud API
    try {
      syncService.enqueue("SALE", newInvoice.invoiceNo, "INSERT", {
        branchId: currentBranch.id,
        customerId: newInvoice.customerId,
        userId: currentUser?.id,
        subTotal: newInvoice.subtotal,
        taxAmount: newInvoice.tax,
        discountAmount: newInvoice.discount,
        totalAmount: newInvoice.total,
        paidAmount: newInvoice.amountPaid,
        changeAmount: newInvoice.change,
        paymentMethod: newInvoice.paymentMethod,
        paymentStatus: unpaidCredit > 0 ? "Partial" : "Paid",
        notes: `Customer: ${newInvoice.customerName}`,
        items: newInvoice.items.map((it) => ({
          medicineId: it.medicineId,
          batchNumber: null,
          quantity: it.qty,
          unitPrice: it.price,
          costPrice: it.price * 0.7,
          discount: it.discount,
          total: it.total
        }))
      });
    } catch (err) {
      console.warn("Failed to auto-enqueue sale for sync:", err);
    }

    return newInvoice;
  };

  // --- POS RETURN & RESTOCK ---
  const checkoutReturnPOS = (
    returnCart,
    customerId = null,
    returnReason = "Customer Return",
    originalInvoiceNo = null,
    customReturnDate = null
  ) => {
    if (!returnCart || returnCart.length === 0) {
      addToast("Return cart is empty!", "warning");
      return null;
    }

    const normalizeInv = (no) => String(no || "").replace(/^[#\s]+/, "").trim().toLowerCase();
    const cleanOrigInv = normalizeInv(originalInvoiceNo);

    // 0. Anti-duplicate / Over-return validation if linked to an original invoice
    const origSale = cleanOrigInv
      ? sales.find((s) => normalizeInv(s.invoiceNo || s.invoiceNumber || s.id) === cleanOrigInv)
      : null;

    let subtotal = 0;
    const processedCart = returnCart.map((item) => {
      const medId = String(item.medicineId || item.id || "");
      const origItem = origSale ? (origSale.items || []).find((it) => String(it.medicineId || it.id || "") === medId || it.name === item.name) : null;
      
      let returnQty = Number(item.quantity ?? item.qty ?? 1);
      if (origItem) {
        const alreadyReturned = origItem.returnedQty || 0;
        const maxReturnable = Math.max(0, (origItem.qty || origItem.quantity || 1) - alreadyReturned);
        if (returnQty > maxReturnable) {
          returnQty = maxReturnable; // Auto-clamp safely!
        }
      }

      const price = Number(item.sellingPrice ?? item.price ?? (origItem ? origItem.price : 0) ?? 0);
      subtotal += price * returnQty;

      return {
        medicineId: medId,
        id: medId,
        name: item.name || (origItem ? origItem.name : "Medicine"),
        qty: returnQty,
        quantity: returnQty,
        price,
        sellingPrice: price,
        saleType: item.saleType || (origItem ? origItem.saleType : "Pack") || "Pack",
        conversionFactor: item.conversionFactor || (origItem ? origItem.conversionFactor : 10) || 10,
        tax: price * returnQty * taxRate,
        total: price * returnQty * (1 + taxRate)
      };
    });

    const tax = subtotal * taxRate;
    const totalRefund = subtotal + tax;

    // Filter out items with 0 return quantity
    const validProcessedCart = processedCart.filter((it) => (it.qty || 0) > 0);
    const totalValidUnits = validProcessedCart.reduce((acc, it) => acc + (it.qty || 0), 0);

    // STRICT CHECK: Cannot process return if 0 units remain or refund is 0!
    if (validProcessedCart.length === 0 || totalValidUnits <= 0 || totalRefund <= 0) {
      addToast(
        cleanOrigInv
          ? `Invoice #${originalInvoiceNo} is already fully returned (0 returnable items remaining). No refund issued.`
          : "Cannot process return: Return quantity and refund amount must be greater than 0.",
        "warning"
      );
      return null;
    }

    let customerName = "Walk-in Customer";
    let customerContact = "N/A";

    if (customerId) {
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        customerName = customer.name;
        customerContact = customer.phone || "N/A";
      }
    } else if (origSale && origSale.customerName) {
      customerName = origSale.customerName;
      customerContact = origSale.customerContact || "N/A";
    }

    const returnInvoiceNo = `RET-${Date.now().toString().slice(-6)}`;
    const returnDateStr = customReturnDate ? new Date(customReturnDate).toISOString() : new Date().toISOString();

    const returnInvoice = {
      invoiceNo: returnInvoiceNo,
      invoiceNumber: returnInvoiceNo,
      id: returnInvoiceNo,
      type: "RETURN",
      isReturn: true,
      originalInvoiceNo: originalInvoiceNo ? String(originalInvoiceNo).replace(/^[#\s]+/, "") : null,
      date: returnDateStr,
      customerName,
      customerContact,
      customerId: customerId || (origSale ? origSale.customerId : null) || null,
      amountPaid: totalRefund,
      change: 0,
      returnReason: returnReason || (originalInvoiceNo ? `Returned from Invoice #${originalInvoiceNo}` : "Direct POS Return"),
      items: validProcessedCart,
      subtotal,
      discount: 0,
      tax,
      total: totalRefund,
      totalAmount: totalRefund,
      paymentMethod: "Cash Refund",
      cashier: currentUser ? currentUser.name : "System",
      branch: currentBranch.name
    };

    // 1. Restock medicine inventory: add back returned quantities into stock & batches
    setMedicines((prevMeds) => {
      const updated = prevMeds.map((med) => {
        const returnedItem = processedCart.find(
          (it) => it.medicineId === med.id || it.id === med.id || it.name === med.name
        );
        if (!returnedItem) return med;

        const rawQty = Number(returnedItem.quantity || returnedItem.qty || 0);
        if (rawQty <= 0) return med;

        const cf = Number(med.conversionFactor) || 10;
        const isPack = returnedItem.saleType === "Pack" || (!returnedItem.saleType && returnedItem.price >= (med.sellingPrice * 0.7));
        const qtyToAdd = (isPack && cf > 1) ? (rawQty * cf) : rawQty;

        const existingBatches = med.batches || [];
        let updatedBatches;
        const branchBatchIdx = existingBatches.findIndex(
          (b) => (!b.branchId || b.branchId === currentBranch.id) && (!b.expiryDate || new Date(b.expiryDate) > new Date())
        );

        if (branchBatchIdx >= 0) {
          updatedBatches = existingBatches.map((b, idx) => {
            if (idx === branchBatchIdx) {
              const currentQty = Number(b.qty ?? b.quantity ?? 0);
              return {
                ...b,
                qty: currentQty + qtyToAdd,
                quantity: currentQty + qtyToAdd
              };
            }
            return b;
          });
        } else {
          const batchNumber = `RET-BAT-${Date.now().toString().slice(-4)}`;
          const newBatch = {
            batchNumber,
            expiryDate: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            qty: qtyToAdd,
            quantity: qtyToAdd,
            branchId: currentBranch.id,
            rack: "Rack A",
            shelf: "Shelf 1"
          };
          updatedBatches = [...existingBatches, newBatch];
        }

        const newStock = updatedBatches
          .filter((b) => !b.branchId || b.branchId === currentBranch.id)
          .reduce((acc, curr) => acc + Number(curr.qty ?? curr.quantity ?? 0), 0);

        return {
          ...med,
          stock: newStock,
          batches: updatedBatches
        };
      });

      localStorage.setItem("pharmacy_medicines", JSON.stringify(updated));
      return updated;
    });

    // 2. Adjust Customer balance if customer had credit dues
    if (customerId) {
      setCustomers((prevCusts) => {
        const updated = prevCusts.map((c) => {
          if (c.id === customerId) {
            return {
              ...c,
              balance: Math.max(0, c.balance - totalRefund)
            };
          }
          return c;
        });
        localStorage.setItem("pharmacy_customers", JSON.stringify(updated));
        return updated;
      });
    }

    // 3. Update original invoice in sales if linked to record returned quantities & status
    if (cleanOrigInv) {
      setSales((prevSales) => {
        const updated = prevSales.map((sale) => {
          if (normalizeInv(sale.invoiceNo || sale.invoiceNumber || sale.id) === cleanOrigInv) {
            const updatedItems = (sale.items || []).map((it) => {
              const returnedItem = processedCart.find(
                (rc) => String(rc.medicineId || rc.id) === String(it.medicineId || it.id) || rc.name === it.name
              );
              if (returnedItem) {
                const qtyReturnedNow = Number(returnedItem.quantity || returnedItem.qty || 1);
                return {
                  ...it,
                  returnedQty: (it.returnedQty || 0) + qtyReturnedNow
                };
              }
              return it;
            });

            const isAllReturned = updatedItems.every(
              (it) => (it.returnedQty || 0) >= (it.qty || it.quantity || 1)
            );
            const isAnyReturned = updatedItems.some(
              (it) => (it.returnedQty || 0) > 0
            );

            return {
              ...sale,
              items: updatedItems,
              returnStatus: isAllReturned
                ? "Fully Returned"
                : isAnyReturned
                ? "Partially Returned"
                : sale.returnStatus,
              isFullyReturned: isAllReturned,
              isPartiallyReturned: isAnyReturned
            };
          }
          return sale;
        });
        return [returnInvoice, ...updated];
      });
    } else {
      setSales((prev) => [returnInvoice, ...prev]);
    }

    // 4. Update salesReturns state (so Returns page and ledger show the records immediately)
    setSalesReturns((prev) => {
      const updated = [returnInvoice, ...prev];
      localStorage.setItem("pharmacy_sales_returns", JSON.stringify(updated));
      return updated;
    });

    logAudit(
      "POS_RETURN",
      `Processed return ${returnInvoice.invoiceNo} (Ref: ${originalInvoiceNo || "Manual"}). Refunded: Rs. ${totalRefund.toFixed(2)}`
    );
    addToast(
      `Return processed! Voucher: ${returnInvoice.invoiceNo}. Total Refund: ${formatCurrency(totalRefund)} & Stock Restocked.`,
      "success"
    );

    return returnInvoice;
  };

  // --- UNIFIED PROCESS RETURN METHOD (For Returns.jsx) ---
  const processReturn = (invoiceNo, returnItems, reason) => {
    const origSale = sales.find((s) => (s.invoiceNo || s.invoiceNumber || s.id) === invoiceNo);
    
    const formattedCart = returnItems.map((it) => {
      const origItem = origSale ? (origSale.items || []).find((x) => x.medicineId === it.medicineId) : null;
      const returnQty = Number(it.qtyToReturn || it.qty || 1);
      const isPack = origItem ? (origItem.saleType === "Pack" || origItem.saleType === undefined) : true;
      const unitPrice = it.refundAmount && returnQty ? (it.refundAmount / returnQty) / (1 + taxRate) : (it.price || (origItem ? origItem.price : 0));

      return {
        medicineId: it.medicineId,
        name: it.name,
        quantity: returnQty,
        qty: returnQty,
        saleType: origItem ? (origItem.saleType || "Pack") : (isPack ? "Pack" : "Tablet"),
        conversionFactor: origItem ? (origItem.conversionFactor || 10) : 10,
        sellingPrice: unitPrice,
        price: unitPrice
      };
    });

    const customerId = origSale ? origSale.customerId : null;
    return checkoutReturnPOS(formattedCart, customerId, reason, invoiceNo, null);
  };

  // --- INVOICE DELETION (SINGLE & BULK) ---
  const deleteInvoice = (invoiceNo, restockInventory = false) => {
    if (!invoiceNo) return;
    addDeletedId("pharmacy_deleted_sale_ids", invoiceNo);
    
    // If restock requested, return medicine quantities to stock
    if (restockInventory) {
      const targetSale = sales.find((s) => (s.invoiceNo || s.invoiceNumber || s.id) === invoiceNo);
      if (targetSale && targetSale.items && !targetSale.isReturn) {
        setMedicines((prevMeds) => {
          const updated = prevMeds.map((med) => {
            const saleItem = targetSale.items.find((it) => (it.medicineId || it.id) === med.id);
            if (!saleItem) return med;
            const cf = Number(med.conversionFactor || 10);
            const isPack = saleItem.saleType === "Pack" || (!saleItem.saleType && saleItem.price >= (med.sellingPrice * 0.7));
            const rawQty = Number(saleItem.qty || saleItem.quantity || 1);
            const qtyToAdd = (isPack && cf > 1) ? (rawQty * cf) : rawQty;

            const existingBatches = med.batches || [];
            let updatedBatches;
            const branchBatchIdx = existingBatches.findIndex(
              (b) => (!b.branchId || b.branchId === currentBranch.id) && (!b.expiryDate || new Date(b.expiryDate) > new Date())
            );
            if (branchBatchIdx >= 0) {
              updatedBatches = existingBatches.map((b, idx) => idx === branchBatchIdx ? { ...b, qty: Number(b.qty ?? b.quantity ?? 0) + qtyToAdd, quantity: Number(b.qty ?? b.quantity ?? 0) + qtyToAdd } : b);
            } else {
              const newBatch = {
                batchNumber: `RESTOCK-${Date.now().toString().slice(-4)}`,
                expiryDate: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                qty: qtyToAdd,
                quantity: qtyToAdd,
                branchId: currentBranch.id,
                rack: "Rack A",
                shelf: "Shelf 1"
              };
              updatedBatches = [...existingBatches, newBatch];
            }
            const newStock = updatedBatches.filter((b) => !b.branchId || b.branchId === currentBranch.id).reduce((acc, curr) => acc + Number(curr.qty ?? curr.quantity ?? 0), 0);
            return { ...med, stock: newStock, batches: updatedBatches };
          });
          localStorage.setItem("pharmacy_medicines", JSON.stringify(updated));
          return updated;
        });
      }
    }

    setSales((prev) => {
      const updated = prev.filter((s) => (s.invoiceNo || s.invoiceNumber || s.id) !== invoiceNo);
      localStorage.setItem("pharmacy_sales", JSON.stringify(updated));
      return updated;
    });

    setSalesReturns((prev) => {
      const updated = prev.filter((r) => (r.invoiceNo || r.invoiceNumber || r.id) !== invoiceNo);
      localStorage.setItem("pharmacy_sales_returns", JSON.stringify(updated));
      return updated;
    });

    logAudit("INVOICE_DELETE", `Deleted invoice ${invoiceNo} (Restocked: ${restockInventory ? "Yes" : "No"})`);
    addToast(`Invoice "${invoiceNo}" deleted permanently!`, "info");
    api.delete(`/sales/${invoiceNo}`).catch(() => {
      syncService.enqueue("SALE", invoiceNo, "DELETE", { id: invoiceNo });
    });
  };

  const deleteMultipleInvoices = (invoiceNos, restockInventory = false) => {
    if (!invoiceNos || invoiceNos.length === 0) return;
    const toDeleteSet = new Set(invoiceNos);
    invoiceNos.forEach((invNo) => addDeletedId("pharmacy_deleted_sale_ids", invNo));

    if (restockInventory) {
      const targetSales = sales.filter((s) => toDeleteSet.has(s.invoiceNo || s.invoiceNumber || s.id) && !s.isReturn);
      setMedicines((prevMeds) => {
        const updated = prevMeds.map((med) => {
          let totalQtyToAdd = 0;
          targetSales.forEach((sale) => {
            const saleItem = (sale.items || []).find((it) => (it.medicineId || it.id) === med.id);
            if (saleItem) {
              const cf = Number(med.conversionFactor || 10);
              const isPack = saleItem.saleType === "Pack" || (!saleItem.saleType && saleItem.price >= (med.sellingPrice * 0.7));
              const rawQty = Number(saleItem.qty || saleItem.quantity || 1);
              totalQtyToAdd += (isPack && cf > 1) ? (rawQty * cf) : rawQty;
            }
          });

          if (totalQtyToAdd <= 0) return med;

          const existingBatches = med.batches || [];
          let updatedBatches;
          const branchBatchIdx = existingBatches.findIndex(
            (b) => (!b.branchId || b.branchId === currentBranch.id) && (!b.expiryDate || new Date(b.expiryDate) > new Date())
          );
          if (branchBatchIdx >= 0) {
            updatedBatches = existingBatches.map((b, idx) => idx === branchBatchIdx ? { ...b, qty: Number(b.qty ?? b.quantity ?? 0) + totalQtyToAdd, quantity: Number(b.qty ?? b.quantity ?? 0) + totalQtyToAdd } : b);
          } else {
            const newBatch = {
              batchNumber: `RESTOCK-${Date.now().toString().slice(-4)}`,
              expiryDate: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              qty: totalQtyToAdd,
              quantity: totalQtyToAdd,
              branchId: currentBranch.id,
              rack: "Rack A",
              shelf: "Shelf 1"
            };
            updatedBatches = [...existingBatches, newBatch];
          }
          const newStock = updatedBatches.filter((b) => !b.branchId || b.branchId === currentBranch.id).reduce((acc, curr) => acc + Number(curr.qty ?? curr.quantity ?? 0), 0);
          return { ...med, stock: newStock, batches: updatedBatches };
        });
        localStorage.setItem("pharmacy_medicines", JSON.stringify(updated));
        return updated;
      });
    }

    setSales((prev) => {
      const updated = prev.filter((s) => !toDeleteSet.has(s.invoiceNo || s.invoiceNumber || s.id));
      localStorage.setItem("pharmacy_sales", JSON.stringify(updated));
      return updated;
    });

    setSalesReturns((prev) => {
      const updated = prev.filter((r) => !toDeleteSet.has(r.invoiceNo || r.invoiceNumber || r.id));
      localStorage.setItem("pharmacy_sales_returns", JSON.stringify(updated));
      return updated;
    });

    logAudit("BATCH_INVOICE_DELETE", `Deleted ${invoiceNos.length} invoices in bulk (Restocked: ${restockInventory ? "Yes" : "No"})`);
    addToast(`Successfully deleted ${invoiceNos.length} invoices!`, "info");
    invoiceNos.forEach((invNo) => {
      api.delete(`/sales/${invNo}`).catch(() => {
        syncService.enqueue("SALE", invNo, "DELETE", { id: invNo });
      });
    });
  };

  const deleteReturn = (returnInvoiceNo) => {
    if (!returnInvoiceNo) return;
    addDeletedId("pharmacy_deleted_sale_ids", returnInvoiceNo);

    setSalesReturns((prev) => {
      const updated = prev.filter((r) => (r.invoiceNo || r.invoiceNumber || r.id) !== returnInvoiceNo);
      localStorage.setItem("pharmacy_sales_returns", JSON.stringify(updated));
      return updated;
    });

    setSales((prev) => {
      const updated = prev.filter((s) => (s.invoiceNo || s.invoiceNumber || s.id) !== returnInvoiceNo);
      localStorage.setItem("pharmacy_sales", JSON.stringify(updated));
      return updated;
    });

    logAudit("RETURN_DELETE", `Deleted return voucher ${returnInvoiceNo}`);
    addToast(`Return voucher "${returnInvoiceNo}" deleted permanently!`, "info");
    api.delete(`/sales/${returnInvoiceNo}`).catch(() => {
      syncService.enqueue("SALE", returnInvoiceNo, "DELETE", { id: returnInvoiceNo });
    });
  };

  const deleteMultipleReturns = (returnInvoiceNos) => {
    if (!returnInvoiceNos || returnInvoiceNos.length === 0) return;
    const toDeleteSet = new Set(returnInvoiceNos);
    returnInvoiceNos.forEach((invNo) => addDeletedId("pharmacy_deleted_sale_ids", invNo));

    setSalesReturns((prev) => {
      const updated = prev.filter((r) => !toDeleteSet.has(r.invoiceNo || r.invoiceNumber || r.id));
      localStorage.setItem("pharmacy_sales_returns", JSON.stringify(updated));
      return updated;
    });

    setSales((prev) => {
      const updated = prev.filter((s) => !toDeleteSet.has(s.invoiceNo || s.invoiceNumber || s.id));
      localStorage.setItem("pharmacy_sales", JSON.stringify(updated));
      return updated;
    });

    logAudit("BATCH_RETURN_DELETE", `Deleted ${returnInvoiceNos.length} return records in bulk`);
    addToast(`Successfully deleted ${returnInvoiceNos.length} return records!`, "info");
    returnInvoiceNos.forEach((invNo) => {
      api.delete(`/sales/${invNo}`).catch(() => {
        syncService.enqueue("SALE", invNo, "DELETE", { id: invNo });
      });
    });
  };

  // Reconcile and preserve individual batch purchase prices and pack-unit stock from PO history
  useEffect(() => {
    if (!medicines || medicines.length === 0 || !purchases || purchases.length === 0) return;

    let modified = false;
    const updated = medicines.map((med) => {
      const existingBatches = med.batches || [];
      const cf = Number(med.conversionFactor) || 10;
      const poItemsForMed = [];

      purchases.forEach((p) => {
        (p.items || []).forEach((it) => {
          if (it.medicineId === med.id) {
            poItemsForMed.push({
              poNumber: p.poNumber,
              date: p.date,
              costPrice: parseFloat(it.costPrice) || 0,
              salePrice1: parseFloat(it.salePrice1) || (parseFloat(it.costPrice) * 1.3),
              lastReceivedBatch: it.lastReceivedBatch,
              qtyOrdered: Number(it.qtyOrdered) || 0,
              qtyReceived: Number(it.qtyReceived) || 0
            });
          }
        });
      });

      if (poItemsForMed.length === 0) return med;

      const newBatches = existingBatches.map((b, bIdx) => {
        let matchedPoItem = poItemsForMed.find((poIt) => poIt.lastReceivedBatch === b.batchNumber);
        if (!matchedPoItem) {
          const revIdx = poItemsForMed.length - 1 - (bIdx % poItemsForMed.length);
          matchedPoItem = poItemsForMed[revIdx] || poItemsForMed[0];
        }

        let currentQty = Number(b.qty ?? b.quantity ?? 0);
        // Self-heal: If an order was for 100 packs but only 100 units were stored due to old unit confusion, scale to full pack units (1,000 units)
        if (matchedPoItem && matchedPoItem.qtyOrdered >= 10 && currentQty === matchedPoItem.qtyOrdered && cf > 1) {
          currentQty = matchedPoItem.qtyOrdered * cf;
          modified = true;
        }

        const bCost = b.costPrice !== undefined && b.costPrice !== null ? b.costPrice : (matchedPoItem?.costPrice ?? med.costPrice);
        const bSale = b.sellingPrice !== undefined && b.sellingPrice !== null ? b.sellingPrice : (matchedPoItem?.salePrice1 ?? med.sellingPrice);

        if (b.costPrice !== bCost || b.sellingPrice !== bSale || (b.qty ?? b.quantity) !== currentQty) {
          modified = true;
          return {
            ...b,
            qty: currentQty,
            quantity: currentQty,
            costPrice: bCost,
            sellingPrice: bSale
          };
        }
        return b;
      });

      // Find highest active retail price for medicine master default in POS
      const activePrices = newBatches
        .filter((b) => Number(b.qty ?? b.quantity ?? 0) > 0)
        .map((b) => parseFloat(b.sellingPrice))
        .filter((p) => !isNaN(p) && p > 0);
      const highestPrice = activePrices.length > 0 ? Math.max(...activePrices) : (parseFloat(med.sellingPrice) || 0);

      const totalStockUnits = newBatches
        .filter((b) => !b.branchId || b.branchId === currentBranch.id)
        .reduce((acc, b) => acc + Number(b.qty ?? b.quantity ?? 0), 0);

      return {
        ...med,
        stock: totalStockUnits,
        sellingPrice: parseFloat(med.sellingPrice) || highestPrice || 0,
        batches: newBatches
      };
    });

    if (modified) {
      setMedicines(updated);
      localStorage.setItem("pharmacy_medicines", JSON.stringify(updated));
    }
  }, [purchases, currentBranch.id]);

  // --- PURCHASE ORDER GOODS RECEIPT (GRN / RECEIVE STOCK) ---
  const receivePurchaseItems = (poNumber, receivedItemsData, branchId = currentBranch.id) => {
    const po = purchases.find((p) => p.poNumber === poNumber);
    if (!po) {
      addToast("Purchase order not found", "danger");
      return false;
    }

    let itemsUpdatedCount = 0;
    let totalUnitsReceivedNow = 0;

    // 1. Update medicine inventory batches
    setMedicines((prevMeds) => {
      const updated = prevMeds.map((med) => {
        const receivedItem = receivedItemsData.find((it) => it.medicineId === med.id && Number(it.qtyReceiving) > 0);
        if (!receivedItem) return med;

        const poItem = (po.items || []).find((it) => it.medicineId === med.id);
        const cf = Number(med.conversionFactor || poItem?.conversionFactor || 10);
        const receivedPacks = Number(receivedItem.qtyReceiving);
        const qtyToAdd = receivedPacks * cf; // Multiply packs by conversion factor for accurate stock units

        totalUnitsReceivedNow += qtyToAdd;
        itemsUpdatedCount++;

        const batchNumber = receivedItem.batchNumber || `BAT-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
        const expiryDate = receivedItem.expiryDate || new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const rack = receivedItem.rack || med.shelf || "Rack A";
        const shelf = receivedItem.shelf || "Shelf A-1";

        const itemCost = receivedItem.costPrice 
          ? parseFloat(receivedItem.costPrice) 
          : (poItem?.costPrice ? parseFloat(poItem.costPrice) : (med.costPrice || 0));
        const itemSale = receivedItem.sellingPrice 
          ? parseFloat(receivedItem.sellingPrice) 
          : (poItem?.salePrice1 ? parseFloat(poItem.salePrice1) : (itemCost * 1.3));

        const existingBatches = med.batches || [];
        const existingBatchIndex = existingBatches.findIndex(
          (b) => b.batchNumber === batchNumber && b.branchId === branchId
        );

        let newBatches;
        if (existingBatchIndex >= 0) {
          newBatches = existingBatches.map((b, idx) => {
            if (idx === existingBatchIndex) {
              const currentQty = Number(b.qty || b.quantity) || 0;
              return {
                ...b,
                qty: currentQty + qtyToAdd,
                quantity: currentQty + qtyToAdd,
                costPrice: b.costPrice !== undefined ? b.costPrice : itemCost,
                sellingPrice: b.sellingPrice !== undefined ? b.sellingPrice : itemSale
              };
            }
            return b;
          });
        } else {
          newBatches = [
            ...existingBatches,
            {
              batchNumber,
              expiryDate,
              qty: qtyToAdd,
              quantity: qtyToAdd,
              costPrice: itemCost,
              sellingPrice: itemSale,
              branchId,
              rack,
              shelf
            }
          ];
        }

        const newStock = newBatches
          .filter((b) => !b.branchId || b.branchId === branchId)
          .reduce((acc, b) => acc + Number(b.qty ?? b.quantity ?? 0), 0);

        return {
          ...med,
          stock: newStock,
          costPrice: itemCost || med.costPrice,
          sellingPrice: itemSale || med.sellingPrice,
          batches: newBatches
        };
      });

      localStorage.setItem("pharmacy_medicines", JSON.stringify(updated));

      // Push updated batches to backend API
      updated.forEach((med) => {
        const receivedItem = receivedItemsData.find((it) => it.medicineId === med.id && Number(it.qtyReceiving) > 0);
        if (receivedItem) {
          api.put(`/medicines/${med.id}`, med).catch(() => {});
        }
      });

      return updated;
    });

    // 2. Update the purchase order status & received counts
    setPurchases((prevPurchases) => {
      const updated = prevPurchases.map((p) => {
        if (p.poNumber !== poNumber) return p;

        let allCompleted = true;
        let anyReceived = false;

        const updatedItems = p.items.map((item) => {
          const receivingEntry = receivedItemsData.find((it) => it.medicineId === item.medicineId);
          const additionalQty = receivingEntry ? Number(receivingEntry.qtyReceiving) || 0 : 0;
          const currentReceived = Number(item.qtyReceived) || 0;
          const totalReceived = currentReceived + additionalQty;

          if (totalReceived > 0) anyReceived = true;
          if (totalReceived < item.qtyOrdered) allCompleted = false;

          return {
            ...item,
            qtyReceived: totalReceived,
            lastReceivedBatch: receivingEntry?.batchNumber || item.lastReceivedBatch,
            lastReceivedExpiry: receivingEntry?.expiryDate || item.lastReceivedExpiry
          };
        });

        const newStatus = allCompleted ? "Received" : anyReceived ? "Partially Received" : "Pending";

        return {
          ...p,
          items: updatedItems,
          status: newStatus,
          lastReceivedDate: new Date().toISOString()
        };
      });
      localStorage.setItem("pharmacy_purchases", JSON.stringify(updated));
      return updated;
    });

    logAudit("PURCHASE_RECEIPT", `Received ${totalUnitsReceivedNow} units against Purchase Order ${poNumber}. Updated stock inventory.`);
    addToast(`Successfully received ${totalUnitsReceivedNow} items into stock for PO ${poNumber}!`, "success");
    return true;
  };

  // --- FACTORY RESET / WIPE DATABASE ---
  const resetEntireDatabase = () => {
    localStorage.clear();
    localStorage.setItem("pharmacy_v7_fresh_clean_db", "true");
    setMedicines([]);
    setSuppliers([]);
    setCustomers([]);
    setPrescriptions([]);
    setSales([]);
    setPurchases([]);
    setSalesReturns([]);
    setExpenses([]);
    setAuditLogs([]);
    setHeldInvoices([]);
    setOfflineQueue([]);
    setBranches(DEFAULT_BRANCHES);
    setCurrentBranch(DEFAULT_BRANCHES[0]);
    api.post("/system/clear-all-data").catch(() => {});
    addToast("Database wiped clean! All testing data has been removed.", "success");
  };

  const getAlerts = () => [];

  return (
    <AppContext.Provider
      value={{
        branches,
        addBranch,
        updateBranch,
        deleteBranch,
        currentBranch,
        setCurrentBranch,
        currentUser,
        setCurrentUser,
        changeRole,
        invoiceFormat,
        setInvoiceFormat,
        medicines,
        setMedicines,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        adjustStock,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        paySupplier,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        collectCustomerPayment,
        prescriptions,
        setPrescriptions,
        sales,
        setSales,
        deleteInvoice,
        deleteMultipleInvoices,
        deleteReturn,
        deleteMultipleReturns,
        checkoutPOS,
        checkoutReturnPOS,
        processReturn,
        purchases,
        setPurchases,
        receivePurchaseItems,
        taxRate,
        setTaxRate,
        toasts,
        addToast,
        removeToast,
        alerts: getAlerts(),
        employees,
        expenses,
        auditLogs,
        logAudit,
        heldInvoices,
        registerStatus,
        registerSession,
        isOffline,
        toggleOffline,
        syncState,
        triggerManualSync,
        syncService,
        salesReturns,
        refreshFromAPI,
        isScannerModalOpen,
        openScannerModal,
        closeScannerModal,
        pendingScannedBarcode,
        setPendingScannedBarcode,
        handleGlobalScan,
        masterData,
        addMasterItem,
        removeMasterItem,
        resetMasterData,
        resetEntireDatabase,
        exportToCSV,
        exportToExcel,
        printDocumentContent,
        exportTableToPDF,
        saveDocumentAsPDF
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
