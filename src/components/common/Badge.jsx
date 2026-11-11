import React from "react";

export const Badge = ({ type = "default", children }) => {
  const styles = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    warning: "bg-amber-50 text-amber-700 border-amber-200/50",
    danger: "bg-rose-50 text-rose-700 border-rose-200/50",
    info: "bg-indigo-50 text-indigo-700 border-indigo-200/50",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        styles[type] || styles.default
      }`}
    >
      {children}
    </span>
  );
};
