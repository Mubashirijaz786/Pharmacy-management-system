import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import {
  IoGridOutline,
  IoCartOutline,
  IoMedicalOutline,
  IoCubeOutline,
  IoBusinessOutline,
  IoPeopleOutline,
  IoReceiptOutline,
  IoClipboardOutline,
  IoBarChartOutline,
  IoSettingsOutline,
  IoReturnUpBackOutline,
  IoDocumentTextOutline,
  IoShieldCheckmarkOutline,
  IoCloudDoneOutline,
  IoLogOutOutline
} from "react-icons/io5";

export const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const { currentUser, currentBranch, isOffline } = useContext(AppContext);
  const location = useLocation();

  const navSections = [
    {
      title: "Core Hub",
      items: [
        { path: "/", label: "Dashboard", icon: <IoGridOutline className="w-4 h-4" />, roles: ["Admin", "Manager"] },
        { path: "/pos", label: "POS Billing", icon: <IoCartOutline className="w-4 h-4" />, roles: ["Admin", "Cashier", "Manager", "Pharmacist"], highlight: true },
        { path: "/invoices", label: "Sales Invoices", icon: <IoDocumentTextOutline className="w-4 h-4" />, roles: ["Admin", "Cashier", "Manager"] },
        { path: "/returns", label: "Sales Returns", icon: <IoReturnUpBackOutline className="w-4 h-4" />, roles: ["Admin", "Cashier"] }
      ]
    },
    {
      title: "Inventory & Catalog",
      items: [
        { path: "/medicines", label: "Medicines Catalog", icon: <IoMedicalOutline className="w-4 h-4" />, roles: ["Admin", "Pharmacist", "Manager"] },
        { path: "/inventory", label: "Batch & Stock", icon: <IoCubeOutline className="w-4 h-4" />, roles: ["Admin", "Manager", "Pharmacist"] },
        { path: "/prescriptions", label: "Prescriptions", icon: <IoReceiptOutline className="w-4 h-4" />, roles: ["Admin", "Pharmacist", "Cashier"] }
      ]
    },
    {
      title: "Accounts & Relations",
      items: [
        { path: "/customers", label: "Customers & Ledgers", icon: <IoPeopleOutline className="w-4 h-4" />, roles: ["Admin", "Cashier", "Manager"] },
        { path: "/suppliers", label: "Suppliers & Orders", icon: <IoBusinessOutline className="w-4 h-4" />, roles: ["Admin", "Manager"] },
        { path: "/purchases", label: "Purchase POs", icon: <IoClipboardOutline className="w-4 h-4" />, roles: ["Admin", "Manager"] }
      ]
    },
    {
      title: "Administration",
      items: [
        { path: "/reports", label: "Reports & Profit", icon: <IoBarChartOutline className="w-4 h-4" />, roles: ["Admin", "Manager"] },
        { path: "/settings", label: "System Settings", icon: <IoSettingsOutline className="w-4 h-4" />, roles: ["Admin"] }
      ]
    }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLinkClick = () => {
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/90 w-64 shadow-xs select-none">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform duration-200">
            <IoShieldCheckmarkOutline className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-base tracking-tight font-heading">PharmaCare</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">ERP</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Enterprise Portal</p>
          </div>
        </Link>
      </div>

      {/* Branch & Sync Pill */}
      <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-semibold truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="truncate">{currentBranch?.name || "Main Branch"}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <IoCloudDoneOutline className="w-3.5 h-3.5 text-emerald-600" />
          <span>Cloud Live</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-grow px-3 py-3 overflow-y-auto space-y-4 scrollbar-thin">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) =>
            item.roles.includes(currentUser?.role || "Admin")
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={handleLinkClick}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                        active
                          ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 font-bold"
                          : item.highlight
                          ? "text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80 font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`${active ? "text-white" : item.highlight ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-700"}`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.highlight && !active && (
                        <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold uppercase">POS</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
              {currentUser?.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">{currentUser?.name || "Logged User"}</div>
              <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                {currentUser?.role || "Staff"}
              </span>
            </div>
          </div>
          <Link
            to="/login"
            title="Switch User / Logout"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <IoLogOutOutline className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block h-screen sticky top-0 z-30 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 animate-slide-up">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
