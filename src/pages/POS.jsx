import React, { useContext, useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useCart } from "../hooks/useCart";
import { formatCurrency } from "../utils/helpers";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import {
  IoSearchOutline,
  IoTrashOutline,
  IoAddOutline,
  IoRemoveOutline,
  IoPersonAddOutline,
  IoPrintOutline,
  IoCheckmarkCircle,
  IoQrCodeOutline,
  IoCartOutline,
  IoLayersOutline
} from "react-icons/io5";

const CartItemRow = ({
  item,
  avail,
  updateQuantity,
  updateSaleType,
  updateCustomPrice,
  updateBatch,
  availableBatches,
  removeFromCart,
  getItemPrice,
  formatCurrency,
  isFocused,
  onQuantityEnter,
  isReturnMode
}) => {
  const [localQty, setLocalQty] = useState(item.quantity.toString());
  const [localPrice, setLocalPrice] = useState(
    (item.customPrice !== undefined ? item.customPrice : item.sellingPrice).toString()
  );
  const inputRef = useRef(null);

  useEffect(() => {
    setLocalQty(item.quantity.toString());
  }, [item.quantity]);

  useEffect(() => {
    if (item.customPrice !== undefined) {
      setLocalPrice(item.customPrice.toString());
    } else {
      setLocalPrice(item.sellingPrice.toString());
    }
  }, [item.customPrice, item.sellingPrice]);

  useEffect(() => {
    if (isFocused) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isFocused]);

  const maxReturnLimit = (isReturnMode && item.maxReturnableQty !== undefined)
    ? Number(item.maxReturnableQty)
    : null;

  const handleChange = (e) => {
    const val = e.target.value;
    const cleanStr = val.replace(/[^0-9]/g, "");
    if (!cleanStr) {
      setLocalQty("");
      return;
    }
    let parsed = parseInt(cleanStr, 10);
    if (isNaN(parsed) || parsed <= 0) parsed = 1;

    // Strict Clamping for Return items from invoices
    if (maxReturnLimit !== null && parsed > maxReturnLimit) {
      parsed = maxReturnLimit;
    }

    setLocalQty(parsed.toString());
    if (parsed > 0) {
      updateQuantity(item.id, parsed, avail, null, isReturnMode);
    }
  };

  const handleBlur = () => {
    let parsed = parseInt(localQty, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setLocalQty(item.quantity.toString());
      return;
    }

    if (maxReturnLimit !== null && parsed > maxReturnLimit) {
      parsed = maxReturnLimit;
      setLocalQty(parsed.toString());
      updateQuantity(item.id, parsed, avail, null, isReturnMode);
      return;
    }

    const cf = item.conversionFactor || 10;
    const needed = item.saleType === "Pack" ? parsed * cf : parsed;
    if (!isReturnMode && needed > avail) {
      const maxLimit = item.saleType === "Pack" ? Math.floor(avail / cf) : avail;
      setLocalQty(maxLimit.toString());
      updateQuantity(item.id, maxLimit, avail);
    }
  };

  const handlePriceChange = (e) => {
    const val = e.target.value;
    setLocalPrice(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      updateCustomPrice(item.id, parsed);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBlur();
      if (onQuantityEnter) {
        onQuantityEnter();
      }
    }
  };

  const price = item.saleType === "Tablet"
    ? getItemPrice(item) / (item.conversionFactor || 10)
    : getItemPrice(item);

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all animate-fade-in mb-2 ${
        isReturnMode
          ? "bg-rose-50/40 border-rose-200 hover:border-rose-300"
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Product Info & Meta */}
        <div className="space-y-1.5 flex-grow min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900 tracking-tight">{item.name}</span>
            {isReturnMode ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Return Item {item.originalInvoiceNo && `• Inv #${item.originalInvoiceNo}`}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                {item.drugType || "OTC"}
              </span>
            )}
            {isReturnMode && item.maxReturnableQty !== undefined && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                Max: {item.maxReturnableQty} Units
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
            <span>{item.brand || "Standard"}</span>
            <span className="text-slate-300">&bull;</span>
            <span>UOM: <strong className="text-slate-700 font-semibold">{item.uom || "Tablet"}</strong></span>
            <span className="text-slate-300">&bull;</span>
            <span>
              {isReturnMode ? "Sold Rate:" : "Rate:"}{" "}
              <strong className="text-slate-800 font-mono font-bold">{formatCurrency(price)}</strong>
            </span>
            {item.batchNumber && (
              <>
                <span className="text-slate-300">&bull;</span>
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600 font-semibold">
                  Batch: {item.batchNumber}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            {/* Segmented Pack / Tablet Switcher */}
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/60">
              <button
                type="button"
                onClick={() => updateSaleType(item.id, "Pack", avail)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  item.saleType === "Pack"
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Pack
              </button>
              <button
                type="button"
                onClick={() => updateSaleType(item.id, "Tablet", avail)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  item.saleType === "Tablet"
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Tablet
              </button>
            </div>

            {/* Batch Selector if multiple active batches exist */}
            {availableBatches && availableBatches.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg text-xs">
                <span className="text-[10px] font-bold text-slate-400">Batch:</span>
                <select
                  value={item.batchNumber || ""}
                  onChange={(e) => updateBatch && updateBatch(item.id, e.target.value, availableBatches)}
                  className="bg-transparent text-[11px] font-mono font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  {availableBatches.map((b) => {
                    const bQty = Number(b.qty ?? b.quantity ?? 0);
                    const cf = item.conversionFactor || 10;
                    const pks = Math.floor(bQty / cf);
                    const tabs = bQty % cf;
                    const qtyLabel = cf > 1 ? `${pks} Pk${tabs > 0 ? ` + ${tabs}` : ""}` : `${bQty} Units`;
                    return (
                      <option key={b.batchNumber} value={b.batchNumber}>
                        {b.batchNumber} ({qtyLabel} @ Rs. {b.sellingPrice || item.sellingPrice})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quantity Stepper & Price / Delete */}
        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 flex-shrink-0">
          {/* Stepper */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1, avail, null, isReturnMode)}
              type="button"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 text-slate-700 transition-all cursor-pointer active:scale-95 shadow-2xs"
              title="Decrease quantity"
            >
              <IoRemoveOutline className="w-3.5 h-3.5" />
            </button>
            <input
              ref={inputRef}
              type="number"
              min="1"
              max={maxReturnLimit !== null ? maxReturnLimit : undefined}
              value={localQty}
              onFocus={(e) => e.target.select()}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`w-11 text-center font-mono font-bold text-xs outline-none py-1 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                isReturnMode ? "text-rose-700" : "text-slate-900"
              }`}
            />
            <button
              onClick={() => {
                if (maxReturnLimit !== null && item.quantity >= maxReturnLimit) {
                  return;
                }
                updateQuantity(item.id, item.quantity + 1, avail, null, isReturnMode);
              }}
              disabled={maxReturnLimit !== null && item.quantity >= maxReturnLimit}
              type="button"
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all shadow-2xs active:scale-95 ${
                maxReturnLimit !== null && item.quantity >= maxReturnLimit
                  ? "opacity-40 cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
              }`}
              title={maxReturnLimit !== null && item.quantity >= maxReturnLimit ? `Locked to max purchased limit (${maxReturnLimit})` : "Increase"}
            >
              <IoAddOutline className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Price & Remove */}
          <div className="flex items-center gap-3 text-right">
            <div className="min-w-20">
              <div className={`text-sm font-black font-mono tracking-tight ${isReturnMode ? "text-rose-700" : "text-slate-900"}`}>
                {formatCurrency(price * item.quantity)}
              </div>
              <div className="text-[10px] font-medium text-slate-400">
                {isReturnMode ? "Refund Total" : "Line Total"}
              </div>
            </div>
            <button
              onClick={() => removeFromCart(item.id)}
              type="button"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
              title="Remove item"
            >
              <IoTrashOutline className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const POS = () => {
  const {
    medicines,
    currentBranch,
    customers,
    addCustomer,
    prescriptions,
    checkoutPOS,
    checkoutReturnPOS,
    taxRate,
    currentUser,
    employees,
    sales,
    invoiceFormat,
    addToast,
    masterData,
    openScannerModal
  } = useContext(AppContext);

  const paymentMethodsList = masterData?.paymentMethods || ["Cash", "Card", "Bank Transfer", "EasyPaisa", "JazzCash", "Store Credit / Ledger"];

  const { cart, setCart, addToCart, removeFromCart, updateQuantity, updateSaleType, updateCustomPrice, updateBatch, clearCart } = useCart();

  const [searchParams, setSearchParams] = useSearchParams();
  const [editingInvoiceNo, setEditingInvoiceNo] = useState("");
  
  // Format state for Receipt Modal (defaults to system setting)
  const [receiptModalFormat, setReceiptModalFormat] = useState(() => invoiceFormat || "thermal");
  
  // F2 Customer Lookup modal state
  const [showCustomerLookupModal, setShowCustomerLookupModal] = useState(false);
  const [customerLookupSearch, setCustomerLookupSearch] = useState("");

  // F3 Invoice Return Lookup Modal State (For searching by Invoice #, Customer Name, Phone)
  const [showInvoiceReturnModal, setShowInvoiceReturnModal] = useState(false);
  const [invoiceReturnSearch, setInvoiceReturnSearch] = useState("");
  const [customReturnDate, setCustomReturnDate] = useState(() => new Date().toISOString().split("T")[0]);
  const invoiceSearchInputRef = useRef(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedRxId, setSelectedRxId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [discountFlat, setDiscountFlat] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  // Return Mode State
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnReason, setReturnReason] = useState("Direct POS Return");

  // Missing "Retail Plus" attributes selectors
  const [salesPersonId, setSalesPersonId] = useState("");

  // Sync salesPersonId with the logged-in user on load or role changes
  useEffect(() => {
    if (employees && currentUser) {
      const loggedInEmployee = employees.find(
        (emp) => emp.name.toLowerCase() === currentUser.name.toLowerCase()
      );
      if (loggedInEmployee) {
        setSalesPersonId(loggedInEmployee.id);
      }
    }
  }, [currentUser, employees]);
  const [priceLevel, setPriceLevel] = useState("Retail Price");
  const [cashAccount, setCashAccount] = useState("Cash in Hand");
  const cashAccounts = ["Cash in Hand", "Main Safe Cash", "HBL Bank Deposit", "POS Drawer 1"];

  // Real-time computations & Walk-In info
  const [cashPaid, setCashPaid] = useState("");
  const cashPaidInputRef = useRef(null);
  const [customerCell, setCustomerCell] = useState("");

  // Customer registration state
  const [showCustModal, setShowCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustContact, setNewCustContact] = useState("");
  const [newCustLimit, setNewCustLimit] = useState(300);

  // Invoice Receipt Modal State
  const [receiptInvoice, setReceiptInvoice] = useState(null);

  // F6 Stock Lookup Modal State & Focus Refs
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [lastAddedMedId, setLastAddedMedId] = useState(null);
  const searchInputRef = useRef(null);
  const discountFlatRef = useRef(null);
  const stockSearchInputRef = useRef(null);

  useEffect(() => {
    if (showStockModal) {
      setTimeout(() => {
        stockSearchInputRef.current?.focus();
        stockSearchInputRef.current?.select();
      }, 60);
    }
  }, [showStockModal]);

  useEffect(() => {
    if (showInvoiceReturnModal) {
      setTimeout(() => {
        invoiceSearchInputRef.current?.focus();
        invoiceSearchInputRef.current?.select();
      }, 60);
    }
  }, [showInvoiceReturnModal]);

  // --- DERIVED CART STOCK INFO ---
  const getItemPrice = (item) => {
    if (item.customPrice !== undefined) return item.customPrice;
    if (priceLevel === "Cost Price") return item.costPrice;
    if (priceLevel === "Trade Price") return item.costPrice * 1.1; // trade markup
    return item.sellingPrice; // Retail
  };

  const getMedAvailableQty = (med) => {
    if (!med) return 0;
    const fullMed = medicines.find((m) => m.id === med.id);
    if (!fullMed || !fullMed.batches) return 0;
    const branchBatches = fullMed.batches.filter((b) => !b.branchId || b.branchId === currentBranch.id);
    return branchBatches.reduce((acc, curr) => acc + (Number(curr.qty ?? curr.quantity) || 0), 0);
  };

  // --- REAL-TIME BARCODE & QR SCANNER LISTENER FOR POS CART ---
  useEffect(() => {
    const handleScannedItem = (e) => {
      const scannedMed = e.detail;
      if (!scannedMed) return;

      const avail = getMedAvailableQty(scannedMed);
      addToCart(scannedMed, avail, (err) => addToast(err, "warning"), isReturnMode, currentBranch?.id);
      setLastAddedMedId(scannedMed.id);
      setSearchQuery("");
      setFocusedIndex(-1);
    };

    window.addEventListener("pharmacy_pos_add_scanned", handleScannedItem);
    return () => {
      window.removeEventListener("pharmacy_pos_add_scanned", handleScannedItem);
    };
  }, [addToCart, isReturnMode, currentBranch, addToast, medicines]);

  // Search filter
  const filteredMeds = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.brand.toLowerCase().includes(q) ||
        m.barcode.includes(q)
    );
  }, [medicines, searchQuery]);

  // Invoice Return Search filter (matches Invoice No, Customer Name, Phone, and Medicines)
  // STRICTLY exclude any Return Vouchers / Return records from this lookup! Only original sales invoices are eligible.
  const filteredReturnInvoices = useMemo(() => {
    const originalSalesOnly = sales.filter(
      (s) => !s.isReturn && s.type !== "RETURN" && !(s.invoiceNo || s.invoiceNumber || "").startsWith("RET-")
    );
    if (!invoiceReturnSearch.trim()) return originalSalesOnly.slice(0, 20);
    const q = invoiceReturnSearch.toLowerCase().trim();
    return originalSalesOnly.filter(
      (s) =>
        (s.invoiceNo || s.invoiceNumber || s.id || "").toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerContact && s.customerContact.toLowerCase().includes(q)) ||
        (s.items && s.items.some((it) => (it.name || "").toLowerCase().includes(q)))
    );
  }, [sales, invoiceReturnSearch]);

  const handleAddSingleInvoiceItemToReturn = (invoice, invoiceItem) => {
    const itemQty = Number(invoiceItem.qty ?? invoiceItem.quantity ?? 1);
    const itemPrice = Number(invoiceItem.price ?? invoiceItem.unitPrice ?? invoiceItem.sellingPrice ?? (invoiceItem.medicine ? invoiceItem.medicine.sellingPrice : 0) ?? 0);
    const itemName = invoiceItem.name || (invoiceItem.medicine ? invoiceItem.medicine.name : "") || "Medicine Item";
    const medId = invoiceItem.medicineId || invoiceItem.id || (invoiceItem.medicine ? invoiceItem.medicine.id : "");
    const alreadyReturned = Number(invoiceItem.returnedQty || 0);
    const remainingToReturn = Math.max(0, itemQty - alreadyReturned);

    if (remainingToReturn <= 0) {
      addToast(`"${itemName}" has already been completely returned from Invoice #${invoice.invoiceNo}!`, "warning");
      return;
    }

    const med = medicines.find((m) => m.id === medId) || {
      id: medId || `med-${Date.now()}`,
      name: itemName,
      sellingPrice: itemPrice,
      conversionFactor: 10,
      uom: "Pack"
    };

    const returnItem = {
      ...med,
      id: medId,
      medicineId: medId,
      name: itemName,
      quantity: remainingToReturn,
      qty: remainingToReturn,
      saleType: "Pack",
      sellingPrice: itemPrice,
      price: itemPrice,
      customPrice: itemPrice,
      originalInvoiceNo: invoice.invoiceNo,
      isReturnFromInvoice: true,
      maxReturnableQty: remainingToReturn
    };

    setCart((prev) => {
      const filtered = prev.filter((i) => (i.medicineId || i.id) !== (returnItem.medicineId || returnItem.id));
      return [...filtered, returnItem];
    });

    setIsReturnMode(true);
    if (invoice.customerId) {
      setSelectedCustomerId(invoice.customerId);
    }
    setReturnReason(`Returned from Invoice #${invoice.invoiceNo}`);
    setShowInvoiceReturnModal(false);
    addToast(`Loaded "${itemName}" (${remainingToReturn} available to return @ ${formatCurrency(itemPrice)})`, "info");
  };

  const handleReturnAllInvoiceItems = (invoice) => {
    const validItems = (invoice.items || []).filter((it) => {
      const itQty = Number(it.qty ?? it.quantity ?? 1);
      const alreadyReturned = Number(it.returnedQty || 0);
      return (itQty - alreadyReturned) > 0;
    });

    if (validItems.length === 0) {
      addToast(`All items from Invoice #${invoice.invoiceNo} have already been fully returned!`, "warning");
      return;
    }

    const itemsToAdd = validItems.map((it) => {
      const itQty = Number(it.qty ?? it.quantity ?? 1);
      const itPrice = Number(it.price ?? it.unitPrice ?? it.sellingPrice ?? (it.medicine ? it.medicine.sellingPrice : 0) ?? 0);
      const itName = it.name || (it.medicine ? it.medicine.name : "") || "Medicine Item";
      const medId = it.medicineId || it.id || (it.medicine ? it.medicine.id : "");
      const alreadyReturned = Number(it.returnedQty || 0);
      const remainingToReturn = Math.max(0, itQty - alreadyReturned);

      const med = medicines.find((m) => m.id === medId) || {
        id: medId || `med-${Date.now()}-${Math.random()}`,
        name: itName,
        sellingPrice: itPrice,
        conversionFactor: 10,
        uom: "Pack"
      };
      return {
        ...med,
        id: medId,
        medicineId: medId,
        name: itName,
        quantity: remainingToReturn,
        qty: remainingToReturn,
        saleType: "Pack",
        sellingPrice: itPrice,
        price: itPrice,
        customPrice: itPrice,
        originalInvoiceNo: invoice.invoiceNo,
        isReturnFromInvoice: true,
        maxReturnableQty: remainingToReturn
      };
    });

    setCart(itemsToAdd);
    setIsReturnMode(true);
    if (invoice.customerId) {
      setSelectedCustomerId(invoice.customerId);
    }
    setReturnReason(`Returned items from Invoice #${invoice.invoiceNo}`);
    setShowInvoiceReturnModal(false);
    addToast(`Loaded ${itemsToAdd.length} returnable items from Invoice #${invoice.invoiceNo} at original sale rates!`, "success");
  };

  // Selected Customer Details
  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Approved prescriptions list for matching customer or generic approvals
  const approvedPrescriptions = useMemo(() => {
    return prescriptions.filter(
      (rx) => rx.status === "Approved"
    );
  }, [prescriptions]);

  // --- CALCULATE SUMMARY ---
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = item.saleType === "Tablet"
        ? getItemPrice(item) / (item.conversionFactor || 10)
        : getItemPrice(item);
      return acc + price * item.quantity;
    }, 0);
  }, [cart, priceLevel]);

  const flatDisc = parseFloat(discountFlat) || 0;
  const percentDiscVal = parseFloat(discountPercent) || 0;
  const calculatedDiscount = useMemo(() => {
    let disc = flatDisc;
    if (percentDiscVal > 0) {
      disc += (cartSubtotal - disc) * (percentDiscVal / 100);
    }
    return Math.min(cartSubtotal, disc);
  }, [cartSubtotal, flatDisc, percentDiscVal]);

  const cartTax = useMemo(() => {
    return (cartSubtotal - calculatedDiscount) * taxRate;
  }, [cartSubtotal, calculatedDiscount, taxRate]);

  const cartTotal = useMemo(() => {
    return cartSubtotal - calculatedDiscount + cartTax;
  }, [cartSubtotal, calculatedDiscount, cartTax]);

  // --- HANDLERS ---
  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (!newCustName || !newCustContact) return;
    const newCust = addCustomer({
      name: newCustName,
      contact: newCustContact,
      creditLimit: parseFloat(newCustLimit) || 300
    });
    setSelectedCustomerId(newCust.id);
    setNewCustName("");
    setNewCustContact("");
    setNewCustLimit(300);
    setShowCustModal(false);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      addToast("Billing cart is currently empty!", "warning");
      return;
    }

    // Direct Return Mode Checkout
    if (isReturnMode) {
      const validItems = cart.filter((it) => Number(it.quantity || it.qty || 0) > 0);
      if (validItems.length === 0) {
        addToast("Cannot process return: Cart has 0 return quantity.", "warning");
        return;
      }
      const adjustedCart = validItems.map((item) => ({
        ...item,
        sellingPrice: getItemPrice(item)
      }));
      const originalInvNo = cart.find((it) => it.originalInvoiceNo)?.originalInvoiceNo || null;
      const refund = checkoutReturnPOS(
        adjustedCart,
        selectedCustomerId || null,
        returnReason || (originalInvNo ? `Returned from Inv #${originalInvNo}` : "Direct POS Return"),
        originalInvNo,
        customReturnDate || null
      );
      if (refund) {
        setReceiptInvoice(refund);
        clearCart();
        setSelectedCustomerId("");
        setReturnReason("Direct POS Return");
        setIsReturnMode(false);
      }
      return;
    }

    // Prescription verification is completely optional and does not block checkout.

    // 2. Controlled Drug remaining quota validation
    if (selectedCustomerId && activeCustomer) {
      let controlledQty = 0;
      cart.forEach((item) => {
        if (item.drugType === "Restricted" || item.drugType === "Prescription-Only") {
          controlledQty += item.quantity;
        }
      });
      const limit = activeCustomer.remainingQuota ?? 20;
      if (controlledQty > limit) {
        addToast(`Transaction Blocked! Customer has only ${limit} units remaining in monthly controlled drug quota. Cart contains ${controlledQty} units.`, "danger");
        return;
      }
    }

    // 3. Credit limits validation
    if (paymentMethod === "Credit") {
      if (!selectedCustomerId) {
        addToast("Please select a registered customer to perform a Credit purchase.", "warning");
        return;
      }
      if (activeCustomer) {
        const potentialBalance = activeCustomer.balance + cartTotal;
        if (potentialBalance > activeCustomer.creditLimit) {
          addToast(`Credit Denied! The transaction of ${formatCurrency(cartTotal)} puts the customer over their limit of ${formatCurrency(activeCustomer.creditLimit)}.`, "danger");
          return;
        }
      }
    }

    // 4. Perform checkout in Context
    const selectedSalesPerson = employees.find((emp) => emp.id === salesPersonId);
    const adjustedCart = cart.map((item) => ({
      ...item,
      sellingPrice: item.saleType === "Tablet"
        ? getItemPrice(item) / (item.conversionFactor || 10)
        : getItemPrice(item)
    }));
 
    const invoice = checkoutPOS(
      adjustedCart,
      selectedCustomerId || null,
      paymentMethod,
      flatDisc,
      percentDiscVal,
      selectedRxId || null,
      paymentMethod === "Cash" ? (parseFloat(cashPaid) || 0) : null,
      editingInvoiceNo || null
    );

    if (invoice) {
      // Overwrite cashier with sales person if set
      if (selectedSalesPerson) {
        invoice.cashier = selectedSalesPerson.name;
      }
      // Attach walk-in cell if set
      if (customerCell) {
        invoice.customerContact = customerCell;
      }
      setReceiptInvoice(invoice);
      clearCart();
      setSelectedCustomerId("");
      setSelectedRxId("");
      setDiscountFlat("");
      setDiscountPercent("");
      setSalesPersonId("");
      setCashPaid("");
      setCustomerCell("");
      setEditingInvoiceNo("");
      setSearchParams({});

      // Instant Single-Click Print Trigger
      setTimeout(() => {
        window.print();
      }, 150);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Load invoice for editing if edit query parameter is present
  useEffect(() => {
    const editNo = searchParams.get("edit");
    if (editNo && sales && sales.length > 0) {
      const inv = sales.find((s) => s.invoiceNo === editNo);
      if (inv) {
        setEditingInvoiceNo(inv.invoiceNo);
        
        // Reconstruct cart
        const restoredCart = inv.items.map((invItem) => {
          const med = medicines.find((m) => m.id === invItem.medicineId);
          const cf = invItem.conversionFactor || (med ? med.conversionFactor : 10) || 10;
          return {
            id: invItem.medicineId,
            name: invItem.name,
            brand: med ? med.brand : "Generic",
            drugType: med ? med.drugType : "OTC",
            costPrice: med ? med.costPrice : invItem.price,
            sellingPrice: med ? med.sellingPrice : invItem.price,
            conversionFactor: cf,
            quantity: invItem.orderedQty || (invItem.saleType === "Pack" ? invItem.qty / cf : invItem.qty),
            saleType: invItem.saleType || "Pack"
          };
        });
        
        setCart(restoredCart);
        
        // Restore customer link
        if (inv.customerId) {
          setSelectedCustomerId(inv.customerId);
        } else {
          setSelectedCustomerId("");
        }

        // Restore cashier / sales person
        if (inv.cashier) {
          const emp = employees.find(e => e.name === inv.cashier);
          if (emp) setSalesPersonId(emp.id);
        }

        // Restore payment method & discount
        if (inv.paymentMethod) {
          if (inv.paymentMethod.includes("Cash")) setPaymentMethod("Cash");
          else if (inv.paymentMethod.includes("Credit")) setPaymentMethod("Credit");
        }
        
        // Restore discount
        if (inv.discount) {
          setDiscountFlat(inv.discount.toString());
        }
      }
    }
  }, [searchParams, sales, medicines]);

  // Hotkey listener for POS keyboard-only workflow (declared here to avoid TDZ)
  useEffect(() => {
    const handleGlobalHotkeys = (e) => {
      // F4: Focus Main Product Search Bar (Highlights the search box)
      if (e.key === "F4") {
        e.preventDefault();
        setShowStockModal(false);
        setShowInvoiceReturnModal(false);
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }

      // F3: Search Invoice for Return
      else if (e.key === "F3") {
        e.preventDefault();
        setShowInvoiceReturnModal((prev) => !prev);
      }

      // F6: Stock & Inventory lookup modal
      else if (e.key === "F6") {
        e.preventDefault();
        setShowStockModal((prev) => !prev);
      }

      // F2: Customer lookup modal
      else if (e.key === "F2") {
        e.preventDefault();
        setShowCustomerLookupModal((prev) => !prev);
      }
      
      // F8: Focus Cash Paid input
      else if (e.key === "F8") {
        e.preventDefault();
        if (cashPaidInputRef.current) {
          cashPaidInputRef.current.focus();
          cashPaidInputRef.current.select();
        }
      }

      // F9: Print receipt if modal is open, or generate invoice / checkout if cart has items
      else if (e.key === "F9") {
        e.preventDefault();
        if (receiptInvoice) {
          handlePrintReceipt();
        } else {
          handleCheckout();
        }
      }
    };
    window.addEventListener("keydown", handleGlobalHotkeys);
    return () => window.removeEventListener("keydown", handleGlobalHotkeys);
  }, [receiptInvoice, handleCheckout]);

  return (
    <div className="space-y-3 flex flex-col flex-grow w-full h-[calc(100vh-140px)] min-h-[620px] overflow-hidden">
      {editingInvoiceNo && (
        <div className="bg-amber-50 border border-amber-250 text-amber-900 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold shadow-2xs animate-fade-in no-print">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span>Editing Invoice: <span className="font-black underline">{editingInvoiceNo}</span> (Saving will overwrite the original receipt and adjust stock)</span>
          </div>
          <button
            onClick={() => {
              setEditingInvoiceNo("");
              clearCart();
              setSearchParams({});
            }}
            className="px-3 py-1 bg-amber-200 hover:bg-amber-355 text-amber-955 rounded-lg cursor-pointer transition-colors"
          >
            Cancel Edit
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow w-full overflow-hidden">
      {/* Left Pane: Cart & Search (occupies 2 cols) */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col p-3.5 space-y-2.5 h-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isReturnMode ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
              <IoCartOutline className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{isReturnMode ? "Sales Return & Restock" : "POS Billing Terminal"}</span>
                {isReturnMode && (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md">
                    Return Mode
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {isReturnMode ? "Restocks returned items into inventory at original sold rates" : "Fast checkout and barcode scanner terminal"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInvoiceReturnModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 active:scale-95 shadow-2xs"
              title="Search Invoice by #, Customer Name, or Phone (F3)"
            >
              <IoSearchOutline className="w-3.5 h-3.5 text-slate-600" />
              <span>Return Invoice [F3]</span>
            </button>
            <button
              type="button"
              onClick={() => setShowStockModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 active:scale-95 shadow-2xs"
              title="Check Branch Stock (F6)"
            >
              <IoLayersOutline className="w-3.5 h-3.5 text-slate-600" />
              <span>Stock [F6]</span>
            </button>
          </div>
        </div>

        {/* Return Mode Alert & Date Picker */}
        {isReturnMode && (
          <div className="bg-rose-50/70 border border-rose-200/90 text-rose-950 p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="font-bold text-rose-900 text-xs">Return Mode Active</span>
              <span className="text-rose-700/80 text-[11px] hidden sm:inline">&bull; Sold rates locked. Stock will be restored on checkout.</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white border border-rose-200 rounded-lg px-2 py-0.5 text-rose-900 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Orig Date:</span>
                <input
                  type="date"
                  value={customReturnDate}
                  onChange={(e) => setCustomReturnDate(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReturnMode(false);
                  clearCart();
                }}
                className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-2xs"
              >
                Exit Return Mode
              </button>
            </div>
          </div>
        )}

        {/* Product Search Input */}
        <div className="relative">
          <IoSearchOutline className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search medicine (Name, Generic, Barcode...) [F4] or scan code..."
            value={searchQuery}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setFocusedIndex(-1);
            }}
            onKeyDown={(e) => {
              if (filteredMeds.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setFocusedIndex((prev) => (prev + 1) % filteredMeds.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setFocusedIndex((prev) => (prev - 1 + filteredMeds.length) % filteredMeds.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                const idx = focusedIndex >= 0 ? focusedIndex : 0;
                if (idx >= 0 && idx < filteredMeds.length) {
                  const selectedMed = filteredMeds[idx];
                  const avail = getMedAvailableQty(selectedMed);
                  addToCart(selectedMed, avail, (err) => addToast(err, "warning"), false, currentBranch.id);
                  setLastAddedMedId(selectedMed.id);
                  setSearchQuery("");
                  setFocusedIndex(-1);
                }
              } else if (e.key === "Escape") {
                setSearchQuery("");
                setFocusedIndex(-1);
              }
            }}
            className="w-full pl-10 pr-28 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-400 shadow-2xs"
          />

          {/* Quick Barcode/QR Scanner Action Button inside Search Bar */}
          <button
            type="button"
            onClick={openScannerModal}
            title="Scan Medicine Box Barcode or QR Code"
            className="absolute right-1.5 top-1 flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <IoQrCodeOutline className="w-3.5 h-3.5 text-emerald-600" />
            <span>Scan QR</span>
          </button>

          {/* Search Dropdown Results */}
          {searchQuery && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden max-w-full">
              {filteredMeds.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-550 font-semibold">
                  No medicines found matching "{searchQuery}"
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-250 text-slate-500 font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10">
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Group</th>
                        <th className="py-2.5 px-3 text-center">Category</th>
                        <th className="py-2.5 px-3 text-center">Sub Category</th>
                        <th className="py-2.5 px-3 text-center">Shelf</th>
                        <th className="py-2.5 px-3 text-center">Stock</th>
                        <th className="py-2.5 px-3 text-right">Price 3</th>
                        <th className="py-2.5 px-3 text-right">Price 2</th>
                        <th className="py-2.5 px-3 text-right font-black">Price 1</th>
                        <th className="py-2.5 px-3">Supplier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-semibold text-slate-755 animate-fade-in">
                      {filteredMeds.map((med, idx) => {
                        const avail = getMedAvailableQty(med);
                        const isHighlighted = idx === focusedIndex;
                        return (
                          <tr
                            key={med.id}
                            onClick={() => {
                              addToCart(med, avail, (err) => addToast(err, "warning"), false, currentBranch.id);
                              setLastAddedMedId(med.id);
                              setSearchQuery("");
                              setFocusedIndex(-1);
                            }}
                            className={`transition-all cursor-pointer ${
                              isHighlighted ? "bg-slate-100 font-bold text-slate-900 border-l-4 border-emerald-500" : "hover:bg-slate-50/85"
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-500">{med.id}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{med.name}</div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">{med.genericName} &bull; {med.strength}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-800">{med.productGroup || "General"}</td>
                            
                            {/* Color-coded Category column */}
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-800 font-bold text-[10px] rounded-md">
                                {med.category || "Tablet"}
                              </span>
                            </td>
                            
                            {/* Color-coded Sub Category column */}
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px] rounded-md">
                                {med.subCategory || "General"}
                              </span>
                            </td>
                            
                            {/* Color-coded Shelf column */}
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-250 text-emerald-800 font-bold text-[10px] rounded-md">
                                {med.shelf || "Shelf A-1"}
                              </span>
                            </td>

                            {/* Live Available Stock Badge column */}
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black font-mono shadow-2xs ${
                                avail <= 0
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : avail <= (med.reorderLevel || 10)
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              }`}>
                                {avail <= 0 ? "Out of Stock" : `${avail} units`}
                              </span>
                            </td>

                            {/* Prices */}
                            <td className="py-2.5 px-3 text-right text-rose-800 font-bold">
                              {formatCurrency(med.sellingPrice * 1.2)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-blue-800 font-bold">
                              {formatCurrency(med.sellingPrice * 1.1)}
                            </td>
                            <td className="py-2.5 px-3 text-right bg-emerald-50/30 text-emerald-850 font-black text-xs">
                              {formatCurrency(med.sellingPrice)}
                            </td>

                            {/* Supplier */}
                            <td className="py-2.5 px-3 text-slate-805 truncate max-w-[95px]">
                              {med.manufacturer || "Generic Supplier"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Item Grid */}
        <div className="flex-grow overflow-y-auto h-0 border border-slate-200 rounded-xl divide-y divide-slate-200">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 space-y-2">
              <IoSearchOutline className="w-12 h-12 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">Your cart is empty</p>
              <p className="text-xs text-slate-450">Search products above to add them to the sale</p>
            </div>
          ) : (
            cart.map((item) => {
              const fullMed = medicines.find((m) => m.id === (item.medicineId || item.id));
              const activeBranchBatches = (fullMed?.batches || []).filter(
                (b) => (!b.branchId || b.branchId === currentBranch.id) && Number(b.qty ?? b.quantity ?? 0) > 0
              );

              return (
                <CartItemRow
                  key={item.id}
                  item={item}
                  avail={getMedAvailableQty(item)}
                  updateQuantity={(id, q, a) => updateQuantity(id, q, a, (err) => addToast(err, "warning"), isReturnMode)}
                  updateSaleType={(id, st, a) => updateSaleType(id, st, a, isReturnMode)}
                  updateCustomPrice={updateCustomPrice}
                  updateBatch={updateBatch}
                  availableBatches={activeBranchBatches}
                  removeFromCart={removeFromCart}
                  getItemPrice={getItemPrice}
                  formatCurrency={formatCurrency}
                  isFocused={item.id === lastAddedMedId}
                  isReturnMode={isReturnMode}
                  onQuantityEnter={() => {
                    discountFlatRef.current?.focus();
                    discountFlatRef.current?.select();
                  }}
                />
              );
            })
          )}
        </div>


        {/* Cart Quick Control & Status Bar */}
        <div className="border-t border-slate-100 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/70 -mx-3.5 -mb-3.5 px-3.5 py-2.5 rounded-b-2xl">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium text-xs">
              <strong className="text-slate-800 font-bold">{cart.length}</strong> {cart.length === 1 ? "item" : "items"} in cart
            </span>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                type="button"
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
              >
                Clear Cart
              </button>
            )}
            <span className="text-slate-300 hidden md:inline">|</span>
            {/* Last 2 Invoices Summary */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>Recent Sales:</span>
              <span className="bg-white border border-slate-200 text-slate-700 font-mono font-bold px-2 py-0.5 rounded text-[11px] shadow-2xs">
                {sales[0] ? formatCurrency(sales[0].total) : "Rs. 0.00"}
              </span>
              {sales[1] && (
                <span className="bg-white border border-slate-200 text-slate-700 font-mono font-bold px-2 py-0.5 rounded text-[11px] shadow-2xs">
                  {formatCurrency(sales[1].total)}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Walk-in Cell:</label>
            <input
              type="text"
              placeholder="e.g. 0300-1234567"
              value={customerCell}
              onChange={(e) => setCustomerCell(e.target.value)}
              className="bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none w-44 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Right Pane: Checkout Panel (occupies 1 col) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between h-full space-y-3">
        {/* Settings Controls */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-800 tracking-wide">Checkout Settings</h2>
            <button
              type="button"
              onClick={() => setIsReturnMode(!isReturnMode)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-200 cursor-pointer border ${
                isReturnMode
                  ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {isReturnMode ? "Switch to Sale" : "Switch to Return"}
            </button>
          </div>

          {/* Sales Staff & Price Level */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Sales Staff</label>
              <select
                value={salesPersonId}
                onChange={(e) => setSalesPersonId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-all cursor-pointer"
              >
                <option value="">Select Staff</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Price Level</label>
              <select
                value={priceLevel}
                onChange={(e) => setPriceLevel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-all cursor-pointer"
              >
                <option value="Retail Price">Retail Price</option>
                <option value="Cost Price">Cost Price</option>
                <option value="Trade Price">Trade Price</option>
              </select>
            </div>
          </div>

          {/* Customer Link & Attach Rx */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Customer</label>
              <div className="flex gap-1.5">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    setSelectedRxId(""); // Reset Rx
                  }}
                  className="flex-grow bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-all cursor-pointer truncate"
                >
                  <option value="">Walk-In Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowCustModal(true)}
                  type="button"
                  className="px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center flex-shrink-0"
                  title="Add Customer"
                >
                  <IoPersonAddOutline className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Prescription</label>
              <select
                value={selectedRxId}
                onChange={(e) => setSelectedRxId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-all cursor-pointer"
              >
                <option value="">No Rx Attached</option>
                {approvedPrescriptions.map((rx) => (
                  <option key={rx.id} value={rx.id}>
                    RX #{rx.id} - {rx.customerName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Customer details info */}
          {activeCustomer && (
            <div className="px-3 py-1.5 bg-emerald-50/70 rounded-lg border border-emerald-100 text-xs text-slate-700 flex justify-between items-center animate-fade-in">
              <span>Points: <strong className="text-slate-900 font-bold">{activeCustomer.loyaltyPoints}</strong></span>
              <span>Balance: <strong className="text-rose-700 font-bold">{formatCurrency(activeCustomer.balance)}</strong></span>
              <span>Quota: <strong className="text-emerald-700 font-bold">{activeCustomer.remainingQuota ?? 20}</strong></span>
            </div>
          )}

          {/* Applied Discounts */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Flat Discount (Rs.)</label>
              <input
                ref={discountFlatRef}
                type="number"
                placeholder="0.00"
                value={discountFlat === 0 || discountFlat === "0" ? "" : discountFlat}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || isNaN(parseFloat(val))) {
                    setDiscountFlat("");
                  } else {
                    setDiscountFlat(Math.max(0, parseFloat(val)));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    cashPaidInputRef.current?.focus();
                    cashPaidInputRef.current?.select();
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Percent Discount (%)</label>
              <input
                type="number"
                placeholder="0"
                value={discountPercent === 0 || discountPercent === "0" ? "" : discountPercent}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || isNaN(parseFloat(val))) {
                    setDiscountPercent("");
                  } else {
                    setDiscountPercent(Math.max(0, Math.min(100, parseFloat(val))));
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none transition-all"
              />
            </div>
          </div>

          {isReturnMode ? (
            <div className="space-y-1 bg-rose-50/50 p-2.5 rounded-xl border border-rose-200/80">
              <label className="text-[11px] font-bold text-rose-800 block">Return Reason</label>
              <input
                type="text"
                placeholder="Reason for return..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-900 outline-none"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none cursor-pointer"
                >
                  {paymentMethodsList.map((pm) => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </select>
              </div>

              {paymentMethod !== "Credit" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Cash Account</label>
                  <select
                    value={cashAccount}
                    onChange={(e) => setCashAccount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none cursor-pointer"
                  >
                    {cashAccounts.map((accName) => (
                      <option key={accName} value={accName}>
                        {accName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom calculation & checkout */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          {/* Unified Bill Summary & Payment Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 space-y-2 border border-slate-800 shadow-md">
            <div className="flex justify-between text-xs font-medium text-slate-400">
              <span>Subtotal:</span>
              <span className="text-white font-mono font-bold">{formatCurrency(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-slate-400">
              <span>Tax ({Math.round(taxRate * 100)}%):</span>
              <span className="text-white font-mono font-bold">{formatCurrency(isReturnMode ? cartSubtotal * taxRate : cartTax)}</span>
            </div>
            {!isReturnMode && calculatedDiscount > 0 && (
              <div className="flex justify-between text-xs font-semibold text-rose-400">
                <span>Discount applied:</span>
                <span className="font-mono font-bold">-{formatCurrency(calculatedDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline border-t border-slate-800 pt-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {isReturnMode ? "Total Refund" : "Total Payable"}
              </span>
              <span className={`text-xl font-black font-mono tracking-tight ${isReturnMode ? "text-rose-400" : "text-emerald-400"}`}>
                {formatCurrency(isReturnMode ? cartSubtotal * (1 + taxRate) : cartTotal)}
              </span>
            </div>

            {/* Cash Paid / Amount Received Row */}
            {!isReturnMode && paymentMethod !== "Credit" && (
              <div className="border-t border-slate-800/80 pt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Cash Received:
                  </span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">Rs.</span>
                    <input
                      ref={cashPaidInputRef}
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={cashPaid}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                          setCashPaid(val);
                        }
                      }}
                      className="w-28 bg-slate-800/90 border border-slate-700 focus:border-emerald-500 rounded-lg pl-8 pr-2.5 py-1 text-xs font-bold text-right text-white outline-none font-mono transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-0.5">
                  <span className="text-slate-400 font-medium">Change Return:</span>
                  <span className={`font-bold font-mono tracking-tight ${
                    (parseFloat(cashPaid) || 0) >= cartTotal
                      ? "text-emerald-400 font-bold"
                      : "text-amber-400"
                  }`}>
                    {formatCurrency(Math.max(0, (parseFloat(cashPaid) || 0) - cartTotal))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleCheckout}
            type="button"
            className={`w-full font-bold text-xs py-3 rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 ${
              isReturnMode
                ? "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-600/20"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20"
            }`}
          >
            <span>{isReturnMode ? "Process Return & Restock" : "Complete Sale & Print"}</span>
            <span className="text-[10px] opacity-75 font-mono font-normal">[F9]</span>
          </button>
        </div>
      </div>
    </div>

      {/* --- ADD CUSTOMER MODAL --- */}
      <Modal isOpen={showCustModal} onClose={() => setShowCustModal(false)} title="Register Customer">
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alice Smith"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
              Contact Number
            </label>
            <input
              type="text"
              required
              placeholder="e.g. +1-555-0909"
              value={newCustContact}
              onChange={(e) => setNewCustContact(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
              Credit Limit (Rs.)
            </label>
            <input
              type="number"
              value={newCustLimit}
              onChange={(e) => setNewCustLimit(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCustModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Register Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* --- INVOICE RETURN LOOKUP MODAL (F3) --- */}
      <Modal
        isOpen={showInvoiceReturnModal}
        onClose={() => setShowInvoiceReturnModal(false)}
        title="Find Original Sales Invoice for Return (F3)"
        size="xl"
      >
        <div className="space-y-4 text-xs">
          <div className="relative">
            <IoSearchOutline className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
            <input
              ref={invoiceSearchInputRef}
              type="text"
              placeholder="Search by Invoice # (e.g. INV-1002), Customer Name, or Mobile Number..."
              value={invoiceReturnSearch}
              onChange={(e) => setInvoiceReturnSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl font-bold text-xs outline-none transition-all shadow-2xs"
            />
          </div>

          <div className="max-h-[460px] overflow-y-auto space-y-3 pr-1">
            {filteredReturnInvoices.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-1">
                <p className="font-bold text-sm">No sales invoices found matching search.</p>
                <p className="text-xs">Type the customer's phone number, name, or invoice number above.</p>
              </div>
            ) : (
              filteredReturnInvoices.map((inv) => {
                const isFullyReturned = (inv.items || []).every(
                  (it) => (it.returnedQty || 0) >= it.qty
                );
                const hasAnyReturned = (inv.items || []).some(
                  (it) => (it.returnedQty || 0) > 0
                );

                return (
                  <div
                    key={inv.invoiceNo}
                    className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 hover:bg-white hover:border-slate-400 transition-all shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm font-mono">{inv.invoiceNo}</span>
                          <span className="text-[10px] px-2 py-0.2 bg-emerald-50 text-emerald-800 font-black rounded-md border border-emerald-200">
                            {inv.paymentMethod || "Cash"}
                          </span>
                          {isFullyReturned ? (
                            <span className="text-[10px] px-2 py-0.2 bg-slate-200 text-slate-700 font-black rounded-md border border-slate-300">
                              Fully Returned
                            </span>
                          ) : hasAnyReturned ? (
                            <span className="text-[10px] px-2 py-0.2 bg-amber-50 text-amber-800 font-black rounded-md border border-amber-300">
                              Partially Returned
                            </span>
                          ) : null}
                          {inv.isReturn && (
                            <span className="text-[10px] px-2 py-0.2 bg-indigo-50 text-indigo-800 font-black rounded-md border border-indigo-200">
                              Return Voucher
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Customer: <strong className="text-slate-800">{inv.customerName || "Walk-in"}</strong> {inv.customerContact && inv.customerContact !== "N/A" ? `(${inv.customerContact})` : ""} &bull; Date: {new Date(inv.date).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Total Bill</div>
                          <div className="text-sm font-black text-slate-900 font-mono">{formatCurrency(inv.total)}</div>
                        </div>
                        <button
                          type="button"
                          disabled={isFullyReturned}
                          onClick={() => handleReturnAllInvoiceItems(inv)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all shadow-2xs flex items-center gap-1 ${
                            isFullyReturned
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                              : "bg-slate-900 hover:bg-slate-800 text-amber-300 cursor-pointer"
                          }`}
                        >
                          <IoCheckmarkCircle className="w-3.5 h-3.5" />
                          <span>{isFullyReturned ? "Fully Returned" : "Return All Items"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Items List from Invoice */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                            <th className="py-1.5 px-2.5">Medicine Name</th>
                            <th className="py-1.5 px-2.5 text-center">Sold Qty</th>
                            <th className="py-1.5 px-2.5 text-center">Already Ret.</th>
                            <th className="py-1.5 px-2.5 text-right">Sold Rate</th>
                            <th className="py-1.5 px-2.5 text-right">Line Total</th>
                            <th className="py-1.5 px-2.5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(inv.items || []).map((item, idx) => {
                            const itemName = item.name || (item.medicine ? item.medicine.name : "") || "Medicine";
                            const itemQty = Number(item.qty ?? item.quantity ?? 1);
                            const itemPrice = Number(item.price ?? item.unitPrice ?? item.sellingPrice ?? (item.medicine ? item.medicine.sellingPrice : 0) ?? 0);
                            const alreadyRet = Number(item.returnedQty || 0);
                            const remaining = Math.max(0, itemQty - alreadyRet);
                            const lineTotal = Number(item.total ?? (itemQty * itemPrice));
                            const isItemFullyReturned = remaining <= 0;

                            return (
                              <tr key={idx} className={isItemFullyReturned ? "bg-slate-50/80 text-slate-400" : "hover:bg-slate-50/60"}>
                                <td className="py-1.5 px-2.5 font-bold text-slate-800">
                                  {itemName}
                                  {isItemFullyReturned && (
                                    <span className="ml-2 text-[9px] font-black text-slate-400 bg-slate-200 px-1.5 py-0.2 rounded">
                                      Returned
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 px-2.5 text-center font-bold font-mono">{itemQty}</td>
                                <td className="py-1.5 px-2.5 text-center font-bold font-mono text-amber-700">{alreadyRet}</td>
                                <td className="py-1.5 px-2.5 text-right font-medium font-mono text-slate-700">{formatCurrency(itemPrice)}</td>
                                <td className="py-1.5 px-2.5 text-right font-black font-mono text-slate-900">{formatCurrency(lineTotal)}</td>
                                <td className="py-1.5 px-2.5 text-center">
                                  {isItemFullyReturned ? (
                                    <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5">
                                      Fully Returned
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAddSingleInvoiceItemToReturn(inv, item)}
                                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-bold text-[10px] cursor-pointer transition-all shadow-2xs"
                                    >
                                      + Return ({remaining} left @ {formatCurrency(itemPrice)})
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* --- RECEIPT INVOICE DIALOG MODAL (DUAL FORMAT: THERMAL 80MM / A4 FULL PAGE) --- */}
      <Modal
        isOpen={!!receiptInvoice}
        onClose={() => setReceiptInvoice(null)}
        title={
          receiptInvoice && (receiptInvoice.isReturn || receiptInvoice.type === "RETURN" || String(receiptInvoice.invoiceNo || "").startsWith("RET-"))
            ? "Sales Return & Refund Completed - Voucher Generated"
            : "Checkout Successful - Invoice Generated"
        }
        size={receiptModalFormat === "a4" ? "xl" : "md"}
      >
        {receiptInvoice && (() => {
          const isReturnReceipt = Boolean(
            receiptInvoice.isReturn ||
            receiptInvoice.type === "RETURN" ||
            String(receiptInvoice.invoiceNo || "").startsWith("RET-")
          );

          return (
            <div className="space-y-5">
              {/* Format Toggle Bar */}
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl text-xs font-bold no-print">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium pl-1">Print Layout:</span>
                  <button
                    type="button"
                    onClick={() => setReceiptModalFormat("thermal")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      receiptModalFormat === "thermal"
                        ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🧾 Thermal (80mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptModalFormat("a4")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      receiptModalFormat === "a4"
                        ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    📄 Full Page (A4)
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 font-mono pr-1">
                  {receiptModalFormat === "thermal" ? "80mm POS Roll" : "Standard 210mm Sheet"}
                </div>
              </div>

              {/* Format 1: THERMAL 80MM RECEIPT */}
              {receiptModalFormat === "thermal" && (
                <div className="print-thermal print-receipt bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-700 font-mono text-[11px] leading-relaxed shadow-inner">
                  <div className="text-center space-y-1">
                    <h3 className={`text-sm font-black uppercase tracking-wider ${isReturnReceipt ? "text-rose-800" : "text-slate-800"}`}>
                      {isReturnReceipt ? "★ SALES RETURN & REFUND VOUCHER ★" : "PHARMACARE ERP"}
                    </h3>
                    <p className="text-[9px] text-slate-500">{receiptInvoice.branch || currentBranch.name}</p>
                    <p className="text-[8px] text-slate-400">Date: {new Date(receiptInvoice.date).toLocaleString()}</p>
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-3"></div>

                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between font-bold">
                      <span>{isReturnReceipt ? "Return Voucher #:" : "Invoice No:"}</span>
                      <span className={`font-black ${isReturnReceipt ? "text-rose-900 font-mono text-xs" : "text-slate-800"}`}>{receiptInvoice.invoiceNo}</span>
                    </div>
                    {receiptInvoice.originalInvoiceNo && (
                      <div className="flex justify-between text-rose-700 font-bold">
                        <span>Original Invoice Ref:</span>
                        <span>#{receiptInvoice.originalInvoiceNo}</span>
                      </div>
                    )}
                    {receiptInvoice.returnReason && (
                      <div className="flex justify-between text-slate-600">
                        <span>Reason:</span>
                        <span>{receiptInvoice.returnReason}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span className="font-bold text-slate-800">{receiptInvoice.customerName}</span>
                    </div>
                    {receiptInvoice.customerContact && receiptInvoice.customerContact !== "N/A" && (
                      <div className="flex justify-between">
                        <span>Cell:</span>
                        <span>{receiptInvoice.customerContact}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Staff In-Charge:</span>
                      <span>{receiptInvoice.cashier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transaction Type:</span>
                      <span className={`font-bold ${isReturnReceipt ? "text-rose-700" : ""}`}>{receiptInvoice.paymentMethod || (isReturnReceipt ? "Cash Refund" : "Cash")}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-3"></div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-12 font-bold text-slate-800">
                      <span className="col-span-6">Medicine</span>
                      <span className="col-span-2 text-center">{isReturnReceipt ? "Ret.Qty" : "Qty"}</span>
                      <span className="col-span-2 text-right">Rate</span>
                      <span className="col-span-2 text-right">Total</span>
                    </div>
                    {(receiptInvoice.items || []).map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 text-slate-600">
                        <span className="col-span-6 truncate font-semibold text-slate-700">{item.name}</span>
                        <span className="col-span-2 text-center font-bold">{item.qty || item.quantity || 1}</span>
                        <span className="col-span-2 text-right">{formatCurrency(item.price || item.sellingPrice || 0)}</span>
                        <span className="col-span-2 text-right font-semibold text-slate-700 font-mono">
                          {formatCurrency((item.qty || item.quantity || 1) * (item.price || item.sellingPrice || 0))}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-3"></div>

                  <div className="space-y-1.5 text-right font-mono">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(receiptInvoice.subtotal)}</span>
                    </div>
                    {receiptInvoice.discount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(receiptInvoice.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tax (VAT {taxRate * 100}%):</span>
                      <span>{formatCurrency(receiptInvoice.tax)}</span>
                    </div>
                    <div className={`flex justify-between text-xs font-black border-t border-dashed border-slate-300 pt-1.5 mt-1.5 ${
                      isReturnReceipt ? "text-rose-700 text-sm" : "text-slate-800"
                    }`}>
                      <span>{isReturnReceipt ? "Total Refund Paid:" : "Grand Total:"}</span>
                      <span>{formatCurrency(receiptInvoice.total)}</span>
                    </div>
                  </div>

                  <div className="text-center text-[8px] text-slate-500 mt-5 leading-tight space-y-1">
                    {isReturnReceipt ? (
                      <>
                        <div className="font-bold text-[9px] text-rose-700 bg-rose-50 border border-rose-200 py-1.5 px-2 rounded-lg">
                          ★ Present this Return Voucher at the Main Cash Counter to collect your cash refund of {formatCurrency(receiptInvoice.total)}.
                        </div>
                        <div className="text-[7.5px] text-slate-400 pt-1">Goods returned have been restocked into inventory &bull; Certified Returns</div>
                      </>
                    ) : (
                      <div>Thank you for choosing PharmaCare ERP!</div>
                    )}
                  </div>
                </div>
              )}

              {/* Format 2: STANDARD A4 FULL PAGE INVOICE */}
              {receiptModalFormat === "a4" && (
                <div className="print-a4 bg-white p-8 rounded-2xl border border-slate-200 text-slate-800 space-y-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-5 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-md ${isReturnReceipt ? "bg-rose-600" : "bg-emerald-600"}`}></span>
                        <h2 className="text-xl font-extrabold text-slate-900 font-heading">
                          {isReturnReceipt ? "Sales Return & Refund Voucher" : "PharmaCare ERP"}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">Retail Pharmacy & POS Solutions</p>
                      <p className="text-xs text-slate-600 font-bold mt-0.5">Branch: {receiptInvoice.branch || currentBranch.name}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                        {isReturnReceipt ? "Return Credit Note" : "Sales Tax Invoice"}
                      </div>
                      <div className="text-base font-black text-slate-900 font-mono mt-0.5">{receiptInvoice.invoiceNo}</div>
                      <div className="text-xs text-slate-500 mt-1">Date: {new Date(receiptInvoice.date).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Customer Details</div>
                      <div className="font-extrabold text-slate-900 text-sm mt-0.5">{receiptInvoice.customerName}</div>
                      <div className="text-slate-500 mt-0.5">Cell: {receiptInvoice.customerContact || "N/A"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {isReturnReceipt ? "Refund Information" : "Payment Information"}
                      </div>
                      {receiptInvoice.originalInvoiceNo && (
                        <div className="font-bold text-rose-700 mt-0.5">Orig. Invoice Ref: #{receiptInvoice.originalInvoiceNo}</div>
                      )}
                      <div className="font-bold text-slate-800 mt-0.5">Method: {receiptInvoice.paymentMethod || (isReturnReceipt ? "Cash Refund" : "Cash")}</div>
                      <div className="text-slate-500 mt-0.5">Processed By: {receiptInvoice.cashier}</div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">{isReturnReceipt ? "Returned Medicine Description" : "Medicine Item"}</th>
                          <th className="py-2.5 px-3 text-center">{isReturnReceipt ? "Qty Returned" : "Quantity"}</th>
                          <th className="py-2.5 px-3 text-right">Unit Rate</th>
                          <th className="py-2.5 px-3 text-right">Tax</th>
                          <th className="py-2.5 px-3 text-right">{isReturnReceipt ? "Refund Total" : "Line Total"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(receiptInvoice.items || []).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">{item.qty || item.quantity || 1}</td>
                            <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(item.price || item.sellingPrice || 0)}</td>
                            <td className="py-2.5 px-3 text-right text-slate-500">{formatCurrency(item.tax || 0)}</td>
                            <td className={`py-2.5 px-3 text-right font-black ${isReturnReceipt ? "text-rose-700" : "text-slate-900"}`}>
                              {formatCurrency((item.qty || item.quantity || 1) * (item.price || item.sellingPrice || 0))}
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
                        <span className="font-semibold">{formatCurrency(receiptInvoice.subtotal)}</span>
                      </div>
                      {receiptInvoice.discount > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>Discount:</span>
                          <span>-{formatCurrency(receiptInvoice.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>Tax (VAT {taxRate * 100}%):</span>
                        <span>{formatCurrency(receiptInvoice.tax)}</span>
                      </div>
                      <div className={`flex justify-between text-sm font-black border-t border-slate-300 pt-2 mt-2 ${
                        isReturnReceipt ? "text-rose-700 text-base" : "text-slate-900"
                      }`}>
                        <span>{isReturnReceipt ? "Total Refund Issued:" : "Grand Total:"}</span>
                        <span>{formatCurrency(receiptInvoice.total)}</span>
                      </div>
                    </div>
                  </div>

                  {isReturnReceipt && (
                    <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-center justify-between text-xs text-rose-800 font-semibold">
                      <span className="font-black text-rose-900">★ Counter Refund Notice:</span>
                      <span>Please present this Return Voucher at the Main Cash Counter to collect your refund amount of <strong>{formatCurrency(receiptInvoice.total)}</strong>.</span>
                    </div>
                  )}

                  <div className="pt-6 border-t border-dashed border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                    <span>{isReturnReceipt ? "Sales Return Verified. Stock restocked into inventory." : "Thank you for your visit!"}</span>
                    <span>PharmaCare Systems &bull; Certified POS</span>
                  </div>
                </div>
              )}

              {/* Print Action Controls */}
              <div className="flex justify-end gap-3 no-print">
                <button
                  onClick={() => setReceiptInvoice(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handlePrintReceipt}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs text-white ${
                    isReturnReceipt ? "bg-rose-700 hover:bg-rose-800 shadow-rose-700/20" : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  <IoPrintOutline className="w-4 h-4" />
                  <span>Print {isReturnReceipt ? "Return Voucher" : "Receipt"} ({receiptModalFormat === "a4" ? "A4" : "Thermal"})</span>
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* --- STOCK LOOKUP MODAL (F6) --- */}
      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title="Stock & Inventory Lookup (F6 Key)"
        size="xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <IoSearchOutline className="absolute left-3.5 top-3 text-slate-400 w-5 h-5" />
            <input
              ref={stockSearchInputRef}
              autoFocus
              type="text"
              placeholder="Search stock by name, generic description, barcode, or shelf coordinate..."
              value={stockSearch}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setStockSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl text-xs outline-none transition-all font-semibold"
            />
          </div>

          <div className="overflow-x-auto max-h-[400px] border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider bg-slate-50 sticky top-0 z-10">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Group</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Shelf</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-center">Available Stock</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                {medicines
                  .filter((med) => {
                    const q = stockSearch.toLowerCase();
                    return (
                      med.name.toLowerCase().includes(q) ||
                      med.genericName.toLowerCase().includes(q) ||
                      med.brand.toLowerCase().includes(q) ||
                      (med.shelf && med.shelf.toLowerCase().includes(q)) ||
                      med.id.toLowerCase().includes(q)
                    );
                  })
                  .map((med) => {
                    const avail = getMedAvailableQty(med);
                    return (
                      <tr
                        key={med.id}
                        onClick={() => {
                          if (avail > 0) {
                            addToCart(med, avail, (err) => addToast(err, "warning"));
                            setLastAddedMedId(med.id);
                            addToast(`"${med.name}" added to sale cart`, "success");
                            setShowStockModal(false);
                          } else {
                            addToast(`"${med.name}" is currently Out of Stock!`, "warning");
                          }
                        }}
                        className={`transition-all cursor-pointer group ${
                          avail === 0
                            ? "opacity-60 bg-slate-50/50 cursor-not-allowed"
                            : "hover:bg-emerald-50/80 active:scale-[0.995]"
                        }`}
                      >
                        <td className="py-2.5 px-4 font-mono text-slate-400 text-[10px]">{med.id}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800 text-xs group-hover:text-emerald-700 transition-colors">{med.name}</div>
                          <div className="text-[9px] text-slate-450 font-normal">{med.genericName} &bull; {med.brand}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[10px] text-slate-500">{med.productGroup || "General"}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-fuchsia-50 text-fuchsia-700">
                            {med.category || "Tablet"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700">
                            {med.shelf || "Shelf A-1"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-800">
                          {formatCurrency(med.sellingPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                              avail === 0
                                ? "bg-rose-50 text-rose-600 border border-rose-100"
                                : avail < 15
                                ? "bg-amber-50 text-amber-600 border border-amber-100"
                                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            }`}
                          >
                            {avail} units
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (avail > 0) {
                                addToCart(med, avail, (err) => addToast(err, "warning"));
                                setLastAddedMedId(med.id);
                                addToast(`"${med.name}" added to sale cart`, "success");
                                setShowStockModal(false);
                              } else {
                                addToast(`"${med.name}" is currently Out of Stock!`, "warning");
                              }
                            }}
                            disabled={avail === 0}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              avail === 0
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            }`}
                          >
                            Add To Sale
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowStockModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Close Lookup
            </button>
          </div>
        </div>
      </Modal>
 
      {/* --- CUSTOMER LOOKUP MODAL (F2) --- */}
      <Modal
        isOpen={showCustomerLookupModal}
        onClose={() => setShowCustomerLookupModal(false)}
        title="Customer Directory & Selection (F2 Key)"
        size="xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <IoSearchOutline className="absolute left-3.5 top-3 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search customer by name, contact, ID..."
              value={customerLookupSearch}
              onChange={(e) => setCustomerLookupSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-xs outline-none transition-all font-semibold"
            />
          </div>
 
          <div className="overflow-x-auto max-h-[400px] border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider bg-slate-50 sticky top-0 z-10">
                  <th className="py-2.5 px-4">ID</th>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3 text-right">Ledger Balance (Due)</th>
                  <th className="py-2.5 px-3 text-center">Loyalty Points</th>
                  <th className="py-2.5 px-3 text-center">Remaining Rx Quota</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                {customers
                  .filter((c) => {
                    const q = customerLookupSearch.toLowerCase();
                    return (
                      c.name.toLowerCase().includes(q) ||
                      c.contact.toLowerCase().includes(q) ||
                      c.id.toLowerCase().includes(q)
                    );
                  })
                  .map((c) => {
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-mono text-slate-400 text-[10px]">{c.id}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 text-xs">{c.name}</td>
                        <td className="py-2.5 px-3 text-[10px] font-bold text-slate-500">{c.contact}</td>
                        <td className={`py-2.5 px-3 text-right font-extrabold ${c.balance > 0 ? "text-rose-600" : "text-slate-800"}`}>
                          {formatCurrency(c.balance)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-black">{c.loyaltyPoints} pts</td>
                        <td className="py-2.5 px-3 text-center text-indigo-600 font-black">{c.remainingQuota ?? 20} units</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setShowCustomerLookupModal(false);
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Select Customer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
 
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => {
                setShowCustomerLookupModal(false);
                setShowCustModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <IoPersonAddOutline className="w-3.5 h-3.5" />
              <span>Register New Customer</span>
            </button>
            <button
              onClick={() => setShowCustomerLookupModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Close Lookup
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
