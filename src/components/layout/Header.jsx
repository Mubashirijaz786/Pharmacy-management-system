import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import {
  IoMenu,
  IoNotificationsOutline,
  IoLocationOutline,
  IoChevronDown,
  IoCloudDoneOutline,
  IoCloudUploadOutline,
  IoCloudOfflineOutline,
  IoSyncOutline,
  IoCartOutline,
  IoSearchOutline,
  IoShieldCheckmarkOutline,
  IoQrCodeOutline
} from "react-icons/io5";

export const Header = ({ onMenuClick }) => {
  const {
    branches,
    currentBranch,
    setCurrentBranch,
    currentUser,
    changeRole,
    alerts,
    syncState,
    triggerManualSync,
    openScannerModal
  } = useContext(AppContext);

  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const handleBranchSelect = (branch) => {
    setCurrentBranch(branch);
    setShowBranchDropdown(false);
  };

  const handleRoleSelect = (roleName) => {
    changeRole(roleName);
    setShowRoleDropdown(false);
  };

  return (
    <header className="sticky top-0 bg-white/95 border-b border-slate-200/90 h-16 flex items-center justify-between px-4 sm:px-6 z-30 shadow-xs backdrop-blur-md">
      {/* Left Area: Mobile Menu & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 lg:hidden text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
        >
          <IoMenu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className="text-slate-400">Portal:</span>
            <span className="font-bold text-slate-800 font-heading text-sm">{currentBranch?.name || "Main Branch"}</span>
          </div>
        </div>
      </div>

      {/* Right Area: Actions, Cloud Sync & User Controls */}
      <div className="flex items-center gap-2.5">
        {/* Quick QR / Barcode Scanner Trigger Button */}
        <button
          onClick={openScannerModal}
          title="Scan Medicine QR / Barcode (Camera or USB Scanner)"
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
        >
          <IoQrCodeOutline className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Scan QR</span>
        </button>

        {/* Quick POS Sale Button */}
        <button
          onClick={() => navigate("/pos")}
          className="hidden md:flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <IoCartOutline className="w-4 h-4" />
          <span>New POS Sale</span>
        </button>

        {/* Cloud Sync Badge */}
        <button
          onClick={triggerManualSync}
          disabled={syncState?.isSyncing}
          title={
            syncState?.isOnline
              ? syncState?.pendingCount > 0
                ? `${syncState.pendingCount} pending offline changes. Click to sync now!`
                : "Cloud Synced with Supabase. Click to refresh."
              : "Working in Offline Mode. Data will upload when connected."
          }
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
            syncState?.isSyncing
              ? "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
              : !syncState?.isOnline
              ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
              : syncState?.pendingCount > 0
              ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80"
          }`}
        >
          {syncState?.isSyncing ? (
            <>
              <IoSyncOutline className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span className="hidden sm:inline">Syncing...</span>
            </>
          ) : !syncState?.isOnline ? (
            <>
              <IoCloudOfflineOutline className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">
                Offline {syncState?.pendingCount > 0 && `(${syncState.pendingCount})`}
              </span>
            </>
          ) : syncState?.pendingCount > 0 ? (
            <>
              <IoCloudUploadOutline className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Push ({syncState.pendingCount})</span>
            </>
          ) : (
            <>
              <IoCloudDoneOutline className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Cloud Live</span>
            </>
          )}
        </button>

        {/* Branch Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowBranchDropdown(!showBranchDropdown);
              setShowRoleDropdown(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200/80"
          >
            <IoLocationOutline className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline max-w-[110px] truncate">{currentBranch?.name}</span>
            <IoChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showBranchDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-50 animate-slide-up">
              <div className="px-3.5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Select Active Branch
              </div>
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => handleBranchSelect(branch)}
                  className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                    currentBranch.id === branch.id
                      ? "text-emerald-700 font-bold bg-emerald-50/50"
                      : "text-slate-700"
                  }`}
                >
                  <div className="truncate">
                    <div className="font-semibold">{branch.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{branch.address}</div>
                  </div>
                  {currentBranch.id === branch.id && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => {
              setShowRoleDropdown(!showRoleDropdown);
              setShowBranchDropdown(false);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 font-bold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer border border-emerald-200/80"
          >
            <span>Role: {currentUser?.role}</span>
            <IoChevronDown className="w-3 h-3 text-emerald-600" />
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-50 animate-slide-up">
              <div className="px-3.5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Switch Role Simulation
              </div>
              {["Admin", "Cashier", "Pharmacist", "Manager"].map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                    currentUser?.role === role ? "text-emerald-700 font-bold bg-emerald-50" : "text-slate-700"
                  }`}
                >
                  <span>{role}</span>
                  {currentUser?.role === role && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
