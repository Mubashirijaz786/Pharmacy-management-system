import React from "react";
import {
  IoPrintOutline,
  IoDocumentTextOutline,
  IoDownloadOutline
} from "react-icons/io5";

/**
 * Universal 3-Option Print & Export Action Cluster
 * Provides:
 * 1. Direct Print (Physical / Browser print dialog)
 * 2. PDF (High-resolution printable / downloadable PDF document)
 * 3. Excel Export (.xls workbook with formatted headers and data)
 */
export const PrintExportActions = ({
  onDirectPrint,
  onPdf,
  onExcel,
  printLabel = "Direct Print",
  pdfLabel = "PDF",
  excelLabel = "Excel Export",
  size = "sm", // "xs" | "sm" | "md"
  className = "",
  disabled = false
}) => {
  const sizeClasses = {
    xs: "px-2 py-1 text-[11px] gap-1",
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-3.5 py-2 text-xs sm:text-sm gap-2"
  }[size] || "px-2.5 py-1.5 text-xs gap-1.5";

  const iconSizes = {
    xs: "w-3.5 h-3.5",
    sm: "w-4 h-4",
    md: "w-4.5 h-4.5"
  }[size] || "w-4 h-4";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 no-print ${className}`}>
      {/* 1. Direct Print Button */}
      {onDirectPrint && (
        <button
          type="button"
          onClick={onDirectPrint}
          disabled={disabled}
          title="Direct Print: Send to printer"
          className={`flex items-center ${sizeClasses} bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-md border border-slate-900 transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <IoPrintOutline className={`${iconSizes} text-slate-200`} />
          <span>{printLabel}</span>
        </button>
      )}

      {/* 2. PDF Button */}
      {onPdf && (
        <button
          type="button"
          onClick={onPdf}
          disabled={disabled}
          title="PDF: Generate and save PDF document"
          className={`flex items-center ${sizeClasses} bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-md border border-rose-800 transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <IoDocumentTextOutline className={`${iconSizes} text-rose-200`} />
          <span>{pdfLabel}</span>
        </button>
      )}

      {/* 3. Excel Export Button */}
      {onExcel && (
        <button
          type="button"
          onClick={onExcel}
          disabled={disabled}
          title="Excel Export: Download .xls spreadsheet"
          className={`flex items-center ${sizeClasses} bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md border border-emerald-800 transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <IoDownloadOutline className={`${iconSizes} text-emerald-200`} />
          <span>{excelLabel}</span>
        </button>
      )}
    </div>
  );
};

export default PrintExportActions;
