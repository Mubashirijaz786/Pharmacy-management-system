import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { IoWarningOutline, IoTrashOutline, IoCloseOutline, IoAlertCircleOutline } from "react-icons/io5";

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action?",
  confirmText = "Yes, Proceed",
  cancelText = "Cancel",
  type = "danger" // danger, warning, info
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isDanger = type === "danger";
  const isWarning = type === "warning";

  const modalLayout = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      {/* Overlay click */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Dialog box */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-scale-up">
        {/* Top Accent bar */}
        <div
          className={`h-2 w-full ${
            isDanger ? "bg-rose-600" : isWarning ? "bg-amber-500" : "bg-blue-600"
          }`}
        />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <IoCloseOutline className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                isDanger
                  ? "bg-rose-100 text-rose-600 border border-rose-200"
                  : isWarning
                  ? "bg-amber-100 text-amber-600 border border-amber-200"
                  : "bg-blue-100 text-blue-600 border border-blue-200"
              }`}
            >
              {isDanger ? (
                <IoTrashOutline className="w-6 h-6" />
              ) : isWarning ? (
                <IoWarningOutline className="w-6 h-6" />
              ) : (
                <IoAlertCircleOutline className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1 pr-4">
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                {title}
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 ${
                isDanger
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/25"
                  : isWarning
                  ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/25"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25"
              }`}
            >
              {isDanger && <IoTrashOutline className="w-4 h-4" />}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalLayout, document.body);
};
