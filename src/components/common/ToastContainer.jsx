import React, { useContext } from "react";
import { AppContext } from "../../context/AppContext";
import {
  IoCheckmarkCircle,
  IoWarning,
  IoAlertCircle,
  IoInformationCircle,
  IoClose
} from "react-icons/io5";

export const ToastContainer = () => {
  const { toasts, removeToast } = useContext(AppContext);

  const icons = {
    success: <IoCheckmarkCircle className="w-5 h-5 text-emerald-500" />,
    warning: <IoWarning className="w-5 h-5 text-amber-500" />,
    danger: <IoAlertCircle className="w-5 h-5 text-rose-500" />,
    info: <IoInformationCircle className="w-5 h-5 text-indigo-500" />,
  };

  const borderColors = {
    success: "border-emerald-100 bg-emerald-50/10",
    warning: "border-amber-100 bg-amber-50/10",
    danger: "border-rose-100 bg-rose-50/10",
    info: "border-indigo-100 bg-indigo-50/10",
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2.5 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start p-4 border rounded-xl shadow-lg bg-white animate-fade-in ${
            borderColors[toast.type] || "border-slate-100"
          }`}
        >
          <div className="flex-shrink-0 mr-3">{icons[toast.type] || icons.success}</div>
          <div className="flex-grow text-sm font-medium text-slate-700 mr-2 pt-0.5">
            {toast.message}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 p-0.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <IoClose className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
