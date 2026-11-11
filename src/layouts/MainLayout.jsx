import React, { useState, useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { ToastContainer } from "../components/common/ToastContainer";
import { BarcodeScannerModal } from "../components/common/BarcodeScannerModal";
import { AppContext } from "../context/AppContext";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { IoLockClosedOutline } from "react-icons/io5";

export const MainLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { currentUser, changeRole, isScannerModalOpen, closeScannerModal, handleGlobalScan } = useContext(AppContext);
  const location = useLocation();

  // Global Hardware USB / Wireless Barcode & QR Scanner Listener
  useBarcodeScanner(handleGlobalScan);

  // Define route permission mappings
  const routePermissions = {
    "/": ["Admin", "Manager"],
    "/pos": ["Admin", "Cashier", "Manager", "Pharmacist"],
    "/medicines": ["Admin", "Pharmacist", "Manager"],
    "/inventory": ["Admin", "Manager", "Pharmacist"],
    "/suppliers": ["Admin", "Manager"],
    "/customers": ["Admin", "Cashier", "Manager"],
    "/prescriptions": ["Admin", "Pharmacist", "Cashier"],
    "/purchases": ["Admin", "Manager"],
    "/reports": ["Admin", "Manager"],
    "/returns": ["Admin", "Cashier"],
    "/settings": ["Admin"]
  };

  const currentPath = location.pathname;
  const allowedRoles = routePermissions[currentPath] || [];
  const isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(currentUser?.role || "Admin");

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 overflow-hidden select-none">
      {/* Sidebar */}
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 bg-slate-50/70 overflow-y-auto">
        {/* Header */}
        <Header onMenuClick={() => setIsMobileOpen(true)} />

        {/* Dynamic Content Body */}
        <main className="flex-1 p-4 sm:p-6 flex flex-col">
          {isAuthorized ? (
            <div className="animate-fade-in flex flex-col flex-1 w-full max-w-7xl mx-auto">
              <Outlet />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-xs max-w-md mx-auto my-12 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-4">
                <IoLockClosedOutline className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
              <p className="text-xs text-slate-500 mt-1.5">
                Your role <strong className="text-slate-800">{currentUser?.role}</strong> does not have access to this page.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {allowedRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => changeRole(role)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Switch to {role}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Global Toast Alerts */}
      <ToastContainer />

      {/* Global Camera / Barcode / QR Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerModalOpen}
        onClose={closeScannerModal}
        onScan={handleGlobalScan}
      />
    </div>
  );
};
