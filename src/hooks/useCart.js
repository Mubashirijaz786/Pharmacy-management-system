import { useState, useCallback } from "react";

export const useCart = () => {
  const [cart, setCart] = useState([]);

  const addToCart = useCallback((medicine, availableQty, onError, isReturn = false, branchId = null) => {
    // Determine active FIFO batch for the branch (earliest expiring with remaining stock)
    const branchBatches = (medicine.batches || [])
      .filter((b) => (!b.branchId || !branchId || b.branchId === branchId) && Number(b.qty ?? b.quantity ?? 0) > 0)
      .sort((a, b) => new Date(a.expiryDate || "9999-12-31") - new Date(b.expiryDate || "9999-12-31"));

    const activeBatch = branchBatches[0] || null;
    const medPrice = parseFloat(medicine.sellingPrice) || 0;
    const batchPrice = activeBatch?.sellingPrice ? parseFloat(activeBatch.sellingPrice) : 0;
    // Primary authority is medicine.sellingPrice; fallback to activeBatch.sellingPrice
    const latestSellingPrice = medPrice > 0 ? medPrice : (batchPrice > 0 ? batchPrice : 0);

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === medicine.id);

      if (existing) {
        const newQty = existing.quantity + 1;
        const cf = medicine.conversionFactor || 10;
        const totalUnitsNeeded = existing.saleType === "Pack" ? newQty * cf : newQty;
        if (!isReturn && totalUnitsNeeded > availableQty) {
          if (onError) {
            const maxPacks = Math.floor(availableQty / cf);
            onError(
              existing.saleType === "Pack"
                ? `Only ${maxPacks} packs (${availableQty} units) available in stock at this branch.`
                : `Only ${availableQty} units available in stock at this branch.`
            );
          }
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === medicine.id ? { ...item, quantity: newQty } : item
        );
      } else {
        if (!isReturn && availableQty <= 0) {
          if (onError) {
            onError(`"${medicine.name}" is currently Out of Stock at this branch!`);
          }
          return prevCart;
        }
        const cf = medicine.conversionFactor || 10;
        const initialNeeded = cf;
        if (!isReturn && initialNeeded > availableQty && availableQty > 0) {
          return [
            ...prevCart,
            {
              ...medicine,
              quantity: 1,
              saleType: "Tablet",
              batchNumber: activeBatch ? activeBatch.batchNumber : (medicine.batchNumber || "BAT-DEF"),
              expiryDate: activeBatch ? activeBatch.expiryDate : medicine.expiryDate,
              sellingPrice: latestSellingPrice || 0,
              availableBatches: branchBatches
            }
          ];
        }

        return [
          ...prevCart,
          {
            ...medicine,
            quantity: 1,
            saleType: "Pack",
            batchNumber: activeBatch ? activeBatch.batchNumber : (medicine.batchNumber || "BAT-DEF"),
            expiryDate: activeBatch ? activeBatch.expiryDate : medicine.expiryDate,
            sellingPrice: latestSellingPrice || 0,
            availableBatches: branchBatches
          }
        ];
      }
    });
  }, []);

  const removeFromCart = useCallback((medicineId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== medicineId));
  }, []);

  const updateQuantity = useCallback((medicineId, qty, availableQty, onError, isReturn = false) => {
    if (qty <= 0) {
      removeFromCart(medicineId);
      return;
    }
    setCart((prevCart) => {
      const item = prevCart.find((i) => i.id === medicineId);
      if (!item) return prevCart;

      // Strict enforcement for return items from previous invoices
      let finalQty = qty;
      if (item.maxReturnableQty !== undefined && finalQty > item.maxReturnableQty) {
        finalQty = item.maxReturnableQty;
        if (onError) {
          onError(`Maximum returnable limit is ${item.maxReturnableQty} units for "${item.name}".`);
        }
      }

      const cf = item.conversionFactor || 10;
      const totalUnitsNeeded = item.saleType === "Pack" ? finalQty * cf : finalQty;
      if (!isReturn && totalUnitsNeeded > availableQty) {
        if (onError) {
          const maxPacks = Math.floor(availableQty / cf);
          onError(
            item.saleType === "Pack"
              ? `Only ${maxPacks} packs (${availableQty} units) available in stock at this branch.`
              : `Only ${availableQty} units available in stock at this branch.`
          );
        }
        return prevCart;
      }
      return prevCart.map((i) =>
        i.id === medicineId ? { ...i, quantity: finalQty } : i
      );
    });
  }, [removeFromCart]);

  const updateSaleType = useCallback((medicineId, saleType, availableQty, isReturn = false) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id !== medicineId) return item;
        const cf = item.conversionFactor || 10;
        let newQty = item.quantity;
        const totalUnitsNeeded = saleType === "Pack" ? newQty * cf : newQty;
        if (!isReturn && totalUnitsNeeded > availableQty) {
          newQty = Math.floor(availableQty / cf);
          if (newQty <= 0) {
            newQty = 1;
            saleType = "Tablet";
          }
        }
        return { ...item, saleType, quantity: newQty };
      })
    );
  }, []);

  const updateCustomPrice = useCallback((medicineId, customPrice) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === medicineId
          ? {
              ...item,
              sellingPrice: parseFloat(customPrice) || 0,
              customPrice: parseFloat(customPrice) || 0
            }
          : item
      )
    );
  }, []);

  const updateBatch = useCallback((medicineId, batchNumber, batchesList = []) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id !== medicineId) return item;
        const selectedB = (batchesList.length > 0 ? batchesList : (item.availableBatches || [])).find(
          (b) => b.batchNumber === batchNumber
        );
        return {
          ...item,
          batchNumber,
          expiryDate: selectedB ? selectedB.expiryDate : item.expiryDate,
          sellingPrice: item.customPrice !== undefined 
            ? item.customPrice 
            : (parseFloat(item.sellingPrice) || (selectedB && selectedB.sellingPrice ? parseFloat(selectedB.sellingPrice) : 0))
        };
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return {
    cart,
    setCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateSaleType,
    updateCustomPrice,
    updateBatch,
    clearCart
  };
};
